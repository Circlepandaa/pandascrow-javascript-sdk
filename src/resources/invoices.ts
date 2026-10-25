import type { ApiData } from '../http';
import type { InvoiceClient, InvoiceDetails, InvoiceItem, Metadata } from '../types';
import { Resource } from './base';

type Id = number | string;

/** Invoices. Pass `metadata` to get it back on reads and in the `invoice.paid` webhook. */
export class Invoices extends Resource {
  /** Returns invoice_id, invoice_number, payment_url and metadata. */
  create(params: {
    ownerUuid: string;
    client: InvoiceClient;
    invoice: InvoiceDetails;
    items: InvoiceItem[];
    paymentMethod?: string;
    metadata?: Metadata;
  }): Promise<ApiData> {
    return this.http.post('/invoice', {
      uuid: params.ownerUuid,
      owner_uuid: params.ownerUuid,
      client: params.client,
      invoice: params.invoice,
      items: params.items,
      payment: { method: params.paymentMethod ?? 'payment_link' },
      metadata: params.metadata,
    });
  }

  /** `{ invoices: [...] }` */
  all(uuid: string): Promise<ApiData> {
    return this.http.get('/invoice', { uuid });
  }

  find(uuid: string, invoiceId: Id): Promise<ApiData> {
    return this.http.get('/invoice/single', { uuid, invoice_id: invoiceId });
  }

  /** Start payment for an open invoice; returns a payment link. */
  pay(uuid: string, invoiceNumber: string): Promise<ApiData> {
    return this.http.post('/invoice/pay', { uuid, invoice_number: invoiceNumber });
  }

  cancel(uuid: string, invoiceId: Id): Promise<ApiData> {
    return this.http.post('/invoice/cancel', { uuid, invoice_id: invoiceId });
  }
}
