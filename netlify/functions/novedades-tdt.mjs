import { SaxesParser } from 'saxes';

const source = 'https://www.mundoplus.tv';
const sections = ['tv-digital', 'tecnologia'];
const maxAge = 30 * 24 * 60 * 60 * 1000;

function topicFor(title) {
  const text = title.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (/\b(?:tdt[-\s‑–]*sat|satelites?|astra|hispasat|parabolicas?|dvb[-\s‑–]*s2|transpondedores?)\b/.test(text)) {
    return { type: 'Satélite', label: /frecuen|transpondedor/.test(text) ? 'Cambios de frecuencia por satélite' : 'Novedades de recepción por satélite' };
  }
  if (/\b(?:tdt|dvb[-\s‑–]*t2|resintoniz\w*|television digital terrestre)\b/.test(text)) {
    if (/\bradio\b/.test(text)) return { type: 'TDT', label: 'Nuevos servicios de radio en la TDT' };
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

export async function handler(event) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: { ...headers, Allow: 'GET' }, body: '{}' };
  const now = Date.now();
  const results = await Promise.allSettled(sections.map(async section => {
    const response = await fetch(`${source}/seccion/${section}/feed/`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`RSS ${section}: HTTP ${response.status}`);
    return parseFeed(await response.text(), now);
  }));
  const feeds = results.filter(result => result.status === 'fulfilled');
  if (!feeds.length) return { statusCode: 503, headers, body: '{"items":[]}' };

  const unique = new Map(feeds.flatMap(feed => feed.value).map(item => [item.url, item]));
  const items = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url)).slice(0, 5);
  headers['Netlify-CDN-Cache-Control'] = feeds.length === sections.length
    ? 'public, durable, s-maxage=10800, stale-while-revalidate=3600'
    : 'public, durable, s-maxage=300';
  return { statusCode: 200, headers, body: JSON.stringify({ items }) };
}
