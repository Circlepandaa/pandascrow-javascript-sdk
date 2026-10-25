// PANDASCROW_API_KEY=pk_test_xxx PANDASCROW_UUID=your-user-uuid node examples/quickstart.mjs
import Pandascrow, { PandascrowError } from 'pandascrow';

const ps = new Pandascrow(process.env.PANDASCROW_API_KEY);
const uuid = process.env.PANDASCROW_UUID;

try {
  const escrow = await ps.escrow.createOnetime({
    uuid,
    initiator_id: uuid,
    initiator_role: 'seller',
    title: 'Apartment 4B, 12-month rent',
    description: 'Rent for 12 Admiralty Way, Lekki',
    currency: 'NGN',
    amount: 350000,
    inspection_period: 2,
    delivery_date: '2026-12-01',
    who_pay_fees: 'buyer',
    buyer_details: { name: 'Tenant T', email: 'tenant@example.com', phone: '+2348000000000' },
    payout: { payout_type: 'bank', bank_code: '058', account_number: '0123456789', account_name: 'Landlord L' },
    idempotency_key: 'lease-PR-204-2026',
    metadata: { property_id: 'PR-204', lease_id: 'L-88' },
  });

  console.log(`Escrow #${escrow.escrow_id} created. Send the buyer to:`, escrow.payment_url ?? escrow.virtual_account);

  const details = await ps.escrow.find(uuid, escrow.escrow_id);
  console.log('Status:', details.escrow.status, 'property:', details.escrow.metadata?.property_id);

  console.log((await ps.wallet.balances(uuid)).balances);
} catch (err) {
  if (err instanceof PandascrowError) {
    console.error(`Pandascrow error (HTTP ${err.status}): ${err.message}${err.docUrl ? ` (see ${err.docUrl})` : ''}`);
    process.exit(1);
  }
  throw err;
}
