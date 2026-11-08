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

const verifiedSummaries = {
  'resintoniza-dkiss-el-5-de-noviembre': 'El aviso de DKISS fija el cambio para el 5 de noviembre de 2026. Quienes reciban el canal por antena pueden actualizar su listado con una búsqueda de canales desde las 08:00. La publicación distingue la recepción por TDT de otras plataformas, en las que el espectador no necesita hacer esa búsqueda.',
  'uhd-spain-lanza-un-video-divulgativo-para-acercar-la-ultra-alta-': 'UHD Spain ha publicado un vídeo divulgativo sobre la diferencia entre resolución, rango dinámico, gama de color y sonido. La noticia también sitúa la iniciativa en el contexto de la primera fase del paso a DVB‑T2, con el múltiple estatal RGE2 como punto de partida para ampliar las emisiones en UHD.',
  'guia-facil-para-la-resintonizacion-de-la-tdt--todos-los-cambios-': 'La guía reúne los cambios de la TDT del 3 y 5 de noviembre. Explica la reordenación de canales y el inicio de emisiones UHD en DVB‑T2, y detalla cuándo conviene actualizar la lista de canales. El enlace lleva al calendario completo, con los cambios separados por fecha.',
  'la-nueva-tdt-en-dvb-t2---que-hacer-si-el-dia-5-de-noviembre-no-p': 'La publicación explica que la transición empieza en el múltiple RGE2. Algunos centros de extensión de cobertura pueden necesitar más tiempo para adaptarse. Si un canal UHD no aparece tras la búsqueda, la noticia distingue varias causas posibles, entre ellas la instalación de recepción y que el centro emisor todavía no distribuya ese múltiple.'
};

const htmlEntities = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>' };
function textFromHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&(amp|quot|apos|nbsp|lt|gt|#\d+|#x[0-9a-f]+);/gi, (entity, key) => {
    if (!key.startsWith('#')) return htmlEntities[key.toLowerCase()] || entity;
    const number = key[1].toLowerCase() === 'x' ? Number.parseInt(key.slice(2), 16) : Number(key.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity;
  }).replace(/\s+/g, ' ').trim();
}

function parseOfficialNews(html, official, now) {
  const articles = [...html.matchAll(/<article\b[^>]*class="[^"]*\bdnt-card-news\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi)];
  if (!articles.length) throw new Error('No se encontraron las tarjetas del portal oficial');
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
    const label = textFromHtml(link[2]);
    if (/\bRNE\s+Accesible\b/i.test(label)) return [];
    const topic = topicFor(label) || (/\b(?:sintoniz\w*|canales?)\b.*\bUHD\b/i.test(label)
      ? { type: 'UHD', label: 'Novedades de televisión en ultra alta definición' }
      : null);
    if (!topic) return [];
    return [{ type: topic.type, label, publisher: official.publisher,
      url: url.origin + url.pathname, date: new Date(date).toISOString() }];
  });
}

async function addOfficialText(item) {
  if (!item.publisher) return item;
  const slug = new URL(item.url).pathname.split('/').at(-1);
  if (Object.hasOwn(verifiedSummaries, slug)) {
    return { ...item, paragraphs: [verifiedSummaries[slug]], excerptType: 'Resumen del aviso' };
  }

  try {
    const response = await fetch(item.url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'text/html' } });
    if (!response.ok) return item;
    const html = await response.text();
    const main = html.match(/<main\b[^>]*>[\s\S]*?<\/h1>([\s\S]*?)<\/main>/i)?.[1];
    if (!main) return item;
    const body = main.match(/<div class="text">\s*<div[^>]*class="[^"]*\bcmp-text\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
    const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map(([, paragraph]) => textFromHtml(paragraph)).filter(text => text.length >= 90);
    if (!paragraphs.length) return item;

    // The portal also republishes third-party material, which has separate rights.
    const thirdParty = /\bFuente\s*:/i.test(textFromHtml(main));
    if (thirdParty) {
      const words = paragraphs[0].split(' ');
      const excerpt = words.length > 25 ? words.slice(0, 25).join(' ') + '…' : paragraphs[0];
      return { ...item, paragraphs: [excerpt], excerptType: 'Extracto breve del aviso' };
    }
    const excerpt = paragraphs.filter(text => text.length <= 850).slice(0, 2);
    if (!excerpt.length) return item;
    const modified = /\b(?:última actualización|fecha de actualización)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i.exec(textFromHtml(main))?.[1];
    return { ...item, paragraphs: excerpt, excerptType: 'Extracto de la publicación oficial', ...(modified ? { modified } : {}) };
  } catch {
    return item;
  }
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
  const latest = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url)).slice(0, 5);
  const items = await Promise.all(latest.map(addOfficialText));
  headers['Netlify-CDN-Cache-Control'] = officialNews || available.length === results.length
    ? 'public, durable, s-maxage=10800, stale-while-revalidate=3600'
    : 'public, durable, s-maxage=300';
  return { statusCode: 200, headers, body: JSON.stringify({ items }) };
}
