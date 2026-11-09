import { SaxesParser } from 'saxes';
import backup from './novedades-tdt-backup.json' with { type: 'json' };

const source = 'https://www.mundoplus.tv';
const sections = ['tv-digital', 'tecnologia'];
const uhdSpain = 'https://www.uhdspain.com';
const ses = 'https://www.ses.com';
const kingOfSat = 'https://es.kingofsat.tv';
const satCesc = 'https://satcesc.com';
const satelliteMaxAge = 180 * 24 * 60 * 60 * 1000;
const maxAge = 30 * 24 * 60 * 60 * 1000;

const officialSources = [
  { origin: 'https://television.digital.gob.es', path: '/atencion-a-la-ciudadania/notas-prensa', publisher: 'Televisión Digital' },
  { origin: 'https://digital.gob.es', path: '/comunicacion', articlePath: '/comunicacion/notas-prensa/', publisher: 'Ministerio para la Transformación Digital' }
];
const newsMaxAge = 90 * 24 * 60 * 60 * 1000;
const pageSize = 15;
const maxNews = 45;

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

function readRss(xml) {
  const parser = new SaxesParser();
  const tags = [];
  const entries = [];
  let item;
  parser.on('opentag', ({ name }) => {
    tags.push(name);
    if (tags.join('/') === 'rss/channel/item') item = { title: '', link: '', pubDate: '', description: '' };
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
  return entries;
}

function parseFeed(xml, now, origin = source) {
  return readRss(xml).flatMap(({ title, link, pubDate, description }) => {
    const topic = topicFor(title) || (origin === uhdSpain && /\b(?:canales?|emisiones?|atresmedia|3cat|rtve)\b/i.test(title) && /\bUHD\b/i.test(title) ? { type: 'UHD' } : null);
    const date = Date.parse(pubDate);
    const url = URL.parse(link.trim());
    if (!topic || !Number.isFinite(date) || date > now || now - date > newsMaxAge ||
      url?.origin !== origin || !(origin === source ? /^\/(tv-digital|tecnologia)\/[^/]+\/$/ : /^\/[^/]+\/$/).test(url.pathname)) return [];
    const item = { ...topic, url: url.origin + url.pathname, date: new Date(date).toISOString() };
    if (origin === uhdSpain) {
      const headline = textFromHtml(title);
      const label = headline === headline.toUpperCase()
        ? headline.slice(0, 1) + headline.slice(1).toLowerCase().replace(/\b(?:uhd|tdt|rtve|hdr)\b/g, word => word.toUpperCase())
        : headline;
      const clean = description.split(/<p\b[^>]*>\s*(?:La entrada|The post)\b/i)[0];
      return [{ ...item, label, publisher: 'UHD Spain', ...briefExcerpt(textFromHtml(clean)) }];
    }
    return [item];
  });
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

function parseSatCesc(entries, section, now) {
  return entries.flatMap(({ title, link, pubDate, description }) => {
    const label = textFromHtml(title);
    const type = satCescTopic(label, section);
    const date = Date.parse(pubDate);
    const url = URL.parse(link.trim());
    if (!type || !Number.isFinite(date) || date > now || now - date > newsMaxAge ||
      url?.origin !== satCesc || !/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/.test(url.pathname)) return [];
    const lead = description.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
    return [{ type, label, publisher: 'SatCesc', url: url.origin + url.pathname, date: new Date(date).toISOString(),
      ...briefExcerpt(textFromHtml(lead).replace(/\[\s*…\s*\]$/, '…')) }];
  });
}

function filterSatelliteChanges(entries, now) {
  const changes = entries.flatMap(({ title, description, pubDate }) => {
    const orbital = /\((?:Astra|Hispasat)\b[^()]*\s(19\.2E|30(?:\.0)?W),\s+\d{4}-\d{2}-\d{2}/i.exec(textFromHtml(description))?.[1];
    const event = /^(.+?):\s*([^()]+?)\s+\((?:Astra|Hispasat)\b[^()]*\)\s*$/i.exec(title.trim());
    const date = Date.parse(pubDate);
    if (!orbital || !event || !Number.isFinite(date) || date > now || now - date > maxAge) return [];
    const channel = event[1].trim();
    const normalized = channel.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[\s-]+/g, '');
    const name = normalized.replace(/(?:uhd|fhd|hd|sd|4k)$/, '');
    if (!/^(?:la[12]|la2cat|antena3|cuatro|telecinco|lasexta|24h|canal24horas|teledeporte|clan|trece|realmadridtv|boing|energy|atreseries|fdf|neox|divinity|nova|mega|bemad|dkiss|laseptima|etb[12]|canalsur(?:andalucia)?|telemadrid(?:int)?|aragontv|tpa|ib3|televisioncanaria|tvcanaria|cmm|cyltv|tv3(?:cat)?|tvg(?:europa)?|la7regiondemurcia|tvextremadura|apunt)$/.test(name)) return [];
    const action = event[2].trim().toLowerCase();
    let change;
    if (/^(?:nueva frecuencia|new frequency)$/.test(action)) change = 'Cambio de frecuencia';
    if (/^(?:nuevo canal|new channel)$/.test(action)) change = 'Nuevo canal';
    if (/^(?:ha dejado de emitir|left|removed|ceased broadcasting|fin de emisi[oó]n)$/.test(action)) change = 'Fin de emisión';
    if (!change) return [];
    const astra = orbital === '19.2E';
    return [{ channel, change, position: astra ? 'Astra 19,2° Este' : 'Hispasat 30° Oeste',
      date: new Date(date).toISOString(), url: kingOfSat + (astra ? '/news19.2E' : '/news30W') }];
  }).sort((a, b) => b.date.localeCompare(a.date));
  const unique = new Map();
  for (const change of changes) {
    const key = [change.channel, change.change, change.position].join('|');
    if (!unique.has(key)) unique.set(key, change);
  }
  return [...unique.values()].slice(0, 5);
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
    if (!Number.isFinite(date) || date > now || now - date > newsMaxAge ||
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

function briefExcerpt(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 8) return {};
  return {
    paragraphs: [words.length > 25 ? words.slice(0, 25).join(' ') + '…' : text],
    excerptType: 'Extracto breve de la publicación'
  };
}

function parseSes(html, now) {
  const cards = html.split(/<datetime\b[^>]*class="card__subtitle"[^>]*>/i).slice(1);
  return cards.flatMap(card => {
    const date = Date.parse(card.match(/<time\s+datetime="([^"]+)"/i)?.[1]);
    const heading = card.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    const label = heading ? textFromHtml(heading[1]) : '';
    if (!/\bASTRA TV\b/i.test(label) || !/\b(?:Spain|Spanish|España)\b/i.test(label) ||
      !Number.isFinite(date) || date > now || now - date > satelliteMaxAge) return [];
    const article = card.match(/href="((?:https:\/\/www\.ses\.com)?\/news\/(?:news-flash|press-release|press-releases)\/[^"#?]+)"/i);
    if (!article) return [];
    const url = new URL(article[1], ses).href;
    const summary = url.endsWith('/ses-expands-astra-tv-offering-in-spain')
      ? { paragraphs: ['SES anunció la incorporación de 14 canales autonómicos a Astra TV en España, entre ellos ETB 1, Telemadrid y Canal Sur. El comunicado también presenta nuevos receptores híbridos que combinan la señal de satélite con servicios por Internet.'], excerptType: 'Resumen del comunicado' }
      : {};
    return [{ type: 'Satélite', label, publisher: 'SES / Astra TV', url, date: new Date(date).toISOString(), ...summary }];
  });
}

async function addOfficialText(item) {
  if (!officialSources.some(source => source.publisher === item.publisher)) return item;
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
  const uhdRequest = (async () => {
    const response = await fetch(uhdSpain + '/feed/', { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error('UHD Spain: HTTP ' + response.status);
    return parseFeed(await response.text(), now, uhdSpain);
  })();
  const sesRequests = [0, 1, 2, 3].map(async page => {
    const response = await fetch(ses + '/news/news-releases' + (page ? '?page=' + page : ''), {
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) throw new Error('SES: HTTP ' + response.status);
    return parseSes(await response.text(), now);
  });
  const satCescCategories = { tdt: 13, transpondedores: 6, 'movistar-tv': 5962 };
  const satCescRequests = Object.entries(satCescCategories).map(async ([section, category]) => {
    try {
      const response = await fetch(satCesc + '/' + section + '/feed/', {
        signal: AbortSignal.timeout(4500), headers: { Accept: 'application/rss+xml, application/xml, text/xml' }
      });
      if (!response.ok) throw new Error('RSS HTTP ' + response.status);
      const xml = await response.text();
      if (!/<rss\b/i.test(xml)) throw new Error('Respuesta no RSS');
      return parseSatCesc(readRss(xml), section, now);
    } catch (error) {
      console.warn('RSS de SatCesc no disponible', section, error.message);
      const response = await fetch(satCesc + '/wp-json/wp/v2/posts?categories=' + category + '&per_page=26&_fields=date_gmt,link,title,excerpt', {
        signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('SatCesc API: HTTP ' + response.status);
      const posts = await response.json();
      if (!Array.isArray(posts)) throw new Error('SatCesc API sin artículos');
      const entries = posts.map(post => ({ title: post.title?.rendered || '', link: post.link || '',
        pubDate: post.date_gmt ? post.date_gmt + 'Z' : '', description: post.excerpt?.rendered || '' }));
      return parseSatCesc(entries, section, now);
    }
  });
  const kingRequest = (async () => {
    const response = await fetch(kingOfSat + '/rssnews.php', { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error('KingOfSat: HTTP ' + response.status);
    const xml = await response.text();
    if (!/<rss\b/i.test(xml)) throw new Error('KingOfSat no devolvió RSS');
    return filterSatelliteChanges(readRss(xml), now);
  })();
  const [kingResult, ...results] = await Promise.allSettled([kingRequest, ...rssRequests, ...officialRequests, uhdRequest, ...sesRequests, ...satCescRequests]);
  const satCescAvailable = results.slice(-satCescRequests.length).filter(result => result.status === 'fulfilled').length;
  headers['X-Zallatel-SatCesc'] = satCescAvailable + '/' + satCescRequests.length;
  const satelliteChanges = kingResult.status === 'fulfilled' ? kingResult.value : null;
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
    return { statusCode: items.length || satelliteChanges?.length ? 200 : 503, headers, body: JSON.stringify({ items, satelliteChanges, backup: true }) };
  }
  const officialNews = news.some(item => item.publisher);
  const rssNews = news.some(item => !item.publisher);
  headers['X-Zallatel-RSS'] = officialNews ? (rssNews ? 'mixto' : 'oficial') : 'directo';

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
  const items = await Promise.all(latest.map(addOfficialText));
  headers['Netlify-CDN-Cache-Control'] = satCescAvailable === satCescRequests.length && (officialNews || available.length === results.length)
    ? 'public, durable, s-maxage=10800, stale-while-revalidate=3600'
    : 'public, durable, s-maxage=300';
  return { statusCode: 200, headers, body: JSON.stringify({ items, satelliteChanges }) };
}
