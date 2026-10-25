import type { ApiData } from '../http';
import type { Amount, BankAccount, Currency, TransferResult } from '../types';
import { Resource } from './base';

function randomHex(bytes: number): string {
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  const arr = new Uint8Array(bytes);
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export class Bank extends Resource {
  /** Supported Nigerian banks with their codes. */
  banks(): Promise<ApiData> {
    return this.http.get('/bank/lists');
  }

  /** Resolve the account name for a bank account before paying it. */
  validate(uuid: string, bankCode: string, accountNumber: string): Promise<ApiData> {
    return this.http.post('/bank/validate', { uuid, bank_code: bankCode, account_number: accountNumber });
  }

  /**
   * NGN wallet → bank transfer.
   *
   * An idempotency key is generated if you don't pass one. Store it: sending the
   * same key again returns the original transfer instead of paying twice.
   */
  transfer(
    uuid: string,
    amount: Amount,
    bank: BankAccount,
    options: { currency?: Currency; idempotencyKey?: string; description?: string } = {},
  ): Promise<TransferResult> {
    for (const field of ['account_number', 'account_name', 'bank_code'] as const) {
      if (!bank?.[field]) throw new TypeError(`bank.${field} is required`);
    }
    return this.http.post('/bank/transfers', {
      uuid,
      amount: String(amount),
      currency: String(options.currency ?? 'NGN').toUpperCase(),
      bank,
      // the transfer provider accepts references of at most 25 characters
      idempotency_key: options.idempotencyKey ?? `PS_${randomHex(8)}`,
      description: options.description,
    });
  }

  /** The user's saved settlement (payout) bank account. */
  settlementAccount(uuid: string): Promise<ApiData> {
    return this.http.get('/bank/settlement', { uuid });
  }
}
