/** Your own identifiers. Returned on reads and as `data.metadata` in webhooks. Max 50 keys, 5 levels, 8 KB. */
export type Metadata = Record<string, unknown>;

export type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'GHS' | 'KES' | 'ZAR' | (string & {});
export type Amount = number | string;

export interface Party {
  name?: string;
  email: string;
  phone?: string;
}

/** Seller's payout destination for an escrow. */
export interface EscrowPayout {
  payout_type?: 'bank' | 'wallet' | 'crypto' | 'mobile_money' | (string & {});
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  account_name?: string;
  swift_code?: string;
  iban?: string;
  routing_number?: string;
  sort_code?: string;
  wallet_address?: string;
  crypto_network?: string;
  token_symbol?: string;
  mobile_money_provider?: string;
  mobile_money_number?: string;
  receiver_type?: 'individual' | 'business';
  [key: string]: unknown;
}

interface EscrowBase {
  /** The Pandascrow user you are acting for. */
  uuid: string;
  initiator_id: string;
  initiator_role: 'buyer' | 'seller' | 'broker';
  title: string;
  description: string;
  currency: Currency;
  /** Counterparty when you are the seller (both parties for brokers). */
  buyer_details?: Party;
  /** Counterparty when you are the buyer (both parties for brokers). */
  seller_details?: Party;
  who_pay_fees?: 'buyer' | 'seller' | 'both';
  inspection_period?: number | string;
  delivery_date?: string;
  how_dispute_is_handled?: 'platform' | 'arbitration';
  acceptance_criteria?: string;
  payout?: EscrowPayout;
  payment_gateway?: string;
  callback_url?: string;
  /** Re-sending the same key returns an error instead of creating a duplicate escrow. */
  idempotency_key?: string;
  metadata?: Metadata;
  [key: string]: unknown;
}

export interface CreateOnetimeEscrowParams extends EscrowBase {
  amount: Amount;
}

export interface Milestone {
  title: string;
  amount: Amount;
  description?: string;
  due_date?: string;
  [key: string]: unknown;
}

export interface CreateMilestoneEscrowParams extends EscrowBase {
  milestones: Milestone[];
  /** 'milestone' (pay per stage, default) or 'full' (pay everything upfront). */
  deposit_option?: 'milestone' | 'full';
}

export interface CreateRecurringEscrowParams {
  uuid: string;
  title: string;
  description: string;
  currency: Currency;
  amount: Amount;
  cycle: {
    cycle_interval: string;
    minimum_contributors: number;
    maximum_contributors: number;
    due_day_of_month: number;
    expected_amount: Amount;
    due_date: string;
    [key: string]: unknown;
  };
  contributors?: Array<{ name: string; email: string; amount?: Amount }>;
  metadata?: Metadata;
  [key: string]: unknown;
}

export interface EscrowCreated {
  escrow_id: number;
  status: string;
  type?: string;
  transaction_ref?: string;
  provider?: string;
  payment_method?: string;
  payment_url?: string | null;
  virtual_account?: Record<string, any>;
  metadata: Metadata | null;
  [key: string]: any;
}

export interface BankAccount {
  account_number: string;
  account_name: string;
  bank_code: string;
}

export interface TransferResult {
  transaction: {
    transaction_ref: string;
    amount: Amount;
    amount_sent?: string;
    fees?: string;
    status: string;
    memo?: string;
    [key: string]: any;
  };
  metadata?: Record<string, any> | null;
  idempotent: boolean;
  [key: string]: any;
}

export interface InvoiceClient {
  full_name: string;
  email: string;
  phone?: string;
  billing_address?: string;
  company_name?: string;
}

export interface InvoiceDetails {
  currency: Currency;
  due_date: string;
  notes?: string;
  tax?: Amount;
  [key: string]: unknown;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: Amount;
}

export interface CreatePaymentLinkParams {
  uuid: string;
  type?: 'onetime' | 'subscription';
  name: string;
  description: string;
  amount?: Amount;
  currency?: Currency;
  link_slug?: string;
  is_custom_link?: boolean;
  redirect_link?: string;
  success_message?: string;
  intervals?: string;
  is_phone_required?: boolean;
  is_tip_required?: boolean;
  [key: string]: unknown;
}

export interface InitiatePaymentLinkParams {
  /** The link slug. */
  link_id: string;
  full_name: string;
  email: string;
  amount: Amount;
  phone_number?: string;
  delivery_address?: string;
  tip_amount?: Amount;
  [key: string]: unknown;
}

export interface VirtualAccountOptions {
  /** Dynamic accounts only: 1–24 hours (default 1). */
  expiryHours?: number;
  description?: string;
  reference?: string;
  beneficiary?: { accountnumber: string; bankcode?: string; feeamount?: number };
  metadata?: Metadata;
  /** Defaults to 'EXACT' when an amount is given, 'ANY' otherwise. */
  amountType?: 'EXACT' | 'ANY' | (string & {});
}
