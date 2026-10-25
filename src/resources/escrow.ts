import type { ApiData } from '../http';
import type {
  Amount,
  CreateMilestoneEscrowParams,
  CreateOnetimeEscrowParams,
  CreateRecurringEscrowParams,
  EscrowCreated,
} from '../types';
import { Resource } from './base';

type Id = number | string;

/**
 * Escrow transactions.
 *
 * Every create method accepts `metadata`, e.g. `{ property_id: 'PR-204' }`. It is
 * stored on the escrow, returned by find()/all() and included as `data.metadata`
 * in every webhook for that escrow.
 */
export class Escrow extends Resource {
  /** Create any escrow type. Prefer createOnetime / createMilestone / createRecurring. */
  create(params: Record<string, unknown> & { escrow_type: string }): Promise<EscrowCreated> {
    return this.http.post('/escrow/initialize', params);
  }

  /** One-time escrow. Returns escrow_id, transaction_ref, payment_url (or virtual_account) and metadata. */
  createOnetime(params: CreateOnetimeEscrowParams): Promise<EscrowCreated> {
    return this.create({ ...params, escrow_type: 'onetime' });
  }

  /** Milestone escrow, paid and released stage by stage. */
  createMilestone(params: CreateMilestoneEscrowParams): Promise<EscrowCreated> {
    return this.create({ ...params, escrow_type: 'milestone' });
  }

  /** Recurring (group contribution) escrow. */
  createRecurring(params: CreateRecurringEscrowParams): Promise<EscrowCreated> {
    return this.create({ ...params, escrow_type: 'recurring' });
  }

  /** All escrows the user takes part in, with participants, transactions, milestones, payout and metadata. */
  all(uuid: string): Promise<ApiData[]> {
    return this.http.get('/escrow', { uuid });
  }

  /** One escrow with full details: `{ escrow, participants, transactions, milestones, ... }`. */
  find(uuid: string, escrowId: Id): Promise<ApiData> {
    return this.http.get('/escrow/single', { uuid, escrow_id: escrowId });
  }

  /** Buyer confirms delivery with the release OTP; funds are paid out to the seller. */
  complete(uuid: string, escrowId: Id, otp: string): Promise<ApiData> {
    return this.http.post('/escrow/complete', { uuid, escrow_id: Number(escrowId), otp });
  }

  /** Re-send the release OTP to the buyer. */
  resendReleaseOtp(uuid: string, escrowId: Id): Promise<ApiData> {
    return this.http.post('/escrow/resend-otp', { uuid, escrow_id: Number(escrowId) });
  }

  /** Payment link for the next unpaid milestone. */
  payNextMilestone(uuid: string, escrowId: Id, extra: { callback_url?: string } = {}): Promise<ApiData> {
    return this.http.post('/escrow/next-payment', { uuid, escrow_id: Number(escrowId), ...extra });
  }

  /** Approve one milestone with its OTP; that milestone's funds are paid out. */
  completeMilestone(uuid: string, escrowId: Id, milestoneId: Id, otp: string): Promise<ApiData> {
    return this.http.post('/escrow/milestone-item/complete', {
      uuid,
      escrow_id: Number(escrowId),
      milestone_id: Number(milestoneId),
      otp,
    });
  }

  /** New payment link when the original expired. */
  regeneratePayment(uuid: string, escrowId: Id, extra: { cust_name?: string; cust_email?: string; callback_url?: string } = {}): Promise<ApiData> {
    return this.http.post('/escrow/regenerate-payment', { uuid, escrow_id: Number(escrowId), ...extra });
  }

  /** New payment link for a specific milestone. */
  regenerateMilestonePayment(uuid: string, escrowId: Id, milestoneId: Id, extra: { cust_name?: string; cust_email?: string; callback_url?: string } = {}): Promise<ApiData> {
    return this.http.post('/escrow/regenerate-milestone-payment', {
      uuid,
      escrow_id: Number(escrowId),
      milestone_id: Number(milestoneId),
      ...extra,
    });
  }

  /** Open a dispute. Funds stay locked until it is resolved. */
  dispute(uuid: string, escrowId: Id, reason: string, screenshotUrl?: string): Promise<ApiData> {
    return this.http.post('/escrow/dispute', { uuid, escrow_id: Number(escrowId), reason, screenshot_url: screenshotUrl });
  }

  /** Disputes for the user, optionally for one escrow or with a status filter. */
  disputes(uuid: string, filters: { escrowId?: Id; status?: string } = {}): Promise<ApiData> {
    return this.http.get('/escrow/dispute', { uuid, escrow_id: filters.escrowId, status: filters.status });
  }

  /** Join a recurring escrow as a contributor. */
  joinRecurring(uuid: string, escrowId: Id, contributor: { name: string; email: string; amount: Amount }): Promise<ApiData> {
    return this.http.post('/escrow/recurring/join', { uuid, escrow_id: Number(escrowId), ...contributor });
  }
}
