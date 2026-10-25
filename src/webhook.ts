import { PandascrowError } from './errors';

export interface WebhookEvent<TData = Record<string, any>> {
  /** e.g. "escrow.paid", "escrow.completed", "invoice.paid", "wallet.deposit.success" */
  event: string;
  /** Event payload. Includes `metadata` you set on escrows, invoices and virtual accounts. */
  data: TData & { metadata?: Record<string, any> | null };
  /** Unix seconds */
  timestamp: number;
}

export interface VerifyOptions {
  /** Reject events whose timestamp is further than this many seconds from now. Default 300; 0 disables. */
  tolerance?: number;
}

type Subtle = {
  importKey(format: 'raw', key: ArrayBuffer | Uint8Array, alg: { name: string; hash: string }, extractable: boolean, usages: string[]): Promise<unknown>;
  sign(alg: string, key: unknown, data: ArrayBuffer | Uint8Array): Promise<ArrayBuffer>;
};

async function getSubtle(): Promise<Subtle> {
  const g = globalThis as { crypto?: { subtle?: Subtle } };
  if (g.crypto?.subtle) return g.crypto.subtle;
  // Node 18 without the global Web Crypto object
  const nodeCrypto = (await import('node:crypto')) as unknown as { webcrypto: { subtle: Subtle } };
  return nodeCrypto.webcrypto.subtle;
}

const encoder = new TextEncoder();

/** Hex HMAC-SHA256 of the raw body, keyed with your secret key: what Pandascrow sends in X-Pandascrow-Signature. */
export async function sign(secret: string, rawBody: string | Uint8Array): Promise<string> {
  const subtle = await getSubtle();
  const key = await subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = typeof rawBody === 'string' ? encoder.encode(rawBody) : rawBody;
  const mac = new Uint8Array(await subtle.sign('HMAC', key, bytes));
  return Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison of two hex strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidSignature(secret: string, rawBody: string | Uint8Array, signature: string): Promise<boolean> {
  return safeEqual(await sign(secret, rawBody), String(signature ?? '').trim().toLowerCase());
}

/**
 * Verify a webhook and return the parsed event.
 *
 * Always pass the RAW request body (string or bytes), exactly as received.
 * Re-serialising a parsed object changes the bytes and breaks the signature.
 *
 *   // Express
 *   app.post('/webhooks/pandascrow', express.raw({ type: 'application/json' }), async (req, res) => {
 *     const event = await verifyWebhook(process.env.PANDASCROW_SECRET_KEY!, req.body, req.get('X-Pandascrow-Signature'));
 *     res.sendStatus(200);
 *   });
 *
 * @throws PandascrowError status 400 for a malformed payload, 401 for a bad signature or stale timestamp
 */
export async function verifyWebhook<TData = Record<string, any>>(
  secret: string,
  rawBody: string | Uint8Array,
  signature: string | null | undefined,
  options: VerifyOptions = {},
): Promise<WebhookEvent<TData>> {
  if (!secret) throw new PandascrowError('Webhook secret key is empty', { status: 500 });
  if (rawBody === undefined || rawBody === null || (typeof rawBody === 'string' && rawBody === '') || (rawBody instanceof Uint8Array && rawBody.length === 0)) {
    throw new PandascrowError('Empty webhook body', { status: 400 });
  }
  if (typeof rawBody !== 'string' && !(rawBody instanceof Uint8Array)) {
    throw new PandascrowError('Pass the raw request body (string or Buffer), not a parsed object', { status: 400 });
  }
  if (!signature || !(await isValidSignature(secret, rawBody, signature))) {
    throw new PandascrowError('Invalid webhook signature', { status: 401 });
  }

  const text = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);
  let event: any;
  try {
    event = JSON.parse(text);
  } catch {
    throw new PandascrowError('Invalid webhook payload', { status: 400 });
  }
  if (typeof event !== 'object' || event === null || typeof event.event !== 'string') {
    throw new PandascrowError('Invalid webhook payload', { status: 400 });
  }

  const tolerance = options.tolerance ?? 300;
  if (tolerance > 0 && Number.isFinite(Number(event.timestamp))) {
    if (Math.abs(Date.now() / 1000 - Number(event.timestamp)) > tolerance) {
      throw new PandascrowError('Webhook timestamp is outside the allowed tolerance', { status: 401 });
    }
  }

  if (typeof event.data !== 'object' || event.data === null) event.data = {};
  return event as WebhookEvent<TData>;
}
