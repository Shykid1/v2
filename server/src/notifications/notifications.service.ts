import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface SendNotification {
  channel: NotificationChannel;
  template: string;
  recipient: string;
  body: string;
  jobId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Channel router over Arkesel. WhatsApp is the primary channel; if a WhatsApp send
 * fails we fall back to SMS so delivery stays > 99% (NT-01/02). Every attempt is
 * persisted as a Notification row. Failures are non-fatal — a messaging outage must
 * never break a write that already succeeded.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly smsUrl: string;
  private readonly whatsappUrl: string;

  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.apiKey = config.get<string>('ARKESEL_API_KEY', '');
    this.senderId = config.get<string>('ARKESEL_SENDER_ID', 'SaniChain');
    this.smsUrl = config.get<string>('ARKESEL_SMS_URL', '');
    this.whatsappUrl = config.get<string>('ARKESEL_WHATSAPP_URL', '');
  }

  async send(input: SendNotification): Promise<void> {
    if (input.channel === NotificationChannel.whatsapp) {
      const ok = await this.deliver('whatsapp', input);
      if (!ok) {
        // Fall back to SMS on WhatsApp failure.
        await this.deliver('sms', {
          ...input,
          channel: NotificationChannel.sms,
        });
      }
      return;
    }
    await this.deliver(input.channel, input);
  }

  /** Convenience: send WhatsApp with automatic SMS fallback. */
  async notify(
    recipient: string,
    template: string,
    body: string,
    jobId?: string,
  ): Promise<void> {
    await this.send({
      channel: NotificationChannel.whatsapp,
      template,
      recipient,
      body,
      jobId,
    });
  }

  private async deliver(
    channel: NotificationChannel,
    input: SendNotification,
  ): Promise<boolean> {
    const recipient = this.normalize(input.recipient);
    const record = await this.prisma.notification.create({
      data: {
        channel,
        template: input.template,
        recipient,
        body: input.body,
        jobId: input.jobId,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      },
    });

    if (!recipient || !this.apiKey) {
      await this.prisma.notification.update({
        where: { id: record.id },
        data: {
          status: 'failed',
          error: 'missing recipient or ARKESEL_API_KEY',
        },
      });
      this.logger.warn(
        `Skipped ${channel} to "${recipient}" (template ${input.template}) — not configured`,
      );
      return false;
    }

    try {
      if (channel === NotificationChannel.whatsapp) {
        await axios.post(
          this.whatsappUrl,
          {
            sender: this.senderId,
            recipient,
            message: { type: 'text', text: input.body },
          },
          { headers: { 'api-key': this.apiKey }, timeout: 8000 },
        );
      } else {
        await axios.post(
          this.smsUrl,
          {
            sender: this.senderId,
            message: input.body,
            recipients: [recipient],
          },
          { headers: { 'api-key': this.apiKey }, timeout: 8000 },
        );
      }
      await this.prisma.notification.update({
        where: { id: record.id },
        data: { status: 'sent' },
      });
      return true;
    } catch (err) {
      await this.prisma.notification.update({
        where: { id: record.id },
        data: { status: 'failed', error: this.errMessage(err) },
      });
      this.logger.warn(`Arkesel ${channel} failed: ${this.errMessage(err)}`);
      return false;
    }
  }

  /** Arkesel expects MSISDNs in international form without a leading "+" (e.g. 233244...). */
  private normalize(phone: string): string {
    const trimmed = (phone ?? '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('+')) return trimmed.slice(1);
    if (trimmed.startsWith('0')) return `233${trimmed.slice(1)}`;
    return trimmed;
  }

  private errMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
      return `${err.response?.status ?? ''} ${JSON.stringify(err.response?.data ?? err.message)}`;
    }
    return (err as Error).message;
  }
}
