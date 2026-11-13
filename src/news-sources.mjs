export const satCesc = 'https://satcesc.com';
const mundoPlus = 'https://www.mundoplus.tv';
export const mundoCategories = { 'tv-digital': 40, tecnologia: 6042 };
export const satCescCategories = { tdt: 13, transpondedores: 6, 'movistar-tv': 5962 };
export const newsMaxAge = 90 * 24 * 60 * 60 * 1000;
export const pageSize = 15;
export const maxNews = 45;
export const NEWS_REQUEST_TIMEOUT_MS = 18000;

const htmlEntities = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>' };
export function textFromHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&(amp|quot|apos|nbsp|lt|gt|#\d+|#x[0-9a-f]+);/gi, (entity, key) => {
    if (!key.startsWith('#')) return htmlEntities[key.toLowerCase()] || entity;
    const number = key[1].toLowerCase() === 'x' ? Number.parseInt(key.slice(2), 16) : Number(key.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity;
  }).replace(/\s+/g, ' ').trim();
}

export function briefExcerpt(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 8) return {};
  return {
    paragraphs: [words.length > 25 ? words.slice(0, 25).join(' ') + '…' : text],
    excerptType: 'Extracto breve de la publicación'
  };
}

export function topicFor(title) {
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

function satCescTopic(title, section) {
  const headline = title.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (/\b(?:audiencia|audiencias|arrasa|aniversario|como ver|donde ver|por television en directo)\b/.test(headline)) return null;
  if (section === 'movistar-tv') {
    const change = /\b(?:llega|llegada|regreso|vuelve|nuevo|nueva|nuevos|nuevas|cambia\w*|incorpora\w*|elimina\w*|renueva\w*|reorganiza\w*|integra\w*|retira\w*|recupera\w*|desaparece\w*|estrena\w*|lanza\w*|arranca\w*|cesa\w*|deja de emitir)\b/.test(headline);
    return change && /\b(?:canal(?:es)?|dial|parrilla|paquetes?)\b/.test(headline) ? 'Movistar Plus+' : null;
  }
  if (section === 'transpondedores') {
    const change = /\b(?:frecuencias?|transpondedores?|incorpora\w*|altas?|bajas?|deja de emitir|cesa\w*|desaparece\w*|abandona\w*|nuev[oa]s? canales?|emite en abierto)\b/.test(headline);
    return change && /\b(?:astra|hispasat)\b/.test(headline) ? 'Satélite' : null;
  }
  const reception = /\b(?:sintoniz\w*|resintoniz\w*|frecuencias?|dvb[\s‑–-]*t2|uhd|4k|cambios?)\b/.test(headline);
  const launch = /\b(?:canal(?:es)?|la septima)\b/.test(headline) && /\b(?:nace|nacido|llega|estrena|nuevo|nuevos|nuevas|comienza|arranca)\b/.test(headline);
  if ((reception && /\b(?:tdt|television digital terrestre|frecuencias?|dvb[\s‑–-]*t2)\b/.test(headline)) || launch) return 'TDT';
  return null;
}

export function parseSatCesc(entries, section, now) {
  return entries.flatMap(({ title, link, pubDate, description }) => {
    const label = textFromHtml(title);
    const type = satCescTopic(label, section);
    const date = Date.parse(pubDate);
    let url;
    try { url = new URL(link.trim()); } catch { return []; }
    if (!type || !Number.isFinite(date) || date > now || now - date > newsMaxAge ||
      url?.origin !== satCesc || !/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/.test(url.pathname)) return [];
    const lead = description.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
    return [{ type, label, publisher: 'SatCesc', url: url.origin + url.pathname, date: new Date(date).toISOString(),
      ...briefExcerpt(textFromHtml(lead).replace(/\[\s*…\s*\]$/, '…')) }];
  });
}

async function fetchWordPressPosts(origin, category, query, timeout, fetcher = fetch) {
  const response = await fetcher(origin + '/wp-json/wp/v2/posts?categories=' + category + '&' + query, {
    signal: AbortSignal.timeout(timeout), headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(origin + ': HTTP ' + response.status);
  const posts = await response.json();
  if (!Array.isArray(posts)) throw new Error(origin + ': respuesta sin artículos');
  return posts.map(post => ({ title: post.title?.rendered || '', link: post.link || '',
    pubDate: post.date_gmt ? post.date_gmt + 'Z' : '', description: post.excerpt?.rendered || '' }));
}

export async function fetchSatCescPosts(section, now, timeout = NEWS_REQUEST_TIMEOUT_MS, fetcher = fetch) {
  const entries = await fetchWordPressPosts(satCesc, satCescCategories[section], 'per_page=26&_fields=date_gmt,link,title,excerpt', timeout, fetcher);
  return parseSatCesc(entries, section, now);
}

export async function fetchMundoPosts(section, now, timeout = NEWS_REQUEST_TIMEOUT_MS, fetcher = fetch) {
  const entries = await fetchWordPressPosts(mundoPlus, mundoCategories[section], 'per_page=10&_fields=date_gmt,link,title', timeout, fetcher);
  return entries.flatMap(({ title, link, pubDate }) => {
    const label = textFromHtml(title);
    const topic = topicFor(label);
    const date = Date.parse(pubDate);
    let url;
    try { url = new URL(link); } catch { return []; }
    if (!topic || !Number.isFinite(date) || date > now || now - date > newsMaxAge ||
      url.origin !== mundoPlus || !/^\/(?:tv-digital|tecnologia)\/[^/]+\/$/.test(url.pathname)) return [];
    return [{ type: topic.type, label, publisher: 'Mundoplus', url: url.origin + url.pathname, date: new Date(date).toISOString() }];
  });
}

export function selectNews(news) {
  const unique = new Map(news.map(item => [item.url, item]));
  const ordered = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url));
  const latest = ordered.slice(0, maxNews);
  const satellite = ordered.find(item => item.type === 'Satélite');
  if (satellite && !latest.slice(0, pageSize).some(item => item.type === 'Satélite')) {
    const previous = latest.indexOf(satellite);
    if (previous >= 0) latest.splice(previous, 1);
    latest.splice(pageSize - 1, 0, satellite);
    if (latest.length > maxNews) latest.pop();
  }
  return latest;
}
