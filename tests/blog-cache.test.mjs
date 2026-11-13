import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createNewsLoader, createBlogHandler, BLOG_RELEASE } from '../netlify/functions/blog.mjs';

const clock = Date.parse('2026-11-13T08:00:00Z');
const old = { type: 'TDT', label: 'Aviso anterior', date: '2026-11-06T10:00:00Z', url: 'https://www.mundoplus.tv/tv-digital/aviso-anterior/' };
const latest = { type: 'Satélite', label: 'Nueva emisión de Astra', date: '2026-11-12T10:00:00Z', url: 'https://satcesc.com/2026/11/12/nueva-emision/' };
const shell = '<html><head><title>Blog</title><meta name="robots" content="index,follow"><link rel="canonical" href="https://antenaszalla.com/blog/"></head><body><h1>Noticias</h1><!-- BLOG_CONTENT_START --><!-- BLOG_CONTENT_END --></body></html>';
const responseFor = items => ({ statusCode: 200, body: JSON.stringify({ items, satelliteChanges: [] }) });
const stored = (fetchedAt, items = [old]) => ({ version: 1, fetchedAt, data: { items, satelliteChanges: [] } });
const request = () => new Request('https://antenaszalla.com/blog/');
const handler = news => createBlogHandler({ news, now: () => clock, template: () => shell, towns: () => [] });

function memoryStore(initial = null) {
  let value = structuredClone(initial);
  return {
    reads: 0, writes: 0,
    async read() { this.reads++; return structuredClone(value); },
    async write(next) { this.writes++; value = structuredClone(next); },
    peek() { return structuredClone(value); }
  };
}

function context() {
  const pending = [];
  return { pending, waitUntil(promise) { pending.push(promise); } };
}

async function promptly(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('The HTML response waited for collection')), 1000);
    })]);
  } finally { clearTimeout(timer); }
}

test('background refresh serves both concurrent visitors promptly and persists for a cold instance', async () => {
  const store = memoryStore(stored(clock - 600000));
  let finish;
  let calls = 0;
  const collected = new Promise(resolve => { finish = resolve; });
  const load = createNewsLoader({ store, now: () => clock, reserve: { items: [old] },
    collect: async () => { calls++; return collected; } });
  const handle = handler(load);
  const a = context();
  const b = context();
  try {
    const [first, concurrent] = await promptly(Promise.all([handle(request(), a), handle(request(), b)]));
    assert.equal(calls, 1);
    assert.equal(first.status, 200);
    assert.equal(concurrent.status, 200);
    assert.match(await first.text(), /Aviso anterior/);
    assert.equal(first.headers.get('x-antenas-zalla-blog-release'), BLOG_RELEASE);
    assert.equal(first.headers.get('x-antenas-zalla-news-refreshing'), '1');
    assert.equal(first.headers.get('x-antenas-zalla-news-fetched-at'), new Date(clock - 600000).toISOString());
    assert.equal(first.headers.get('netlify-cdn-cache-control'), 'public, durable, max-age=30');
    assert.equal(a.pending.length, 1);
    assert.equal(b.pending.length, 1);
    assert.equal(a.pending[0], b.pending[0]);
    assert.equal(store.writes, 0);
  } finally { finish(responseFor([latest])); }
  await Promise.all(a.pending);
  assert.equal(store.writes, 1);
  assert.equal(store.peek().fetchedAt, clock);
  assert.equal(store.peek().data.items[0].date, '2026-11-12T10:00:00.000Z');

  const cold = createNewsLoader({ store, now: () => clock + 1000,
    collect: async () => { throw new Error('A fresh durable collection must not be recollected'); } });
  const next = await handler(cold)(request(), context());
  assert.match(await next.text(), /Nueva emisión de Astra/);
  assert.equal(next.headers.get('x-antenas-zalla-news'), 'actual');
  assert.equal(next.headers.get('x-antenas-zalla-news-refreshing'), '0');
  assert.equal(next.headers.get('netlify-cdn-cache-control'), 'public, durable, max-age=300');
  assert.equal(next.headers.get('x-antenas-zalla-news-fetched-at'), new Date(clock).toISOString());
});

test('a source slower than the previous 6.5-second limit completes after the HTML response', { timeout: 10000 }, async () => {
  const store = memoryStore();
  const lifetime = context();
  let completed = false;
  const load = createNewsLoader({ store, now: () => clock, reserve: { items: [old] },
    collect: async ({ signal }) => {
      await delay(6700, null, { signal });
      completed = true;
      return responseFor([latest]);
    }
  });
  const response = await promptly(handler(load)(request(), lifetime));
  assert.equal(response.status, 200);
  assert.equal(completed, false);
  assert.equal(response.headers.get('netlify-cdn-cache-control'), 'public, durable, max-age=30');
  assert.equal(response.headers.get('x-antenas-zalla-news-fetched-at'), null);
  await Promise.all(lifetime.pending);
  assert.equal(completed, true);
  assert.equal(store.peek().data.items[0].url, latest.url);
  assert.equal(store.peek().data.backup, false);
});

test('source failure retains the durable collection timestamp and retries without claiming freshness', async () => {
  let timestamp = clock;
  const previous = stored(clock - 600000);
  const store = memoryStore(previous);
  let calls = 0;
  const load = createNewsLoader({ store, now: () => timestamp,
    collect: async () => { calls++; throw new Error('Source unavailable'); } });
  const lifetime = context();
  await handler(load)(request(), lifetime);
  await Promise.all(lifetime.pending);
  const data = await load();
  assert.equal(data.backup, true);
  assert.equal(data.fetchedAt, previous.fetchedAt);
  assert.equal(data.items[0].date, '2026-11-06T10:00:00.000Z');
  assert.deepEqual(store.peek(), previous);
  assert.equal(store.writes, 0);
  assert.equal(calls, 1);
  timestamp += 30001;
  await load();
  assert.equal(calls, 2);
  assert.equal(store.writes, 0);
});

test('a write failure preserves successful new data in memory', async () => {
  const load = createNewsLoader({ now: () => clock,
    store: { read: async () => null, write: async () => { throw new Error('Storage unavailable'); } },
    collect: async () => responseFor([latest]) });
  const result = await load();
  assert.equal(result.backup, false);
  assert.equal(result.fetchedAt, clock);
  assert.equal(result.items[0].url, latest.url);
  assert.equal((await load()).items[0].url, latest.url);
});

test('invalid durable data and a failed read safely fall back without trusting stored markup or future dates', async () => {
  for (const store of [
    memoryStore(stored(clock + 600000, [latest])),
    memoryStore(stored(clock - 1000, [{ ...latest, url: 'https://evil.example/article' }])),
    { read: async () => { throw new Error('Storage unavailable'); }, write: async () => {} }
  ]) {
    const load = createNewsLoader({ store, now: () => clock, reserve: { items: [old] },
      collect: async () => ({ statusCode: 503, body: '{}' }) });
    const lifetime = context();
    const response = await promptly(handler(load)(request(), lifetime));
    assert.match(await response.text(), /Aviso anterior/);
    assert.equal(response.headers.get('x-antenas-zalla-news-fetched-at'), null);
    assert.equal(response.headers.get('netlify-cdn-cache-control'), 'public, durable, max-age=30');
    await Promise.all(lifetime.pending);
  }
});

test('local callers without waitUntil still await fresh news', async () => {
  let finish;
  let delivered = false;
  const collected = new Promise(resolve => { finish = resolve; });
  const load = createNewsLoader({ store: null, now: () => clock, collect: () => collected });
  const waiting = handler(load)(request()).then(response => { delivered = true; return response; });
  await delay(0);
  assert.equal(delivered, false);
  finish(responseFor([latest]));
  const response = await waiting;
  assert.match(await response.text(), /Nueva emisión de Astra/);
  assert.equal(response.headers.get('x-antenas-zalla-news'), 'actual');
});
