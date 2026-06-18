import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import axios, { AxiosInstance } from 'axios';

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

/**
 * Thin Paystack REST wrapper. When PAYSTACK_SECRET_KEY is unset (local/dev), it runs in
 * MOCK mode: it returns deterministic stub references so the full job→payment flow can be
 * exercised end-to-end without network or real keys. Swap in a real test key to go live.
 */
@Injectable()
export class PaystackClient {
  private readonly logger = new Logger(PaystackClient.name);
  private readonly http: AxiosInstance;
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  readonly mock: boolean;

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('PAYSTACK_SECRET_KEY', '');
    this.webhookSecret =
      config.get<string>('PAYSTACK_WEBHOOK_SECRET', '') || this.secretKey;
    this.mock = !this.secretKey;
    this.http = axios.create({
      baseURL: config.get<string>(
        'PAYSTACK_BASE_URL',
        'https://api.paystack.co',
      ),
      headers: { Authorization: `Bearer ${this.secretKey}` },
      timeout: 12000,
    });
    if (this.mock) {
      this.logger.warn(
        'PAYSTACK_SECRET_KEY not set — Paystack running in MOCK mode',
      );
    }
  }

  /** Pesewas: Paystack amounts are in the minor unit. */
  static toMinor(amount: number): number {
    return Math.round(amount * 100);
  }

  async createSubaccount(input: {
    businessName: string;
    settlementBank: string;
    accountNumber: string;
    percentageCharge: number;
  }): Promise<string> {
    if (this.mock) {
      return `ACCT_mock_${Math.random().toString(36).slice(2, 12)}`;
    }
    const { data } = await this.http.post<
      PaystackEnvelope<{ subaccount_code: string }>
    >('/subaccount', {
      business_name: input.businessName,
      settlement_bank: input.settlementBank,
      account_number: input.accountNumber,
      percentage_charge: input.percentageCharge,
    });
    return data.data.subaccount_code;
  }

  async initializeTransaction(input: {
    email: string;
    amount: number; // major unit (GHS)
    reference: string;
    subaccount?: string;
    transactionCharge?: number; // platform commission, major unit
    metadata?: Record<string, unknown>;
  }): Promise<{
    reference: string;
    authorizationUrl: string;
    accessCode: string;
  }> {
    if (this.mock) {
      return {
        reference: input.reference,
        authorizationUrl: `https://mock.paystack/checkout/${input.reference}`,
        accessCode: `mock_access_${input.reference}`,
      };
    }
    const { data } = await this.http.post<
      PaystackEnvelope<{
        reference: string;
        authorization_url: string;
        access_code: string;
      }>
    >('/transaction/initialize', {
      email: input.email,
      amount: PaystackClient.toMinor(input.amount),
      reference: input.reference,
      currency: 'GHS',
      subaccount: input.subaccount,
      transaction_charge: input.transactionCharge
        ? PaystackClient.toMinor(input.transactionCharge)
        : undefined,
      bearer: 'subaccount',
      metadata: input.metadata,
    });
    return {
      reference: data.data.reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
    };
  }

  async chargeAuthorization(input: {
    email: string;
    amount: number;
    authorizationCode: string;
    reference: string;
    subaccount?: string;
    transactionCharge?: number;
  }): Promise<{ status: string; reference: string }> {
    if (this.mock) {
      return { status: 'success', reference: input.reference };
    }
    const { data } = await this.http.post<
      PaystackEnvelope<{ status: string; reference: string }>
    >('/transaction/charge_authorization', {
      email: input.email,
      amount: PaystackClient.toMinor(input.amount),
      authorization_code: input.authorizationCode,
      reference: input.reference,
      currency: 'GHS',
      subaccount: input.subaccount,
      transaction_charge: input.transactionCharge
        ? PaystackClient.toMinor(input.transactionCharge)
        : undefined,
      bearer: 'subaccount',
    });
    return { status: data.data.status, reference: data.data.reference };
  }

  async refund(reference: string): Promise<void> {
    if (this.mock) return;
    await this.http.post('/refund', { transaction: reference });
  }

  /** Verify the X-Paystack-Signature header (HMAC SHA512 of the raw body). */
  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
    if (this.mock) return true;
    if (!signature) return false;
    const expected = createHmac('sha512', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
