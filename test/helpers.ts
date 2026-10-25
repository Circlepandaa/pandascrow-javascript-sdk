import type { FetchLike } from '../src';

export interface Recorded {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
  path: string;
  query: Record<string, string>;
  json: any;
}

/** Fake fetch: records requests and replays queued responses. */
export function fakeFetch() {
  const requests: Recorded[] = [];
  const queue: Array<{ status: number; body: string }> = [];
  const fetch: FetchLike = async (url, init = {}) => {
    const u = new URL(url);
    const body = init.body as string | undefined;
    requests.push({
      url,
      method: init.method ?? 'GET',
      headers: init.headers as Record<string, string>,
      body,
      path: u.pathname,
      query: Object.fromEntries(u.searchParams),
      json: body ? JSON.parse(body) : undefined,
    });
    const next = queue.shift() ?? { status: 200, body: '{"status":true,"data":{}}' };
    return new Response(next.body, { status: next.status });
  };
  return {
    fetch,
    requests,
    push(status: number, body: unknown) {
      queue.push({ status, body: typeof body === 'string' ? body : JSON.stringify(body) });
    },
    last(): Recorded {
      const r = requests[requests.length - 1];
      if (!r) throw new Error('no request recorded');
      return r;
    },
  };
}
