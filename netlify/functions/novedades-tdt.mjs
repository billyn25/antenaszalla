import { SaxesParser } from 'saxes';
import backup from './novedades-tdt-backup.json' with { type: 'json' };

const source = 'https://www.mundoplus.tv';
const sections = ['tv-digital', 'tecnologia'];
const maxAge = 30 * 24 * 60 * 60 * 1000;

const officialSources = [
  { origin: 'https://television.digital.gob.es', path: '/atencion-a-la-ciudadania/notas-prensa', publisher: 'Televisión Digital' },
  { origin: 'https://digital.gob.es', path: '/comunicacion', articlePath: '/comunicacion/notas-prensa/', publisher: 'Ministerio para la Transformación Digital' }
];
const officialMaxAge = 90 * 24 * 60 * 60 * 1000;

function topicFor(title) {
  const text = title.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (/\b(?:tdt[-\s‑–]*sat|satelites?|astra|hispasat|parabolicas?|dvb[-\s‑–]*s2|transpondedores?)\b/.test(text)) {
    return { type: 'Satélite', label: /frecuen|transpondedor/.test(text) ? 'Cambios de frecuencia por satélite' : 'Novedades de recepción por satélite' };
  }
  if (/\b(?:tdt|dvb[-\s‑–]*t2|resintoniz\w*|television digital terrestre)\b/.test(text)) {
    if (/\bradio\b/.test(text)) return null;
    if (/\buhd spain\b/.test(text)) return { type: 'TDT', label: 'Cambios en las emisiones de prueba en UHD' };
    if (/\bfrecuencias?\b/.test(text)) return { type: 'TDT', label: 'Cambios de frecuencias en la TDT' };
    if (/\buhd\b/.test(text) && /\bcalidad\b/.test(text)) return { type: 'UHD', label: 'Calidad de imagen y sonido en los canales UHD' };
    return { type: 'TDT', label: 'Novedades de sintonización y canales TDT' };
  }
  if (/\b(?:lasexta|telecinco|antena 3|la [12]|canales?|senal)\s+uhd\b|\buhd\s+spain\b/.test(text)) {
    return { type: 'UHD', label: /\blasexta\b/.test(text) ? 'Recepción de laSexta en ultra alta definición' : 'Novedades de televisión en ultra alta definición' };
  }
  return null;
}

function parseFeed(xml, now) {
  const parser = new SaxesParser();
  const tags = [];
  const entries = [];
  let item;
  parser.on('opentag', ({ name }) => {
    tags.push(name);
    if (tags.join('/') === 'rss/channel/item') item = { title: '', link: '', pubDate: '' };
  });
  const readText = value => {
    const field = tags.at(-1);
    if (item && tags.length === 4 && Object.hasOwn(item, field)) item[field] += value;
  };
  parser.on('text', readText);
  parser.on('cdata', readText);
  parser.on('closetag', () => {
    if (item && tags.length === 3) {
      entries.push(item);
      item = null;
    }
    tags.pop();
  });
  parser.write(xml).close();
  return entries.flatMap(({ title, link, pubDate }) => {
    const topic = topicFor(title);
    const date = Date.parse(pubDate);
    const url = URL.parse(link.trim());
    if (!topic || !Number.isFinite(date) || date > now || now - date > maxAge ||
      url?.origin !== source || !/^\/(tv-digital|tecnologia)\/[^/]+\/$/.test(url.pathname)) return [];
    return [{ ...topic, url: url.origin + url.pathname, date: new Date(date).toISOString() }];
  });
}

function parseOfficialNews(html, official, now) {
  const articles = [...html.matchAll(/<article\b[^>]*class="[^"]*\bdnt-card-news\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi)];
  if (!articles.length) throw new Error('No se encontraron las tarjetas del portal oficial');
  const entities = { amp: '&', quot: '"', apos: "'", nbsp: ' ', '#34': '"', '#39': "'" };
  return articles.flatMap(([, article]) => {
    const dateParts = article.match(/class="[^"]*\bdnt-date\b[^"]*"[^>]*>\s*(\d{2})\/(\d{2})\/(\d{4})\s*</i);
    const link = article.match(/class="dnt-title"[^>]*>\s*<a\s+href="([^"]+)"[^>]*>\s*<span>([^<]+)<\/span>/i);
    if (!dateParts || !link) return [];
    const [, day, month, year] = dateParts;
    const date = Date.parse(`${year}-${month}-${day}T12:00:00Z`);
    const url = new URL(link[1], official.origin);
    const articlePath = official.articlePath || official.path + '/';
    if (!Number.isFinite(date) || date > now || now - date > officialMaxAge ||
      url.origin !== official.origin || !url.pathname.startsWith(articlePath)) return [];
    const label = link[2].replace(/&(amp|quot|apos|nbsp|#34|#39);/g, (_, key) => entities[key]).replace(/\s+/g, ' ').trim();
    if (/\bRNE\s+Accesible\b/i.test(label)) return [];
    const topic = topicFor(label) || (/\b(?:sintoniz\w*|canales?)\b.*\bUHD\b/i.test(label)
      ? { type: 'UHD', label: 'Novedades de televisión en ultra alta definición' }
      : null);
    if (!topic) return [];
    return [{ type: topic.type, label, noteKey: topic.label, publisher: official.publisher,
      url: url.origin + url.pathname, date: new Date(date).toISOString() }];
  });
}

export async function handler(event) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: { ...headers, Allow: 'GET' }, body: '{}' };
  const now = Date.now();
  const rssRequests = sections.map(async section => {
    const response = await fetch(`${source}/seccion/${section}/feed/`, {
      signal: AbortSignal.timeout(12000),
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'AntenasZallatel/1.0 (+https://antenaszalla.com/blog/)'
      }
    });
    if (!response.ok) throw new Error(`RSS ${section}: HTTP ${response.status}`);
    return parseFeed(await response.text(), now);
  });
  const officialRequests = officialSources.map(async official => {
    const response = await fetch(official.origin + official.path, {
      signal: AbortSignal.timeout(12000),
      headers: { Accept: 'text/html' }
    });
    if (!response.ok) throw new Error(`Portal oficial: HTTP ${response.status}`);
    return parseOfficialNews(await response.text(), official, now);
  });
  const results = await Promise.allSettled([...rssRequests, ...officialRequests]);
  const available = results.filter(result => result.status === 'fulfilled');
  const news = available.flatMap(feed => feed.value);
  if (!news.length && available.length < results.length) {
    const failures = results.filter(result => result.status === 'rejected').map(({ reason }) => {
      const http = /HTTP (\d{3})$/.exec(reason.message)?.[1];
      return http ? `http-${http}` : reason.cause?.code || reason.name;
    });
    console.warn('Fuentes de novedades no disponibles', failures);
    const items = backup.items.filter(item => now - Date.parse(item.date) <= maxAge);
    headers['X-Zallatel-RSS'] = `reserva; ${failures.join(', ')}`;
    headers['Netlify-CDN-Cache-Control'] = 'public, durable, s-maxage=300';
    return { statusCode: items.length ? 200 : 503, headers, body: JSON.stringify({ items, backup: true }) };
  }
  const officialNews = news.some(item => item.publisher);
  const rssNews = news.some(item => !item.publisher);
  headers['X-Zallatel-RSS'] = officialNews ? (rssNews ? 'mixto' : 'oficial') : 'directo';

  const unique = new Map(news.map(item => [item.url, item]));
  const items = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url)).slice(0, 5);
  headers['Netlify-CDN-Cache-Control'] = officialNews || available.length === results.length
    ? 'public, durable, s-maxage=10800, stale-while-revalidate=3600'
    : 'public, durable, s-maxage=300';
  return { statusCode: 200, headers, body: JSON.stringify({ items }) };
}
