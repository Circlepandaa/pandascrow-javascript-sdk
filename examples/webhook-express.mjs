// PANDASCROW_SECRET_KEY=sk_test_xxx node examples/webhook-express.mjs   (npm install express)
import express from 'express';
import { verifyWebhook, PandascrowError } from 'pandascrow';

const app = express();

// Use the raw body: re-serialising parsed JSON changes the bytes and breaks the signature
app.post('/webhooks/pandascrow', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = await verifyWebhook(process.env.PANDASCROW_SECRET_KEY, req.body, req.get('X-Pandascrow-Signature'));
  } catch (err) {
    return res.status(err instanceof PandascrowError && err.status ? err.status : 400).json({ status: false });
  }

  const { data } = event;
  switch (event.event) {
    case 'escrow.paid':
      // e.g. mark the property as reserved: data.metadata?.property_id, data.escrow_id
      break;
    case 'escrow.completed':
    case 'escrow.payout.completed':
      break;
    case 'escrow.dispute.opened':
      break;
    case 'invoice.paid':
    case 'wallet.deposit.success':
      break;
  }

  res.json({ status: true });
});

app.listen(3000, () => console.log('Listening on http://localhost:3000/webhooks/pandascrow'));
