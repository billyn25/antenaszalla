import test from 'node:test';
import assert from 'node:assert/strict';
import { getNewsResponse } from '../netlify/functions/novedades-tdt.mjs';
import { GOOGLE_NEWS_RSS_URL, fetchSyndicatedNews, parseSyndicatedNews } from '../netlify/lib/news-syndication.mjs';
import { selectNews } from '../src/news-sources.mjs';

const now = Date.parse('2026-11-13T10:00:00Z');
const mundo = { title: 'Antena 3 UHD presenta cambios en la TDT - Mundoplus.tv',
  link: 'https://news.google.com/rss/articles/CBMiMundo123?oc=5', date: 'Thu, 12 Nov 2026 07:00:26 GMT',
  source: 'Mundoplus.tv', sourceUrl: 'https://www.mundoplus.tv' };
const sat = { title: 'Daystar cambia de frecuencia en Astra 1P - SatCesc.com',
  link: 'https://news.google.com/rss/articles/CBMiSat123?oc=5', date: 'Wed, 11 Nov 2026 09:00:00 GMT',
  source: 'SatCesc.com', sourceUrl: 'https://satcesc.com' };
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const rss = entries => '<rss><channel>' + entries.map(item => `<item><title>${escape(item.title)}</title><link>${escape(item.link)}</link><pubDate>${escape(item.date)}</pubDate><source url="${escape(item.sourceUrl)}">${escape(item.source)}</source><description><![CDATA[ARTICLE_BODY_MUST_NOT_BE_COPIED]]></description></item>`).join('') + '</channel></rss>';
function emptySource(url) {
  if (url.endsWith('/feed/') || url.endsWith('/rssnews.php')) return new Response(rss([]));
  const orbit = /\/news(19\.2E|30W)$/.exec(url)?.[1];
  if (orbit) return new Response(`<h1>Listado (${orbit})</h1>`);
  return new Response('<article class="dnt-card-news"></article>');
}

test('syndicated metadata preserves publisher, date and Google link without copying article bodies', async () => {
  const calls = [];
  const items = await fetchSyndicatedNews({ now, fetchImpl: async url => {
    calls.push(url);
    return new Response(rss([mundo, sat]));
  } });
  assert.deepEqual(calls, [GOOGLE_NEWS_RSS_URL]);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { type: 'TDT', label: 'Antena 3 UHD presenta cambios en la TDT', url: mundo.link,
    date: '2026-11-12T07:00:26.000Z', publisher: 'Mundoplus', via: 'Google Noticias' });
  assert.equal(items[1].type, 'Satélite');
  assert.equal(items[1].publisher, 'SatCesc');
  assert.equal(JSON.stringify(items).includes('ARTICLE_BODY'), false);
});

test('syndication rejects spoofed sources, unsafe links, invalid dates and unrelated headlines', () => {
  const invalid = [
    { sourceUrl: 'https://www.mundoplus.tv.evil.invalid' },
    { sourceUrl: 'https://www.mundoplus.tv/tv-digital/' },
    { sourceUrl: 'https://secret@www.mundoplus.tv' },
    { sourceUrl: 'http://www.mundoplus.tv' },
    { source: 'A different publisher' },
    { link: 'https://news.google.com.evil.invalid/rss/articles/CBMiMundo123' },
    { link: 'https://secret@news.google.com/rss/articles/CBMiMundo123' },
    { link: 'https://news.google.com:8443/rss/articles/CBMiMundo123' },
    { link: 'https://news.google.com/articles/CBMiMundo123' },
    { link: 'https://news.google.com/rss/articles/CBMiMundo123/extra' },
    { link: 'https://news.google.com/rss/articles/CBMiMundo123?continue=https://evil.invalid' },
    { link: 'https://news.google.com/rss/articles/CBMiMundo123?oc=5&oc=6' },
    { link: 'https://news.google.com/rss/articles/CBMiMundo123#fragment' },
    { link: 'javascript:alert(1)' },
    { date: 'not a date' },
    { date: 'Thu, 12 Nov 2099 07:00:26 GMT' },
    { date: 'Wed, 12 Nov 2025 07:00:26 GMT' },
    { title: 'Una nueva serie de Netflix - Mundoplus.tv' }
  ].map(change => ({ ...mundo, ...change }));
  invalid.push({ ...sat, title: 'Movistar Plus aumenta su número de abonados - SatCesc.com' });
  invalid.push({ ...sat, title: 'Dos nuevos canales deportivos llegan al satélite Badr 8 - SatCesc.com' });
  invalid.push({ ...sat, title: 'Un nuevo canal de películas llega a una plataforma - SatCesc.com' });
  assert.deepEqual(parseSyndicatedNews(rss(invalid), now), []);
});

test('matching direct publications win over syndicated copies in either input order', () => {
  const [syndicated] = parseSyndicatedNews(rss([mundo]), now);
  const direct = { ...syndicated, url: 'https://www.mundoplus.tv/tv-digital/cambios-tdt/' };
  delete direct.via;
  for (const entries of [[direct, syndicated], [syndicated, direct]]) {
    const selected = selectNews(entries);
    assert.equal(selected.length, 1);
    assert.equal(selected[0].url, direct.url);
    assert.equal(selected[0].via, undefined);
  }
  assert.equal(selectNews([direct, { ...syndicated, publisher: 'SatCesc' }]).length, 2);
  const laterMetadata = { ...syndicated, date: '2026-11-12T07:01:26.000Z' };
  assert.deepEqual(selectNews([laterMetadata, direct]), [direct]);
  assert.equal(selectNews([direct, { ...direct, url: direct.url + 'otra-noticia/' }]).length, 2);
  assert.equal(selectNews([direct, { ...syndicated, date: '2026-11-11T07:00:26.000Z' }]).length, 2);
});

test('one metadata request recovers both publishers after direct 403 responses and keeps direct diagnostics', async () => {
  const calls = [];
  const response = await getNewsResponse({ now, includeExcerpts: false, fetchImpl: async url => {
    calls.push(url);
    if (/^https:\/\/(?:www\.mundoplus\.tv|satcesc\.com)\//.test(url)) return new Response('', { status: 403 });
    if (url === GOOGLE_NEWS_RSS_URL) return new Response(rss([mundo, sat]));
    return emptySource(url);
  } });
  const data = JSON.parse(response.body);
  assert.equal(calls.filter(url => url === GOOGLE_NEWS_RSS_URL).length, 1);
  assert.equal(calls.some(url => url.includes('/rss/articles/')), false);
  assert.equal(data.items.length, 2);
  assert.ok(data.items.every(item => item.via === 'Google Noticias'));
  assert.deepEqual(data.syndicatedSources, ['Mundoplus', 'SatCesc']);
  assert.deepEqual(data.mundoMissing, ['tv-digital', 'tecnologia']);
  assert.deepEqual(data.satCescMissing, ['tdt', 'transpondedores', 'movistar-tv']);
  assert.equal(data.diagnostics.failures.length, 10);
  assert.ok(data.diagnostics.failures.every(item => item.httpStatus === 403));
  assert.equal(data.partial, true);
  assert.equal(data.backup, undefined);
});

test('syndication only supplements publishers with unavailable direct sections', async () => {
  const response = await getNewsResponse({ now, includeExcerpts: false, fetchImpl: async url => {
    if (url.startsWith('https://www.mundoplus.tv/')) return new Response('', { status: 403 });
    if (url === GOOGLE_NEWS_RSS_URL) return new Response(rss([mundo, sat]));
    return emptySource(url);
  } });
  const data = JSON.parse(response.body);
  assert.deepEqual(data.syndicatedSources, ['Mundoplus']);
  assert.equal(data.items.length, 1);
  assert.deepEqual(data.satCescMissing, []);
});

test('metadata fallback is cancelled by the existing global collection budget', async () => {
  let googleAborted = false;
  const started = performance.now();
  const response = await getNewsResponse({ now, includeExcerpts: false, requestTimeoutMs: 1000, timeoutMs: 30,
    fetchImpl: async (url, { signal }) => {
      if (url.startsWith('https://www.mundoplus.tv/')) return new Response('', { status: 403 });
      if (url === GOOGLE_NEWS_RSS_URL) return new Promise((resolve, reject) => {
        const abort = () => { googleAborted = true; reject(signal.reason); };
        if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
      });
      return emptySource(url);
    }
  });
  const data = JSON.parse(response.body);
  assert.equal(googleAborted, true);
  assert.ok(performance.now() - started < 1000);
  assert.deepEqual(data.syndicatedSources, []);
  assert.equal(data.diagnostics.failures.find(item => item.source === 'google-news').name, 'TimeoutError');
  assert.equal(data.backup, true);
});
