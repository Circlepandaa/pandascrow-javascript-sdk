import type { ApiData, Body } from '../http';
import type { Amount, VirtualAccountOptions } from '../types';
import { Resource } from './base';

/**
 * Dedicated NGN virtual bank accounts. Transfers into them land in the user's
 * wallet and trigger a `wallet.deposit.success` webhook, which carries the
 * account's `metadata`.
 */
export class VirtualAccounts extends Resource {
  /** Temporary account (1–24 hours). Pass no amount to accept any amount. */
  createDynamic(uuid: string, accountName: string, amount?: Amount | null, options: VirtualAccountOptions = {}): Promise<ApiData> {
    return this.http.post('/dva/create', payload(uuid, accountName, amount, options, true));
  }

  /** Permanent account (no expiry). Pass no amount to accept any amount. */
  createStatic(uuid: string, accountName: string, amount?: Amount | null, options: VirtualAccountOptions = {}): Promise<ApiData> {
    return this.http.post('/dva/static/create', payload(uuid, accountName, amount, options, false));
  }

  /** Give an existing account a new amount / description. */
  reallocate(uuid: string, accountNumber: string, accountName: string, amount?: Amount | null, options: VirtualAccountOptions = {}): Promise<ApiData> {
    const body = payload(uuid, accountName, amount, options, false);
    (body.customer as { account: Record<string, unknown> }).account.number = accountNumber;
    return this.http.post('/dva/reallocate', body);
  }

  deactivate(uuid: string, accountNumber: string): Promise<ApiData> {
    return this.http.post('/dva/deactivate', { uuid, customer: { account: { number: accountNumber } } });
  }

  reactivate(uuid: string, accountNumber: string): Promise<ApiData> {
    return this.http.post('/dva/reactivate', { uuid, customer: { account: { number: accountNumber } } });
  }

  /** Ask Pandascrow to re-check a payment into an account (e.g. if a webhook was missed). */
  confirmPayment(uuid: string, accountNumber: string, reference: string, amount: Amount, sessionId?: string): Promise<ApiData> {
    return this.http.post('/dva/confirm-payment', {
      uuid,
      accountnumber: accountNumber,
      reference,
      sessionid: sessionId,
      amount: String(amount),
    });
  }
}

function payload(uuid: string, accountName: string, amount: Amount | null | undefined, o: VirtualAccountOptions, withExpiry: boolean): Body {
  const account: Record<string, unknown> = { name: accountName };
  if (withExpiry && o.expiryHours !== undefined) account.expiry = { hours: Math.trunc(o.expiryHours) };

  const hasAmount = amount !== undefined && amount !== null;
  const order: Record<string, unknown> = { amounttype: o.amountType ?? (hasAmount ? 'EXACT' : 'ANY') };
  if (hasAmount) order.amount = Number(amount);
  if (o.description !== undefined) order.description = o.description;

  const body: Body = { uuid, customer: { account }, order };
  if (o.reference) body.transaction = { reference: o.reference };
  if (o.beneficiary) body.beneficiarytocredit = o.beneficiary;
  if (o.metadata) body.metadata = o.metadata;
  return body;
}
