import test from 'node:test';
import assert from 'node:assert/strict';
import { getNewsResponse } from '../netlify/functions/novedades-tdt.mjs';

const now = Date.parse('2026-11-13T10:00:00Z');
const mundoRss = 'https://www.mundoplus.tv/seccion/tv-digital/feed/';
const satRss = 'https://satcesc.com/tdt/feed/';
const story = {
  title: { rendered: 'Nuevo canal TDT UHD para comprobar la recepción' },
  link: 'https://www.mundoplus.tv/tv-digital/nuevo-canal-tdt/',
  date_gmt: '2026-11-12T10:00:00'
};
const rss = item => `<rss><channel>${item ? `<item><title>${item.title.rendered}</title><link>${item.link}</link><pubDate>${item.date_gmt}Z</pubDate><description></description></item>` : ''}</channel></rss>`;

function emptySource(url) {
  if (url.endsWith('/feed/') || url.endsWith('/rssnews.php')) return new Response(rss());
  const orbit = /\/news(19\.2E|30W)$/.exec(url)?.[1];
  if (orbit) return new Response(`<h1>Listado (${orbit})</h1>`);
  return new Response('<article class="dnt-card-news"></article>');
}

function untilAborted(signal, onAbort) {
  return new Promise((resolve, reject) => {
    const abort = () => { onAbort(); reject(signal.reason); };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

test('successful RSS does not issue duplicate REST requests', async () => {
  const calls = [];
  const response = await getNewsResponse({ now, includeExcerpts: false, fetchImpl: async url => {
    calls.push(url);
    if (url === mundoRss) return new Response(rss(story));
    if (url === satRss) return new Response(rss({ ...story, link: 'https://satcesc.com/2026/11/12/nuevo-canal-tdt/' }));
    return emptySource(url);
  } });
  const data = JSON.parse(response.body);
  assert.equal(data.items.length, 2);
  assert.deepEqual(data.mundoMissing, []);
  assert.deepEqual(data.satCescMissing, []);
  assert.equal(calls.some(url => url.includes('/wp-json/')), false);
});

test('an expired RSS request is cancelled before its REST fallback succeeds', async () => {
  let rssAborted = false;
  let restCalls = 0;
  const response = await getNewsResponse({ now, includeExcerpts: false, requestTimeoutMs: 15, timeoutMs: 200,
    fetchImpl: async (url, { signal }) => {
      if (url === mundoRss) return untilAborted(signal, () => { rssAborted = true; });
      if (url.startsWith('https://www.mundoplus.tv/wp-json/')) {
        assert.equal(rssAborted, true);
        restCalls++;
        return Response.json([story]);
      }
      return emptySource(url);
    }
  });
  const data = JSON.parse(response.body);
  assert.equal(rssAborted, true);
  assert.equal(restCalls, 1);
  assert.equal(data.items[0].url, story.link);
  assert.deepEqual(data.mundoMissing, []);
  assert.equal(data.backup, undefined);
});

test('the collector has its own deadline, aborts REST and response bodies, and keeps completed news', async () => {
  let apiAborted = false;
  let bodyAborted = false;
  const calls = [];
  const started = performance.now();
  const response = await getNewsResponse({ now, includeExcerpts: false, requestTimeoutMs: 1000, timeoutMs: 30,
    fetchImpl: async (url, { signal }) => {
      calls.push(url);
      if (url === mundoRss) return new Response('', { status: 503 });
      if (url.startsWith('https://www.mundoplus.tv/wp-json/')) {
        return untilAborted(signal, () => { apiAborted = true; });
      }
      if (url === satRss) return {
        ok: true, status: 200,
        text: () => untilAborted(signal, () => { bodyAborted = true; })
      };
      if (url === 'https://www.mundoplus.tv/seccion/tecnologia/feed/') return new Response(rss(story));
      return emptySource(url);
    }
  });
  const data = JSON.parse(response.body);
  assert.equal(apiAborted, true);
  assert.equal(bodyAborted, true);
  assert.equal(data.items[0].url, story.link);
  assert.deepEqual(data.mundoMissing, ['tv-digital']);
  assert.deepEqual(data.satCescMissing, ['tdt']);
  assert.equal(calls.some(url => url.startsWith('https://satcesc.com/wp-json/')), false);
  assert.equal(data.partial, true);
  assert.ok(performance.now() - started < 1000, 'deadline returns without waiting for the longer per-source timeout');
});

test('optional article excerpts share the deadline and cannot extend the legacy endpoint budget', async () => {
  let excerptAborted = false;
  const article = 'https://television.digital.gob.es/atencion-a-la-ciudadania/notas-prensa/prueba-tdt';
  const response = await getNewsResponse({ now, requestTimeoutMs: 1000, timeoutMs: 30,
    fetchImpl: async (url, { signal }) => {
      if (url === 'https://television.digital.gob.es/atencion-a-la-ciudadania/notas-prensa') {
        return new Response('<article class="dnt-card-news"><span class="dnt-date">12/11/2026</span><h2 class="dnt-title"><a href="' + article + '"><span>Aviso de nueva TDT UHD</span></a></h2></article>');
      }
      if (url === article) return {
        ok: true, status: 200,
        text: () => untilAborted(signal, () => { excerptAborted = true; })
      };
      return emptySource(url);
    }
  });
  const data = JSON.parse(response.body);
  assert.equal(excerptAborted, true);
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].url, article);
  assert.equal(data.items[0].paragraphs, undefined);
});

test('public diagnostics distinguish RSS and REST failures without exposing untrusted error details', async () => {
  const secret = 'PRIVATE_SECRET_NEVER_EXPOSE';
  const response = await getNewsResponse({ now, includeExcerpts: false, fetchImpl: async url => {
    if (url === mundoRss) return new Response(secret, { status: 403 });
    if (url.startsWith('https://www.mundoplus.tv/wp-json/')) {
      throw new TypeError('https://user:' + secret + '@private.invalid/?token=' + secret,
        { cause: { code: 'ENOTFOUND', message: secret } });
    }
    if (url === satRss) return new Response('<html>' + secret + '</html>');
    if (url.startsWith('https://satcesc.com/wp-json/')) return Response.json({ privateData: secret });
    if (url === 'https://television.digital.gob.es/atencion-a-la-ciudadania/notas-prensa') {
      const error = new Error(secret, { cause: { code: secret } });
      error.name = secret;
      throw error;
    }
    return emptySource(url);
  } });
  const data = JSON.parse(response.body);
  assert.equal(response.headers['X-Antenas-Zalla-Collector'], 'timeouts-diag-v1');
  assert.equal(data.diagnostics.collector, response.headers['X-Antenas-Zalla-Collector']);
  assert.equal(response.headers['X-Antenas-Zalla-Source-Failures'], '5');
  const failure = (source, stage) => data.diagnostics.failures.find(item => item.source === source && item.stage === stage);
  assert.equal(failure('mundoplus:tv-digital', 'rss').httpStatus, 403);
  assert.equal(failure('mundoplus:tv-digital', 'rest').causeCode, 'ENOTFOUND');
  assert.equal(failure('satcesc:tdt', 'rss').code, 'INVALID_FEED');
  assert.equal(failure('satcesc:tdt', 'rest').code, 'INVALID_JSON');
  assert.equal(failure('television-digital', 'html').name, 'Error');
  assert.equal(failure('television-digital', 'html').causeCode, undefined);
  assert.ok(data.diagnostics.elapsedMs >= 0);
  assert.ok(data.diagnostics.failures.every(item => Number.isFinite(item.elapsedMs) && item.elapsedMs >= 0));
  assert.equal(JSON.stringify(response).includes(secret), false);
  assert.equal(JSON.stringify(response).includes('private.invalid'), false);
  assert.ok(data.diagnostics.failures.every(item => !('message' in item) && !('stack' in item)));
});
