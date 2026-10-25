import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PandascrowError, signWebhook, verifyWebhook } from '../src';

const SECRET = 'sk_test_secret';
const body = (data: object, ts = Math.floor(Date.now() / 1000)) =>
  // the API encodes with unescaped slashes/unicode, which JSON.stringify also does
  JSON.stringify({ event: 'escrow.completed', data, timestamp: ts });
const hmac = (raw: string, secret = SECRET) => createHmac('sha256', secret).update(raw).digest('hex');

describe('webhooks', () => {
  it('verifies the raw body signature', async () => {
    const raw = body({ escrow_id: 9, payment_url: 'https://pay.io/x', name: 'Ọlá ₦', metadata: { property_id: 'PR-204' } });
    const event = await verifyWebhook(SECRET, raw, hmac(raw));
    expect(event.event).toBe('escrow.completed');
    expect(event.data.metadata?.property_id).toBe('PR-204');
  });

  it('accepts Buffers and upper-case signatures', async () => {
    const raw = body({ x: 1 });
    const event = await verifyWebhook(SECRET, Buffer.from(raw), hmac(raw).toUpperCase());
    expect(event.data.x).toBe(1);
  });

  it('signWebhook matches Node HMAC', async () => {
    const raw = body({ a: 'b' });
    expect(await signWebhook(SECRET, raw)).toBe(hmac(raw));
  });

  it('rejects tampered bodies and wrong secrets', async () => {
    const raw = body({ amount: 100 });
    await expect(verifyWebhook(SECRET, raw.replace('100', '900'), hmac(raw))).rejects.toMatchObject({ status: 401 });
    await expect(verifyWebhook(SECRET, raw, hmac(raw, 'other'))).rejects.toBeInstanceOf(PandascrowError);
    await expect(verifyWebhook(SECRET, raw, undefined)).rejects.toThrow('Invalid webhook signature');
  });

  it('rejects stale events unless tolerance is 0', async () => {
    const raw = body({}, Math.floor(Date.now() / 1000) - 3600);
    await expect(verifyWebhook(SECRET, raw, hmac(raw))).rejects.toThrow('tolerance');
    expect((await verifyWebhook(SECRET, raw, hmac(raw), { tolerance: 0 })).data).toEqual({});
  });

  it('refuses parsed objects', async () => {
    await expect(verifyWebhook(SECRET, { event: 'x' } as any, 'abc')).rejects.toThrow('raw request body');
  });
});
