import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  PaymentMethod,
  PitSize,
  TriggerSource,
} from '@prisma/client';
import { JobsService } from '../jobs/jobs.service';
import { PricingService } from '../pricing/pricing.service';
import { LocationService } from '../location/location.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  UssdOption,
  UssdSession,
  UssdSessionStore,
} from './ussd-session.store';

interface UssdResult {
  message: string;
  continueSession: boolean;
}

const TIPS =
  'Sanitation tips:\n- Wash hands with soap after toilet use.\n- Keep the latrine covered.\n- Desludge before the pit overflows in the rains.\n- Report a full pit early via option 1.';

const SIZE_OPTIONS: UssdOption[] = [
  { id: PitSize.standard, label: 'Standard household pit' },
  { id: PitSize.large_shared, label: 'Large / shared pit' },
];

const PAY_OPTIONS: UssdOption[] = [
  { id: PaymentMethod.cash, label: 'Cash on completion' },
  { id: PaymentMethod.paystack, label: 'Mobile Money' },
];

const YES_NO: UssdOption[] = [
  { id: 'yes', label: 'Confirm' },
  { id: 'no', label: 'Cancel' },
];

/**
 * Menu-driven USSD engine (Arkesel). Community members without a sensor self-report a
 * full/broken latrine, supply a GhanaPost GPS address, choose cash or Mobile Money, and
 * a guest Job is created with an SMS confirmation. Multilingual menus can be layered on
 * the same step machine (US-02).
 */
@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly pricing: PricingService,
    private readonly location: LocationService,
    private readonly notifications: NotificationsService,
    private readonly store: UssdSessionStore,
  ) {}

  async handle(
    sessionId: string,
    msisdn: string,
    userData: string,
    newSession: boolean,
  ): Promise<UssdResult> {
    try {
      const existing = newSession ? undefined : this.store.get(sessionId);
      if (!existing) return this.start(sessionId);
      return await this.advance(
        sessionId,
        msisdn,
        existing,
        (userData ?? '').trim(),
      );
    } catch (err) {
      this.logger.error(`USSD error for ${msisdn}: ${(err as Error).message}`);
      this.store.clear(sessionId);
      return {
        message: 'Sorry, something went wrong. Please dial again.',
        continueSession: false,
      };
    }
  }

  private start(sessionId: string): UssdResult {
    const options: UssdOption[] = [
      { id: 'desludge', label: 'Request desludging' },
      { id: 'report', label: 'Report a broken latrine' },
      { id: 'tips', label: 'Sanitation tips' },
    ];
    this.store.set(sessionId, { step: 'root', options, data: {} });
    return { message: this.menu('SaniChain', options), continueSession: true };
  }

  private async advance(
    sessionId: string,
    msisdn: string,
    session: UssdSession,
    input: string,
  ): Promise<UssdResult> {
    switch (session.step) {
      case 'root': {
        const choice = this.pick(session.options, input);
        if (!choice) return this.invalid(session);
        if (choice.id === 'tips') return this.end(sessionId, TIPS);
        session.data.intent = choice.id;
        this.store.set(sessionId, {
          ...session,
          step: 'size',
          options: SIZE_OPTIONS,
        });
        return {
          message: this.menu('Pit size', SIZE_OPTIONS),
          continueSession: true,
        };
      }

      case 'size': {
        const choice = this.pick(session.options, input);
        if (!choice) return this.invalid(session);
        session.data.sizeClass = choice.id;
        this.store.set(sessionId, { ...session, step: 'address', options: [] });
        return {
          message: 'Enter your GhanaPost GPS address (e.g. NM-0123-4567):',
          continueSession: true,
        };
      }

      case 'address': {
        if (!this.location.isValidFormat(input)) {
          return {
            message:
              'Invalid format. Enter your GhanaPost GPS address like NM-0123-4567:',
            continueSession: true,
          };
        }
        session.data.ghanaPostAddress = input.toUpperCase();
        this.store.set(sessionId, {
          ...session,
          step: 'pay',
          options: PAY_OPTIONS,
        });
        return {
          message: this.menu('Payment method', PAY_OPTIONS),
          continueSession: true,
        };
      }

      case 'pay': {
        const choice = this.pick(session.options, input);
        if (!choice) return this.invalid(session);
        session.data.paymentMethod = choice.id;
        const quote = await this.pricing.quote(
          session.data.sizeClass as PitSize,
          'near',
        );
        session.data.price = String(quote.total);
        this.store.set(sessionId, {
          ...session,
          step: 'confirm',
          options: YES_NO,
        });
        return {
          message: `Desludging request\nSize: ${session.data.sizeClass}\nPrice: GHS ${quote.total}\nPay: ${choice.label}\n1. Confirm\n2. Cancel`,
          continueSession: true,
        };
      }

      case 'confirm': {
        const choice = this.pick(session.options, input);
        if (choice?.id !== 'yes')
          return this.end(sessionId, 'Request cancelled.');
        return this.submit(sessionId, msisdn, session);
      }
    }
    return this.invalid(session);
  }

  private async submit(
    sessionId: string,
    msisdn: string,
    session: UssdSession,
  ): Promise<UssdResult> {
    const method = session.data.paymentMethod as PaymentMethod;
    const triggerSource =
      session.data.intent === 'report'
        ? TriggerSource.ussd_report
        : TriggerSource.ussd_report;

    const job = await this.jobs.createGuestRequest(
      {
        phone: msisdn,
        ghanaPostAddress: session.data.ghanaPostAddress,
        sizeClass: session.data.sizeClass as PitSize,
        zone: 'near',
        paymentMethod: method,
      },
      triggerSource,
    );

    const tail =
      method === PaymentMethod.paystack
        ? ' You will receive an SMS with a Mobile Money payment link.'
        : ' Pay cash to the provider on completion.';

    await this.notifications.send({
      channel: NotificationChannel.sms,
      template: 'ussd_request_ack',
      recipient: msisdn,
      body: `SaniChain: request received (ref ${job.id}). Price GHS ${session.data.price}.${tail}`,
      jobId: job.id,
    });

    return this.end(
      sessionId,
      `Request received. Ref: ${job.id}. Price GHS ${session.data.price}.${tail}`,
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private menu(title: string, options: UssdOption[]): string {
    return `${title}\n${options.map((o, i) => `${i + 1}. ${o.label}`).join('\n')}`;
  }

  private pick(options: UssdOption[], input: string): UssdOption | null {
    const idx = Number.parseInt(input, 10);
    if (Number.isNaN(idx) || idx < 1 || idx > options.length) return null;
    return options[idx - 1];
  }

  private invalid(session: UssdSession): UssdResult {
    return {
      message: this.menu('Invalid choice. Try again', session.options),
      continueSession: true,
    };
  }

  private end(sessionId: string, message: string): UssdResult {
    this.store.clear(sessionId);
    return { message, continueSession: false };
  }
}
