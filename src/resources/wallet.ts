import type { ApiData } from '../http';
import type { Amount, Currency } from '../types';
import { Resource } from './base';

export class Wallet extends Resource {
  /** The user's wallets (one per currency). */
  list(uuid: string): Promise<ApiData> {
    return this.http.get('/wallets', { uuid });
  }

  /** Balances across all currencies. */
  balances(uuid: string): Promise<ApiData> {
    return this.http.get('/wallet/balance', { uuid });
  }

  /** History for one currency: `{ balance, currency, transactions }`. */
  transactions(uuid: string, currency: Currency, type?: string): Promise<ApiData> {
    return this.http.get('/wallet', { uuid, currency: String(currency).toUpperCase(), type });
  }

  /** Virtual bank accounts attached to the user's wallets. */
  accounts(uuid: string): Promise<ApiData> {
    return this.http.get('/wallet/account', { uuid });
  }

  /**
   * Request a manual payout from the wallet.
   * For an instant payout to a saved settlement account use `payouts.create()`;
   * for an instant NGN bank transfer use `bank.transfer()`.
   */
  payout(
    uuid: string,
    amount: Amount,
    currency: Currency,
    destination: Record<string, unknown> | string,
    method = 'bank_transfer',
  ): Promise<ApiData> {
    return this.http.post('/wallet/payout', {
      uuid,
      amount: String(amount),
      currency: String(currency).toUpperCase(),
      method,
      // the API stores the destination as text, so send JSON
      destination: typeof destination === 'string' ? destination : JSON.stringify(destination),
    });
  }
}
