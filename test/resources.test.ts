import { describe, expect, it } from 'vitest';
import Pandascrow from '../src';
import { fakeFetch } from './helpers';

const f = fakeFetch();
const ps = new Pandascrow('pk_test', { fetch: f.fetch });
const bank = { account_number: '0123456789', account_name: 'Ada', bank_code: '058' };

type Case = [name: string, call: () => Promise<unknown>, method: 'GET' | 'POST', path: string, expected: Record<string, unknown>];

/** Every helper must hit the right method + path with the field names the API reads. */
const cases: Case[] = [
  ['auth.login', () => ps.auth.login('a@b.c', 'pw'), 'POST', '/login', { email: 'a@b.c', password: 'pw' }],
  ['auth.verifyLoginOtp', () => ps.auth.verifyLoginOtp('a@b.c', '1234'), 'POST', '/login/otp', { otp_code: '1234' }],

  ['escrow.createOnetime', () => ps.escrow.createOnetime({ uuid: 'u', initiator_id: 'u', initiator_role: 'seller', title: 't', description: 'd', currency: 'NGN', amount: 1000, metadata: { property_id: 'P1' } }), 'POST', '/escrow/initialize', { escrow_type: 'onetime', metadata: { property_id: 'P1' } }],
  ['escrow.createMilestone', () => ps.escrow.createMilestone({ uuid: 'u', initiator_id: 'u', initiator_role: 'buyer', title: 't', description: 'd', currency: 'NGN', milestones: [{ title: 'a', amount: 1 }] }), 'POST', '/escrow/initialize', { escrow_type: 'milestone' }],
  ['escrow.createRecurring', () => ps.escrow.createRecurring({ uuid: 'u', title: 't', description: 'd', currency: 'NGN', amount: 1, cycle: { cycle_interval: 'monthly', minimum_contributors: 2, maximum_contributors: 5, due_day_of_month: 1, expected_amount: 10, due_date: '2026-12-01' } }), 'POST', '/escrow/initialize', { escrow_type: 'recurring' }],
  ['escrow.all', () => ps.escrow.all('u'), 'GET', '/escrow', { uuid: 'u' }],
  ['escrow.find', () => ps.escrow.find('u', 3), 'GET', '/escrow/single', { uuid: 'u', escrow_id: '3' }],
  ['escrow.complete', () => ps.escrow.complete('u', '3', '9999'), 'POST', '/escrow/complete', { escrow_id: 3, otp: '9999' }],
  ['escrow.resendReleaseOtp', () => ps.escrow.resendReleaseOtp('u', 3), 'POST', '/escrow/resend-otp', { escrow_id: 3 }],
  ['escrow.payNextMilestone', () => ps.escrow.payNextMilestone('u', 3), 'POST', '/escrow/next-payment', { escrow_id: 3 }],
  ['escrow.completeMilestone', () => ps.escrow.completeMilestone('u', 3, 4, '1111'), 'POST', '/escrow/milestone-item/complete', { milestone_id: 4, otp: '1111' }],
  ['escrow.regeneratePayment', () => ps.escrow.regeneratePayment('u', 3), 'POST', '/escrow/regenerate-payment', { escrow_id: 3 }],
  ['escrow.regenerateMilestonePayment', () => ps.escrow.regenerateMilestonePayment('u', 3, 4), 'POST', '/escrow/regenerate-milestone-payment', { milestone_id: 4 }],
  ['escrow.dispute', () => ps.escrow.dispute('u', 3, 'Not delivered'), 'POST', '/escrow/dispute', { reason: 'Not delivered' }],
  ['escrow.disputes', () => ps.escrow.disputes('u', { escrowId: 3 }), 'GET', '/escrow/dispute', { escrow_id: '3' }],
  ['escrow.joinRecurring', () => ps.escrow.joinRecurring('u', 3, { name: 'Ada', email: 'a@b.c', amount: 5000 }), 'POST', '/escrow/recurring/join', { name: 'Ada', email: 'a@b.c' }],

  ['wallet.list', () => ps.wallet.list('u'), 'GET', '/wallets', { uuid: 'u' }],
  ['wallet.balances', () => ps.wallet.balances('u'), 'GET', '/wallet/balance', { uuid: 'u' }],
  ['wallet.transactions', () => ps.wallet.transactions('u', 'ngn'), 'GET', '/wallet', { currency: 'NGN' }],
  ['wallet.accounts', () => ps.wallet.accounts('u'), 'GET', '/wallet/account', { uuid: 'u' }],
  ['wallet.payout', () => ps.wallet.payout('u', 1000, 'NGN', bank), 'POST', '/wallet/payout', { method: 'bank_transfer', destination: JSON.stringify(bank) }],

  ['payouts.create', () => ps.payouts.create('u', 100, 'usd', { settlementAccountId: 7 }), 'POST', '/payouts', { currency: 'USD', settlement_account_id: 7 }],
  ['payouts.all', () => ps.payouts.all('u', { status: 'pending' }), 'GET', '/payouts', { status: 'pending' }],
  ['payouts.settlementAccounts', () => ps.payouts.settlementAccounts('u'), 'GET', '/setting/settlement', { uuid: 'u' }],

  ['bank.banks', () => ps.bank.banks(), 'GET', '/bank/lists', {}],
  ['bank.validate', () => ps.bank.validate('u', '058', '0123456789'), 'POST', '/bank/validate', { bank_code: '058', account_number: '0123456789' }],
  ['bank.transfer', () => ps.bank.transfer('u', 5000, bank, { idempotencyKey: 'K1' }), 'POST', '/bank/transfers', { bank, idempotency_key: 'K1', amount: '5000', currency: 'NGN' }],
  ['bank.settlementAccount', () => ps.bank.settlementAccount('u'), 'GET', '/bank/settlement', { uuid: 'u' }],

  ['virtualAccounts.createDynamic', () => ps.virtualAccounts.createDynamic('u', 'Ada', 5000, { expiryHours: 2, metadata: { customer_id: 'C1' } }), 'POST', '/dva/create', { customer: { account: { name: 'Ada', expiry: { hours: 2 } } }, order: { amounttype: 'EXACT', amount: 5000 }, metadata: { customer_id: 'C1' } }],
  ['virtualAccounts.createStatic', () => ps.virtualAccounts.createStatic('u', 'Ada'), 'POST', '/dva/static/create', { order: { amounttype: 'ANY' } }],
  ['virtualAccounts.reallocate', () => ps.virtualAccounts.reallocate('u', '555', 'Ada', 100), 'POST', '/dva/reallocate', { customer: { account: { name: 'Ada', number: '555' } } }],
  ['virtualAccounts.deactivate', () => ps.virtualAccounts.deactivate('u', '555'), 'POST', '/dva/deactivate', { customer: { account: { number: '555' } } }],
  ['virtualAccounts.reactivate', () => ps.virtualAccounts.reactivate('u', '555'), 'POST', '/dva/reactivate', { customer: { account: { number: '555' } } }],
  ['virtualAccounts.confirmPayment', () => ps.virtualAccounts.confirmPayment('u', '555', 'REF', 100), 'POST', '/dva/confirm-payment', { accountnumber: '555', reference: 'REF' }],

  ['invoices.create', () => ps.invoices.create({ ownerUuid: 'u', client: { full_name: 'C', email: 'c@d.e' }, invoice: { currency: 'NGN', due_date: '2026-12-01' }, items: [{ description: 'x', quantity: 1, unit_price: 10 }], metadata: { order_id: 'A1' } }), 'POST', '/invoice', { owner_uuid: 'u', payment: { method: 'payment_link' }, metadata: { order_id: 'A1' } }],
  ['invoices.all', () => ps.invoices.all('u'), 'GET', '/invoice', { uuid: 'u' }],
  ['invoices.find', () => ps.invoices.find('u', 2), 'GET', '/invoice/single', { invoice_id: '2' }],
  ['invoices.pay', () => ps.invoices.pay('u', 'INV-1'), 'POST', '/invoice/pay', { invoice_number: 'INV-1' }],
  ['invoices.cancel', () => ps.invoices.cancel('u', 2), 'POST', '/invoice/cancel', { invoice_id: 2 }],

  ['paymentLinks.create', () => ps.paymentLinks.create({ uuid: 'u', name: 'n', description: 'd' }), 'POST', '/payme', { type: 'onetime' }],
  ['paymentLinks.all', () => ps.paymentLinks.all('u'), 'GET', '/payme', { uuid: 'u' }],
  ['paymentLinks.find', () => ps.paymentLinks.find('u', 'shoes'), 'GET', '/payme/single', { link_slug: 'shoes' }],
  ['paymentLinks.isSlugAvailable', () => ps.paymentLinks.isSlugAvailable('shoes'), 'POST', '/payme/slug', { link_slug: 'shoes' }],
  ['paymentLinks.goLive', () => ps.paymentLinks.goLive('u', 12), 'POST', '/payme/live', { payme_id: 12 }],
  ['paymentLinks.toggleTip', () => ps.paymentLinks.toggleTip('u', 'shoes'), 'POST', '/payme/tip', { link_slug: 'shoes' }],
  ['paymentLinks.payments', () => ps.paymentLinks.payments('12'), 'GET', '/payme/payments', { link_id: '12' }],
  ['paymentLinks.initiatePayment', () => ps.paymentLinks.initiatePayment({ link_id: 'shoes', full_name: 'A', email: 'a@b.c', amount: 100 }), 'POST', '/payme/initialize', { link_id: 'shoes' }],
  ['paymentLinks.completePayment', () => ps.paymentLinks.completePayment('u', 'shoes', 5, '1234'), 'POST', '/payme/complete', { slug: 'shoes', payment_id: 5, otp: '1234' }],
  ['paymentLinks.addMargin', () => ps.paymentLinks.addMargin('u', 'shoes', 5, 500), 'POST', '/payme/add-margin', { margin_amount: 500 }],

  ['kyc.bvn', () => ps.kyc.bvn('22222222222'), 'GET', '/kyc/ng/lookup/bvn', { bvn: '22222222222' }],
  ['kyc.nin', () => ps.kyc.nin('1'), 'GET', '/kyc/ng/lookup/nin', { nin: '1' }],
  ['kyc.phone', () => ps.kyc.phone('080'), 'GET', '/kyc/ng/lookup/phone', { phone_number: '080' }],
  ['kyc.nuban', () => ps.kyc.nuban('012', '058'), 'GET', '/kyc/ng/lookup/nuban', { account_number: '012', bank_code: '058' }],
  ['kyc.driversLicense', () => ps.kyc.driversLicense('DL1'), 'GET', '/kyc/ng/lookup/dl', { license_number: 'DL1' }],
  ['kyc.tin', () => ps.kyc.tin('T1'), 'GET', '/kyc/ng/lookup/tin', { tin: 'T1' }],
  ['kyc.cac', () => ps.kyc.cac('RC1', 'COMPANY'), 'GET', '/kyc/ng/lookup/cac/rc', { rc_number: 'RC1', company_type: 'COMPANY' }],
  ['kyc.searchCac', () => ps.kyc.searchCac('Pandascrow'), 'GET', '/kyc/ng/lookup/cac/name', { searchTerm: 'Pandascrow' }],
  ['kyc.email', () => ps.kyc.email('a@b.c'), 'GET', '/kyc/lookup/email', { email: 'a@b.c' }],
];

describe('resources', () => {
  it.each(cases)('%s', async (_name, call, method, path, expected) => {
    await call();
    const r = f.last();
    expect(r.method).toBe(method);
    expect(r.path).toBe(path);
    const sent = method === 'GET' ? r.query : r.json;
    for (const [key, value] of Object.entries(expected)) {
      expect(sent, `${path} should send ${key}`).toHaveProperty([key]);
      expect(sent[key]).toEqual(value);
    }
  });

  it('bank.transfer generates a short idempotency key (provider max 25 chars)', async () => {
    await ps.bank.transfer('u', 100, bank);
    expect(f.last().json.idempotency_key.length).toBeLessThanOrEqual(25);
  });

  it('bank.transfer validates the bank account', () => {
    expect(() => ps.bank.transfer('u', 100, { account_number: '1' } as any)).toThrow('bank.account_name is required');
  });
});

export { cases };
