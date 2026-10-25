import { PandascrowError } from './errors';

export const VERSION = '1.0.0';
export const SANDBOX_URL = 'https://sandbox.pandascrow.io';
export const LIVE_URL = 'https://api.pandascrow.io';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ClientOptions {
  /** true (default) → https://sandbox.pandascrow.io, false → https://api.pandascrow.io */
  sandbox?: boolean;
  /** Override the API host entirely (e.g. a local API during development). */
  baseUrl?: string;
  /** Request timeout in milliseconds. Default 30000. */
  timeout?: number;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
  /** Custom fetch implementation (logging, retries, tests). Defaults to the global fetch. */
  fetch?: FetchLike;
}

export type Query = Record<string, string | number | boolean | null | undefined>;
export type Body = Record<string, unknown>;

/** The `data` object Pandascrow returns. */
export type ApiData = Record<string, any>;

export class HttpClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: FetchLike;

  constructor(apiKey: string, options: ClientOptions = {}) {
    const key = (apiKey ?? '').trim();
    if (!key) {
      throw new TypeError('A Pandascrow API key is required. Find it in your dashboard under Developers.');
    }
    const sandbox = options.sandbox ?? true;
    this.apiKey = key;
    this.baseUrl = (options.baseUrl ?? (sandbox ? SANDBOX_URL : LIVE_URL)).replace(/\/+$/, '');
    this.timeout = options.timeout ?? 30_000;
    this.headers = options.headers ?? {};

    const f = options.fetch ?? (typeof fetch === 'function' ? fetch : undefined);
    if (!f) {
      throw new TypeError('No fetch implementation found. Use Node.js 18+ or pass `fetch` in the client options.');
    }
    // keep `this` bound for runtimes whose fetch requires the global receiver
    this.fetchImpl = options.fetch ? f : (input, init) => (f as FetchLike).call(globalThis, input, init);
  }

  get<T = ApiData>(path: string, query: Query = {}): Promise<T> {
    return this.request<T>('GET', path, query);
  }

  post<T = ApiData>(path: string, body: Body = {}, query: Query = {}): Promise<T> {
    return this.request<T>('POST', path, query, body);
  }

  /**
   * Low-level call, and your escape hatch for endpoints without a helper:
   *   await ps.request('GET', '/clients', { uuid })
   * Resolves with the `data` object of the Pandascrow response.
   */
  async request<T = ApiData>(method: string, path: string, query: Query = {}, body?: Body): Promise<T> {
    method = method.toUpperCase();
    let url = `${this.baseUrl}/${path.replace(/^\/+/, '')}`;

    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    }
    const q = qs.toString();
    if (q) url += (url.includes('?') ? '&' : '?') + q;

    const headers: Record<string, string> = {
      Token: this.apiKey,
      Accept: 'application/json',
      ...this.headers,
    };
    // Browsers forbid setting User-Agent; only send it on servers
    if (typeof window === 'undefined') {
      headers['User-Agent'] = `pandascrow-js/${VERSION}`;
    }

    let payload: string | undefined;
    if (body !== undefined && method !== 'GET') {
      payload = JSON.stringify(stripUndefined(body));
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    let res: Response;
    let raw: string;
    try {
      res = await this.fetchImpl(url, { method, headers, body: payload, signal: controller.signal });
      raw = await res.text();
    } catch (err) {
      const aborted = (err as { name?: string })?.name === 'AbortError';
      throw new PandascrowError(
        aborted
          ? `Request to Pandascrow timed out after ${this.timeout}ms`
          : `Network error contacting Pandascrow: ${(err as Error)?.message ?? String(err)}`,
        { cause: err },
      );
    } finally {
      clearTimeout(timer);
    }

    return parseResponse<T>(res.status, raw);
  }
}

/** Turn a raw HTTP response into the `data` object, or throw PandascrowError. */
export function parseResponse<T = ApiData>(status: number, raw: string): T {
  const json = decode(raw);

  if (json === null) {
    const snippet = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    throw new PandascrowError(`Unexpected response from Pandascrow (HTTP ${status})${snippet ? `: ${snippet}` : ''}`, { status });
  }

  const flag = json.status;
  const ok = flag === true || flag === 'true' || flag === 1 || flag === 'success';

  if (status >= 400 || !ok) {
    const data = isObject(json.data) ? json.data : {};
    const message = [data.message, json.message, data.error, json.error].find((m) => typeof m === 'string' && m !== '') as string | undefined;
    throw new PandascrowError(message ?? `Pandascrow request failed (HTTP ${status})`, {
      status,
      docUrl: typeof data.doc_url === 'string' ? data.doc_url : null,
      response: json,
    });
  }

  if ('data' in json) {
    return (isObject(json.data) || Array.isArray(json.data) ? json.data : { value: json.data }) as T;
  }

  // Some endpoints answer { "status": true, "message": "..." } with no data object
  const { status: _s, ...rest } = json;
  return rest as T;
}

/** JSON.parse, tolerating PHP notices/HTML printed before the JSON body. */
function decode(raw: string): Record<string, any> | null {
  const text = raw.trim();
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s);
      return isObject(v) ? v : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(text);
  if (direct) return direct;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start !== -1 && end > start ? tryParse(text.slice(start, end + 1)) : null;
}

function isObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stripUndefined(body: Body): Body {
  const out: Body = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}
