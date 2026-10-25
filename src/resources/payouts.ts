import type { ApiData } from '../http';
import type { Amount, Currency } from '../types';
import { Resource } from './base';

/** Payouts from a wallet to the user's saved settlement account. */
export class Payouts extends Resource {
  /**
   * Pay out to a settlement account (the active one for the currency if no id is given).
   * NGN is sent instantly; other currencies are queued for processing.
   */
  create(uuid: string, amount: Amount, currency: Currency, options: { settlementAccountId?: number; internalNotes?: string } = {}): Promise<ApiData> {
    return this.http.post('/payouts', {
      uuid,
      amount,
      currency: String(currency).toUpperCase(),
      settlement_account_id: options.settlementAccountId,
      internal_notes: options.internalNotes,
    });
  }

  /** Payout history: `{ payouts: [...] }`. */
  all(uuid: string, filters: { status?: string; currency?: Currency; payoutId?: number } = {}): Promise<ApiData> {
    return this.http.get('/payouts', { uuid, status: filters.status, currency: filters.currency, payout_id: filters.payoutId });
  }

  /** Settlement accounts saved for the user. */
  settlementAccounts(uuid: string, currency?: Currency): Promise<ApiData> {
    return this.http.get('/setting/settlement', { uuid, currency });
  }
}
