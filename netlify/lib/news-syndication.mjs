import { SaxesParser } from 'saxes';
import { NEWS_REQUEST_TIMEOUT_MS, newsMaxAge, satCescTopic, textFromHtml, topicFor } from '../../src/news-sources.mjs';

// Publicly syndicated metadata only. Article links are retained, never resolved
// or fetched here; the original publishers remain explicit in every item.
const query = '(site:mundoplus.tv/tv-digital/ OR site:mundoplus.tv/tecnologia/ OR site:satcesc.com) (TDT OR UHD OR Astra OR "cambios de canales") when:14d';
export const GOOGLE_NEWS_RSS_URL = 'https://news.google.com/rss/search?' + new URLSearchParams({ q: query, hl: 'es', gl: 'ES', ceid: 'ES:es' });
const publishers = new Map([
  ['https://www.mundoplus.tv', { publisher: 'Mundoplus', sourceName: 'Mundoplus.tv' }],
  ['https://satcesc.com', { publisher: 'SatCesc', sourceName: 'SatCesc.com' }]
]);

function readEntries(xml) {
  if (!/<rss\b/i.test(xml)) throw Object.assign(new Error('Invalid syndication feed'), { code: 'INVALID_FEED' });
  const parser = new SaxesParser();
  const tags = [];
  const entries = [];
  let item;
  parser.on('opentag', ({ name, attributes }) => {
    tags.push(name);
    if (tags.join('/') === 'rss/channel/item') item = { title: '', link: '', pubDate: '', source: '', sourceUrl: '' };
    if (item && tags.length === 4 && name === 'source') item.sourceUrl = attributes.url || '';
  });
  const append = value => {
    const field = tags.at(-1);
    if (item && tags.length === 4 && ['title', 'link', 'pubDate', 'source'].includes(field)) item[field] += value;
  };
  parser.on('text', append);
  parser.on('cdata', append);
  parser.on('closetag', () => {
    if (item && tags.length === 3) { entries.push(item); item = null; }
    tags.pop();
  });
  try { parser.write(xml).close(); }
  catch (error) { error.code = 'INVALID_FEED'; throw error; }
  return entries;
}

export function parseSyndicatedNews(xml, now = Date.now()) {
  return readEntries(xml).flatMap(entry => {
    let source, link;
    try { source = new URL(entry.sourceUrl); link = new URL(entry.link.trim()); }
    catch { return []; }
    const medium = publishers.get(source.origin);
    if (!medium || source.username || source.password || source.pathname !== '/' || source.search || source.hash ||
      textFromHtml(entry.source).toLowerCase() !== medium.sourceName.toLowerCase() ||
      link.origin !== 'https://news.google.com' || link.username || link.password || link.hash ||
      !/^\/rss\/articles\/[A-Za-z0-9_-]+$/.test(link.pathname)) return [];
    const parameters = [...link.searchParams];
    if (parameters.length > 1 || parameters.some(([name, value]) => name !== 'oc' || !/^\d+$/.test(value))) return [];
    const date = Date.parse(entry.pubDate);
    if (!Number.isFinite(date) || date > now || now - date > newsMaxAge) return [];
    const title = textFromHtml(entry.title);
    const suffix = ' - ' + medium.sourceName;
    const label = title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
    const headline = label.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const section = /\bmovistar\b/.test(headline) ? 'movistar-tv'
      : /\b(?:satelites?|astra|hispasat|transpondedores?)\b/.test(headline) ? 'transpondedores'
      : /\b(?:tdt|television digital terrestre|dvb[\s‑–-]*t2|la septima)\b/.test(headline) ? 'tdt' : null;
    const type = medium.publisher === 'Mundoplus' ? topicFor(label)?.type : section && satCescTopic(label, section);
    if (!type) return [];
    return [{ type, label, url: link.href, date: new Date(date).toISOString(), publisher: medium.publisher, via: 'Google Noticias' }];
  });
}

export async function fetchSyndicatedNews({ now = Date.now(), signal, timeoutMs = NEWS_REQUEST_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const requestTimeout = AbortSignal.timeout(Math.min(timeoutMs, NEWS_REQUEST_TIMEOUT_MS));
  const requestSignal = signal ? AbortSignal.any([signal, requestTimeout]) : requestTimeout;
  requestSignal.throwIfAborted();
  const response = await fetchImpl(GOOGLE_NEWS_RSS_URL, {
    signal: requestSignal, headers: { Accept: 'application/rss+xml, application/xml, text/xml' }
  });
  if (!response.ok) throw new Error('Google Noticias: HTTP ' + response.status);
  return parseSyndicatedNews(await response.text(), now);
}
