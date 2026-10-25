import { describe, expect, it } from 'vitest';
import Pandascrow, { PandascrowError } from '../src';
import { fakeFetch } from './helpers';

describe('client', () => {
  it('defaults to sandbox and supports live / custom hosts', () => {
    const f = fakeFetch();
    expect(new Pandascrow('pk', { fetch: f.fetch }).baseUrl).toBe('https://sandbox.pandascrow.io');
    expect(new Pandascrow('pk', { sandbox: false, fetch: f.fetch }).baseUrl).toBe('https://api.pandascrow.io');
    expect(new Pandascrow('pk', { baseUrl: 'http://localhost:8000/', fetch: f.fetch }).baseUrl).toBe('http://localhost:8000');
  });

  it('rejects an empty key', () => {
    expect(() => new Pandascrow('  ')).toThrow(TypeError);
  });

  it('sends the Token header and a JSON body without null/undefined fields', async () => {
    const f = fakeFetch();
    f.push(200, { status: true, data: { ok: 1 } });
    const ps = new Pandascrow('pk_test_123', { fetch: f.fetch, headers: { 'X-Trace': 't1' } });
    const out = await ps.post('/escrow/initialize', { title: 'Rent', description: undefined, x: null, url: 'https://x.io/a' });

    const r = f.last();
    expect(out).toEqual({ ok: 1 });
    expect(r.method).toBe('POST');
    expect(r.url).toBe('https://sandbox.pandascrow.io/escrow/initialize');
    expect(r.headers.Token).toBe('pk_test_123');
    expect(r.headers['Content-Type']).toBe('application/json');
    expect(r.headers['X-Trace']).toBe('t1');
    expect(r.headers['User-Agent']).toMatch(/^pandascrow-js\//);
    expect(r.json).toEqual({ title: 'Rent', url: 'https://x.io/a' });
  });

  it('GET uses the query string and no body', async () => {
    const f = fakeFetch();
    const ps = new Pandascrow('pk', { fetch: f.fetch });
    await ps.get('/escrow/single', { uuid: 'u1', escrow_id: 5, skip: undefined });
    expect(f.last().method).toBe('GET');
    expect(f.last().body).toBeUndefined();
    expect(f.last().query).toEqual({ uuid: 'u1', escrow_id: '5' });
  });

  it('throws PandascrowError with message, status and doc url', async () => {
    const f = fakeFetch();
    f.push(400, { status: false, data: { message: 'Escrow type is required.', doc_url: 'https://docs/x' } });
    const ps = new Pandascrow('pk', { fetch: f.fetch });
    const err = await ps.post('/escrow/initialize').catch((e) => e);
    expect(err).toBeInstanceOf(PandascrowError);
    expect(err.message).toBe('Escrow type is required.');
    expect(err.status).toBe(400);
    expect(err.docUrl).toBe('https://docs/x');
    expect(err.response.status).toBe(false);
  });

  it('treats status:false on HTTP 200 as an error', async () => {
    const f = fakeFetch();
    f.push(200, { status: false, message: 'Endpoint not found.' });
    await expect(new Pandascrow('pk', { fetch: f.fetch }).get('/nope')).rejects.toThrow('Endpoint not found.');
  });

  it('reports auth errors from the middleware', async () => {
    const f = fakeFetch();
    f.push(401, { status: false, message: 'Unauthorized: Invalid public key' });
    const err = await new Pandascrow('pk', { fetch: f.fetch }).wallet.list('u').catch((e) => e);
    expect(err.status).toBe(401);
    expect(err.message).toBe('Unauthorized: Invalid public key');
  });

  it('tolerates PHP notices printed before the JSON', async () => {
    const f = fakeFetch();
    f.push(200, '<br />\n<b>Warning</b>: Undefined index<br />\n{"status":true,"data":{"id":7}}');
    expect(await new Pandascrow('pk', { fetch: f.fetch }).get('/x')).toEqual({ id: 7 });
  });

  it('gives a readable error for non-JSON responses', async () => {
    const f = fakeFetch();
    f.push(502, '<html><body>Bad Gateway</body></html>');
    await expect(new Pandascrow('pk', { fetch: f.fetch }).get('/x')).rejects.toThrow('Unexpected response from Pandascrow (HTTP 502): Bad Gateway');
  });

  it('returns message-only successes', async () => {
    const f = fakeFetch();
    f.push(200, { status: true, message: 'OTP sent' });
    expect(await new Pandascrow('pk', { fetch: f.fetch }).post('/x')).toEqual({ message: 'OTP sent' });
  });

  it('wraps network errors and timeouts', async () => {
    const failing = new Pandascrow('pk', { fetch: async () => { throw new Error('ECONNREFUSED'); } });
    const err = await failing.get('/x').catch((e) => e);
    expect(err).toBeInstanceOf(PandascrowError);
    expect(err.status).toBe(0);
    expect(err.message).toContain('ECONNREFUSED');

    const slow = new Pandascrow('pk', {
      timeout: 20,
      fetch: (_url, init) => new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))),
    });
    await expect(slow.get('/x')).rejects.toThrow('timed out after 20ms');
  });
});
