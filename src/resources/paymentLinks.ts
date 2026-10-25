import type { ApiData } from '../http';
import type { Amount, CreatePaymentLinkParams, InitiatePaymentLinkParams } from '../types';
import { Resource } from './base';

type Id = number | string;

/** PayMe payment links. Payments made through a link are held in escrow until the owner completes them. */
export class PaymentLinks extends Resource {
  /** New links are created closed; call goLive() to start accepting payments. Returns uuid, link, slug. */
  create(params: CreatePaymentLinkParams): Promise<ApiData> {
    return this.http.post('/payme', { type: 'onetime', ...params });
  }

  /** `{ count, page, limit, links }` */
  all(uuid: string, filters: { type?: 'onetime' | 'subscription'; isLive?: boolean } = {}): Promise<ApiData> {
    return this.http.get('/payme', {
      uuid,
      type: filters.type,
      is_live: filters.isLive === undefined ? undefined : Number(filters.isLive),
    });
  }

  /** One link with its payments. */
  find(uuid: string, slug?: string): Promise<ApiData> {
    return this.http.get('/payme/single', { uuid, link_slug: slug });
  }

  /** `{ slug, available }` */
  isSlugAvailable(slug: string): Promise<ApiData> {
    return this.http.post('/payme/slug', { link_slug: slug });
  }

  /** Toggle a link between live (accepting payments) and closed. `paymeId` is the link's `_id`. */
  goLive(uuid: string, paymeId: Id): Promise<ApiData> {
    return this.http.post('/payme/live', { uuid, payme_id: paymeId });
  }

  /** Turn "tip required" on or off. */
  toggleTip(uuid: string, slug: string): Promise<ApiData> {
    return this.http.post('/payme/tip', { uuid, link_slug: slug });
  }

  /** Payments received on a link: `{ count, payments, page, limit }`. */
  payments(
    linkId: Id,
    filters: { status?: string; search?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number } = {},
  ): Promise<ApiData> {
    return this.http.get('/payme/payments', {
      link_id: linkId,
      status: filters.status,
      search: filters.search,
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      page: filters.page,
      limit: filters.limit,
    });
  }

  /** A customer pays through a link. Returns payment_url, escrow_id, transaction_ref, provider. */
  initiatePayment(params: InitiatePaymentLinkParams): Promise<ApiData> {
    return this.http.post('/payme/initialize', params);
  }

  /** Release a PayMe payment to the link owner with the OTP. */
  completePayment(uuid: string, slug: string, paymentId: Id, otp: string): Promise<ApiData> {
    return this.http.post('/payme/complete', { uuid, slug, payment_id: paymentId, otp });
  }

  /** Ask the payer to top up a payment (e.g. extra delivery cost). */
  addMargin(uuid: string, slug: string, paymentId: Id, marginAmount: Amount): Promise<ApiData> {
    return this.http.post('/payme/add-margin', { uuid, slug, payment_id: paymentId, margin_amount: marginAmount });
  }
}
