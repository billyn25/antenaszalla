import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseNews, renderBlogHtml } from '../src/blog-render.mjs';
import { createBlogHandler, createNewsLoader } from '../netlify/functions/blog.mjs';
import { getNewsResponse } from '../netlify/functions/novedades-tdt.mjs';

const now = Date.parse('2026-11-13T08:00:00Z');
const shell = '<!doctype html><html lang="es"><head><title>Blog</title><meta name="robots" content="index,follow"><meta name="description" content="Noticias"><link rel="canonical" href="https://antenaszalla.com/blog/"></head><body><h1>Noticias</h1><!-- BLOG_CONTENT_START --><!-- BLOG_CONTENT_END --><section id="antes-de-resintonizar">Guía</section></body></html>';
const item = index => ({ type: 'TDT', label: `Noticia ${index}`, url: `https://www.mundoplus.tv/tv-digital/noticia-${index}/`, publisher: 'Mundoplus', date: `2026-11-${String(12 - Math.floor(index / 10)).padStart(2, '0')}T12:00:00Z` });
const data = { items: Array.from({ length: 32 }, (_, index) => item(index)), satelliteChanges: [] };
const handler = () => createBlogHandler({ template: () => shell, towns: () => [], news: async () => data, now: () => now });

test('server delivers headlines and crawlable pagination without client rendering', async () => {
  const response = await handler()(new Request('https://antenaszalla.com/blog/'));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<h3><a href="https:\/\/www\.mundoplus\.tv/);
  assert.match(html, /rel="next" href="\/blog\/pagina\/2\/"/);
  assert.doesNotMatch(html, /Cargando noticias|news\.js|<button/);
  assert.equal((html.match(/class="news-original"/g) || []).length, 15);
  assert.match(response.headers.get('netlify-cdn-cache-control'), /durable/);
});

test('continuation pages have their own canonical and navigate both directions', async () => {
  const response = await handler()(new Request('https://antenaszalla.com/blog/pagina/2/'));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /rel="canonical" href="https:\/\/antenaszalla\.com\/blog\/pagina\/2\/"/);
  assert.match(html, /property="og:url" content="https:\/\/antenaszalla\.com\/blog\/pagina\/2\/"/);
  assert.match(html, /rel="prev" href="\/blog\/"/);
  assert.match(html, /rel="next" href="\/blog\/pagina\/3\/"/);
  assert.match(html, /<h1>[^<]*página 2<\/h1>/i);
  const schema = JSON.parse(html.match(/id="blog-structured-data">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema['@graph'][0].url, 'https://antenaszalla.com/blog/pagina/2/');
  const organization = schema['@graph'].find(entity => entity['@type'] === 'Organization');
  assert.equal(organization.name, 'Antenas Zalla');
  assert.equal(organization.address.addressLocality, 'Zalla');
  assert.match(organization.logo.url, /logo-antenas-zalla\.svg$/);
});

test('invalid and out-of-range pages return real 404 and page one canonicalizes', async () => {
  for (const path of ['/blog/pagina/0/', '/blog/pagina/999/', '/blog/pagina/02/', '/blog/pagina/a/', '/blog/pagina/2/extra']) {
    const response = await handler()(new Request('https://antenaszalla.com' + path));
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
  }
  const response = await handler()(new Request('https://antenaszalla.com/blog/pagina/1/'));
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://antenaszalla.com/blog/');
});

test('untrusted source fields cannot inject markup, external fetching targets or future stories', () => {
  const dirty = { items: [
    { ...item(1), label: '</h3><script>alert(1)</script>', paragraphs: ['<img src=x onerror=alert(1)>'] },
    { ...item(2), url: 'javascript:alert(1)' },
    { ...item(3), url: 'https://www.mundoplus.tv@evil.example/story' },
    { ...item(4), url: 'https://169.254.169.254/latest/meta-data/' },
    { ...item(5), date: '2099-01-01T00:00:00Z' },
    { ...item(6), date: 'not-a-date' }
  ] };
  const clean = normaliseNews(dirty, now);
  assert.equal(clean.items.length, 1);
  const html = renderBlogHtml(shell, dirty, { now, towns: [{ name: 'Injected', route: '//evil.example/' }, { name: 'Aranda de Duero', route: '/antenas-burgos/aranda_duero' }] });
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert|<img src=x|href="\/\/evil/);
  assert.match(html, /href="\/antenas-burgos\/aranda_duero"/);
});

test('syndicated headlines require the exact Google article URL and closed attribution fields', () => {
  const valid = { ...item(1), url: 'https://news.google.com/rss/articles/CBMi_Test-123?oc=5', publisher: 'Mundoplus', via: 'Google Noticias' };
  const invalid = [
    { url: 'http://news.google.com/rss/articles/CBMi_Test-123' },
    { url: 'https://news.google.com.evil.example/rss/articles/CBMi_Test-123' },
    { url: 'https://news.google.com@evil.example/rss/articles/CBMi_Test-123' },
    { url: 'https://user:password@news.google.com/rss/articles/CBMi_Test-123' },
    { url: 'https://news.google.com:8443/rss/articles/CBMi_Test-123' },
    { url: 'https://news.google.com/articles/CBMi_Test-123' },
    { url: 'https://news.google.com/rss/articles/CBMi_Test-123/extra' },
    { url: 'https://news.google.com/rss/articles/%3Cscript%3E' },
    { url: 'https://news.google.com/rss/articles/CBMi_Test-123?url=https://evil.example/' },
    { url: 'https://news.google.com/rss/articles/CBMi_Test-123?oc=5&oc=6' },
    { url: 'https://news.google.com/rss/articles/CBMi_Test-123?oc=abc' },
    { url: 'https://news.google.com/rss/articles/CBMi_Test-123#fragment' },
    { publisher: undefined },
    { publisher: 'Otro medio' },
    { publisher: '<script>alert(1)</script>' },
    { via: undefined },
    { via: 'Enlace directo verificado' },
    { via: '<script>alert(1)</script>' }
  ];
  for (const change of invalid) {
    assert.equal(normaliseNews({ items: [{ ...valid, ...change }] }, now).items.length, 0, JSON.stringify(change));
  }
  const clean = normaliseNews({ items: [valid, { ...valid, label: 'Otro aviso', publisher: 'SatCesc', url: 'https://news.google.com/rss/articles/CBMi_Other456' }] }, now);
  assert.equal(clean.items.length, 2);
  assert.ok(clean.items.every(entry => entry.via === 'Google Noticias'));
});

test('syndicated attribution survives durable storage and is explicit in server-rendered HTML', async () => {
  const google = { ...item(1), label: 'Aviso sindicado de Mundoplus', url: 'https://news.google.com/rss/articles/CBMi_Mundo123?oc=5', publisher: 'Mundoplus', via: 'Google Noticias' };
  const satellite = { ...google, label: 'Aviso sindicado de SatCesc', url: 'https://news.google.com/rss/articles/CBMi_Sat456', publisher: 'SatCesc' };
  let saved;
  const store = { read: async () => saved ?? null, write: async value => { saved = structuredClone(value); } };
  const load = createNewsLoader({ store, now: () => now,
    collect: async () => ({ statusCode: 200, body: JSON.stringify({ items: [google, satellite, item(2)] }) }) });
  await load();
  const persisted = saved.data.items.find(entry => entry.url === google.url);
  assert.equal(persisted.publisher, 'Mundoplus');
  assert.equal(persisted.via, 'Google Noticias');
  assert.equal(persisted.date, '2026-11-12T12:00:00.000Z');
  const cold = createNewsLoader({ store, now: () => now,
    collect: async () => { throw new Error('Fresh durable data should be reused'); } });
  const handle = createBlogHandler({ template: () => shell, towns: () => [], news: cold, now: () => now });
  const response = await handle(new Request('https://antenaszalla.com/blog/'));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Fuente: Mundoplus · vía Google Noticias/);
  assert.match(html, /Fuente: SatCesc · vía Google Noticias/);
  assert.match(html, /Fuente: Mundoplus<\/p>/);
  assert.ok(html.includes(`<h3><a href="${google.url}">${google.label}</a></h3>`));
  assert.ok(html.includes(`<a class="news-original" href="${google.url}">Ver noticia en Google Noticias</a>`));
  const googleCards = [...html.matchAll(/<article>([\s\S]*?)<\/article>/g)].map(match => match[1]).filter(card => card.includes('news.google.com/rss/articles/'));
  assert.equal(googleCards.length, 2);
  assert.ok(googleCards.every(card => !card.includes('Leer la publicación original')));
  assert.match(html, /Cada tarjeta indica la fecha, el medio y el enlace de consulta/);
  assert.doesNotMatch(html, /news\.js|Cargando noticias/);
});

test('runtime keeps trusted identity entities and limits copied source text', () => {
  const identity = { '@graph': [
    { '@type': 'Organization', '@id': 'https://antenaszalla.com/#organizacion', name: 'Antenas Zalla', logo: { url: '/verified-logo.svg' }, address: { addressLocality: 'Zalla' } },
    { '@type': 'WebSite', '@id': 'https://antenaszalla.com/#website', name: 'Antenas Zalla', inLanguage: 'es' }
  ] };
  const template = shell.replace('</head>', `<script type="application/ld+json" id="blog-structured-data">${JSON.stringify(identity)}</script></head>`);
  const longHeadline = Array.from({ length: 40 }, (_, index) => `Palabra${index}`).join(' ');
  const html = renderBlogHtml(template, { items: [{ ...item(1), label: longHeadline, paragraphs: ['Texto completo de un tercero que no debe reproducirse.'] }] }, { now });
  const graph = JSON.parse(html.match(/id="blog-structured-data">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.deepEqual(graph.find(entity => entity['@type'] === 'Organization'), identity['@graph'][0]);
  assert.deepEqual(graph.find(entity => entity['@type'] === 'WebSite'), identity['@graph'][1]);
  assert.match(html, /Palabra24…/);
  assert.doesNotMatch(html, /Palabra25|Texto completo de un tercero/);
});

test('source failure serves dated reserve content and cached requests do not refetch', async () => {
  let calls = 0;
  const loader = createNewsLoader({ collect: async () => { calls++; throw new Error('offline'); }, now: () => now, reserve: { items: [item(1)] }, store: null });
  const handle = createBlogHandler({ template: () => shell, towns: () => [], news: loader, now: () => now });
  const response = await handle(new Request('https://antenaszalla.com/blog/'));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-antenas-zalla-news'), 'reserva');
  assert.match(html, /datetime="2026-11-12T12:00:00.000Z"/);
  assert.match(html, /fechas originales se conservan/);
  await handle(new Request('https://antenaszalla.com/blog/'));
  assert.equal(calls, 1);
});

test('a slow source retains verified reserve entries without replacing live headlines or dates', async () => {
  const live = { ...item(1), label: 'Titular original de la fuente' };
  const loader = createNewsLoader({
    now: () => now,
    store: null,
    reserve: { items: [item(1), item(2), { ...item(3), date: '2025-01-01T00:00:00Z' }] },
    collect: async () => ({ statusCode: 200, body: JSON.stringify({ items: [live], partial: true }) })
  });
  const mixed = await loader();
  assert.equal(mixed.items.length, 2);
  assert.equal(mixed.partialBackup, true);
  assert.equal(mixed.items.find(entry => entry.url === live.url).label, live.label);
  assert.equal(mixed.items.find(entry => entry.url === item(2).url).date, '2026-11-12T12:00:00.000Z');
  const handle = createBlogHandler({ template: () => shell, towns: () => [], news: loader, now: () => now });
  const response = await handle(new Request('https://antenaszalla.com/blog/'));
  assert.equal(response.headers.get('x-antenas-zalla-news'), 'mixta');
  assert.match(await response.text(), /publicaciones guardadas, que conservan su fecha/);
});

test('RSS collection keeps the source headline instead of replacing it with a generic topic', async () => {
  const headline = 'Prueba TDT: nuevo canal UHD con fecha de estreno';
  const rss = `<rss><channel><item><title>${headline}</title><link>https://www.mundoplus.tv/tv-digital/prueba-tdt/</link><pubDate>Thu, 12 Nov 2026 12:00:00 GMT</pubDate><description>Texto de prueba.</description></item></channel></rss>`;
  const result = await getNewsResponse({ now, fetchImpl: async url =>
    url === 'https://www.mundoplus.tv/seccion/tv-digital/feed/'
      ? new Response(rss, { headers: { 'Content-Type': 'application/rss+xml' } })
      : new Response('', { status: 503 })
  });
  const data = JSON.parse(result.body);
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].label, headline);
  assert.equal(data.items[0].publisher, 'Mundoplus');
  assert.equal(data.items[0].date, '2026-11-12T12:00:00.000Z');
  assert.equal(data.partial, true);
});

test('shared collector obeys an aborted budget and never fetches caller-controlled URLs', async () => {
  const urls = [];
  const result = await getNewsResponse({ now, signal: AbortSignal.abort(), fetchImpl: async (url, options) => {
    urls.push(url);
    assert.equal(options.signal.aborted, true);
    throw new DOMException('Aborted', 'AbortError');
  } });
  assert.ok([200, 503].includes(result.statusCode));
  assert.ok(urls.every(url => /^https:\/\/(?:www\.mundoplus\.tv|es\.kingofsat\.tv|www\.ses\.com|satcesc\.com|www\.uhdspain\.com|television\.digital\.gob\.es|digital\.gob\.es)\//.test(url)));
  assert.ok(JSON.parse(result.body).backup);
});

test('HEAD is bodyless and unsupported methods do not collect news', async () => {
  let calls = 0;
  const handle = createBlogHandler({ template: () => shell, towns: () => [], news: async () => { calls++; return data; }, now: () => now });
  const denied = await handle(new Request('https://antenaszalla.com/blog/', { method: 'POST' }));
  assert.equal(denied.status, 405);
  assert.equal(calls, 0);
  const impossible = await handle(new Request('https://antenaszalla.com/blog/pagina/999/'));
  assert.equal(impossible.status, 404);
  assert.equal(calls, 0);
  const response = await handle(new Request('https://antenaszalla.com/blog/', { method: 'HEAD' }));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});
