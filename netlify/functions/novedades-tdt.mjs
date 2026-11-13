import { SaxesParser } from 'saxes';
import { satCesc, satCescCategories, mundoCategories, topicFor, newsMaxAge, textFromHtml, briefExcerpt, parseSatCesc, fetchSatCescPosts, fetchMundoPosts, selectNews } from '../../src/news-sources.mjs';
import backup from './novedades-tdt-backup.json' with { type: 'json' };

const source = 'https://www.mundoplus.tv';
const sections = Object.keys(mundoCategories);
const uhdSpain = 'https://www.uhdspain.com';
const ses = 'https://www.ses.com';
const kingOfSat = 'https://es.kingofsat.tv';
const satellitePositions = { '19.2E': 'Astra 19,2° Este', '30W': 'Hispasat 30° Oeste' };
const kingMonths = 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' ');
const satelliteMaxAge = 180 * 24 * 60 * 60 * 1000;
const maxAge = 30 * 24 * 60 * 60 * 1000;

const officialSources = [
  { origin: 'https://television.digital.gob.es', path: '/atencion-a-la-ciudadania/notas-prensa', publisher: 'Televisión Digital' },
  { origin: 'https://digital.gob.es', path: '/comunicacion', articlePath: '/comunicacion/notas-prensa/', publisher: 'Ministerio para la Transformación Digital' }
];

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
    const item = { type: topic.type, label: textFromHtml(title),
      publisher: origin === source ? 'Mundoplus' : 'UHD Spain',
      url: url.origin + url.pathname, date: new Date(date).toISOString() };
    if (origin === uhdSpain) {
      const clean = description.split(/<p\b[^>]*>\s*(?:La entrada|The post)\b/i)[0];
      return [{ ...item, ...briefExcerpt(textFromHtml(clean)) }];
    }
    return [item];
  });
}

function filterSatelliteChanges(entries, now) {
  return entries.flatMap(({ title, description, pubDate }) => {
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
    const orbit = orbital === '19.2E' ? orbital : '30W';
    return [{ channel, change, position: satellitePositions[orbit],
      date: new Date(date).toISOString(), url: kingOfSat + '/news' + orbit }];
  });
}

function readOpenSatelliteChanges(html, orbit, now) {
  const changes = [];
  const url = kingOfSat + '/news' + orbit;
  const sections = html.split(/<h4\b[^>]*>([\s\S]*?)<\/h4>/i);
  for (let index = 1; index < sections.length; index += 2) {
    const heading = textFromHtml(sections[index]).toLowerCase();
    const dateParts = /\b(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})\b/.exec(heading);
    if (!dateParts) continue;
    const month = kingMonths.indexOf(dateParts[2]);
    if (month < 0) continue;
    const date = Date.UTC(Number(dateParts[3]), month, Number(dateParts[1]));
    if (date > now || now - date > maxAge) continue;

    for (const paragraph of sections[index + 1].split(/<p\b[^>]*>|<\/div>/i)) {
      const event = /^\s*(Nueva frecuencia para|Inicio de)\s*<a\b[^>]*\bhref=["']detail-[^"']+["'][^>]*>([\s\S]*?)<\/a>/i.exec(paragraph);
      if (!event) continue;
      const details = textFromHtml(paragraph.slice(event[0].length));
      const tuning = /(\d{4,5}(?:[.,]\d+)?)\s*MHz,\s*pol\.\s*([HV])\b/i.exec(details);
      const channel = textFromHtml(event[2]);
      if (!channel || !tuning || !/\ben abierto\b/i.test(details)) continue;
      if (/\b(?:eroti[ck]\w*|xxx|adult(?:s|os)?|hot babes)\b/i.test(channel)) continue;
      changes.push({
        channel,
        change: /^inicio/i.test(event[1]) ? 'Nuevo canal' : 'Cambio de frecuencia',
        position: satellitePositions[orbit],
        date: new Date(date).toISOString(),
        url,
        frequency: tuning[1].replace('.', ','),
        polarization: tuning[2].toUpperCase()
      });
    }
  }
  return changes;
}

async function fetchSatelliteChanges(now, fetcher = fetch) {
  const rssRequest = (async () => {
    const response = await fetcher(kingOfSat + '/rssnews.php', { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error('KingOfSat RSS: HTTP ' + response.status);
    const xml = await response.text();
    if (!/<rss\b/i.test(xml)) throw new Error('KingOfSat no devolvió RSS');
    return filterSatelliteChanges(readRss(xml), now);
  })();
  const positionRequests = Object.keys(satellitePositions).map(async orbit => {
    const response = await fetcher(kingOfSat + '/news' + orbit, {
      signal: AbortSignal.timeout(6000), headers: { Accept: 'text/html' }
    });
    if (!response.ok) throw new Error('KingOfSat ' + orbit + ': HTTP ' + response.status);
    const html = await response.text();
    const heading = textFromHtml(/<h1\b[^>]*>[\s\S]*?<\/h1>/i.exec(html)?.[0] || '');
    if (!heading.endsWith('(' + orbit + ')')) {
      throw new Error('KingOfSat no devolvió el listado de ' + orbit);
    }
    return readOpenSatelliteChanges(html, orbit, now);
  });
  const results = await Promise.allSettled([rssRequest, ...positionRequests]);
  const available = results.filter(result => result.status === 'fulfilled');
  if (!available.length) throw new Error('KingOfSat no está disponible');

  const changes = available.flatMap(result => result.value).sort((a, b) =>
    b.date.slice(0, 10).localeCompare(a.date.slice(0, 10)) ||
    Number(Boolean(b.frequency)) - Number(Boolean(a.frequency)) ||
    b.date.localeCompare(a.date)
  );
  const unique = new Map();
  for (const change of changes) {
    const key = [change.channel.toLowerCase(), change.change, change.position].join('|');
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

async function addOfficialText(item, fetcher = fetch) {
  if (!officialSources.some(source => source.publisher === item.publisher)) return item;
  const slug = new URL(item.url).pathname.split('/').at(-1);
  if (Object.hasOwn(verifiedSummaries, slug)) {
    return { ...item, paragraphs: [verifiedSummaries[slug]], excerptType: 'Resumen del aviso' };
  }

  try {
    const response = await fetcher(item.url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'text/html' } });
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

export async function getNewsResponse({ signal, now = Date.now(), fetchImpl = fetch, includeExcerpts = true } = {}) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' };
  const fetcher = (url, options = {}) => fetchImpl(url, {
    ...options,
    signal: signal && options.signal ? AbortSignal.any([signal, options.signal]) : signal || options.signal
  });
  const rssRequests = sections.map(async section => {
    try {
      const response = await fetcher(`${source}/seccion/${section}/feed/`, {
        signal: AbortSignal.timeout(3500),
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'AntenasZalla/1.1 (+https://antenaszalla.com/blog/)'
        }
      });
      if (!response.ok) throw new Error(`RSS ${section}: HTTP ${response.status}`);
      const xml = await response.text();
      if (!/<rss\b/i.test(xml)) throw new Error('Mundoplus no devolvió RSS');
      return parseFeed(xml, now);
    } catch (error) {
      if (signal?.aborted) throw error;
      return fetchMundoPosts(section, now, 3000, fetcher);
    }
  });
  const officialRequests = officialSources.map(async official => {
    const response = await fetcher(official.origin + official.path, {
      signal: AbortSignal.timeout(12000),
      headers: { Accept: 'text/html' }
    });
    if (!response.ok) throw new Error(`Portal oficial: HTTP ${response.status}`);
    return parseOfficialNews(await response.text(), official, now);
  });
  const uhdRequest = (async () => {
    const response = await fetcher(uhdSpain + '/feed/', { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error('UHD Spain: HTTP ' + response.status);
    return parseFeed(await response.text(), now, uhdSpain);
  })();
  const sesRequests = [0, 1, 2, 3].map(async page => {
    const response = await fetcher(ses + '/news/news-releases' + (page ? '?page=' + page : ''), {
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) throw new Error('SES: HTTP ' + response.status);
    return parseSes(await response.text(), now);
  });
  const satCescSections = Object.keys(satCescCategories);
  const satCescRequests = satCescSections.map(async section => {
    try {
      const response = await fetcher(satCesc + '/' + section + '/feed/', {
        signal: AbortSignal.timeout(4500), headers: { Accept: 'application/rss+xml, application/xml, text/xml' }
      });
      if (!response.ok) throw new Error('RSS HTTP ' + response.status);
      const xml = await response.text();
      if (!/<rss\b/i.test(xml)) throw new Error('Respuesta no RSS');
      return parseSatCesc(readRss(xml), section, now);
    } catch (error) {
      console.warn('RSS de SatCesc no disponible', section, error.message);
      if (signal?.aborted) throw error;
      return fetchSatCescPosts(section, now, 5000, fetcher);
    }
  });
  const kingRequest = fetchSatelliteChanges(now, fetcher);
  const [kingResult, ...results] = await Promise.allSettled([kingRequest, ...rssRequests, ...officialRequests, uhdRequest, ...sesRequests, ...satCescRequests]);
  const mundoMissing = sections.filter((_, index) => results[index].status === 'rejected');
  const satCescResults = results.slice(-satCescRequests.length);
  const satCescMissing = satCescSections.filter((_, index) => satCescResults[index].status === 'rejected');
  const satCescAvailable = satCescSections.length - satCescMissing.length;
  headers['X-Antenas-Zalla-SatCesc'] = satCescAvailable + '/' + satCescRequests.length;
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
    headers['X-Antenas-Zalla-RSS'] = `reserva; ${failures.join(', ')}`;
    headers['Netlify-CDN-Cache-Control'] = 'public, durable, s-maxage=300';
    return { statusCode: items.length || satelliteChanges?.length ? 200 : 503, headers, body: JSON.stringify({ items, satelliteChanges, satCescMissing, mundoMissing, backup: true, partial: true }) };
  }
  const officialNews = news.some(item => officialSources.some(source => source.publisher === item.publisher));
  const rssNews = news.some(item => !officialSources.some(source => source.publisher === item.publisher));
  headers['X-Antenas-Zalla-RSS'] = officialNews ? (rssNews ? 'mixto' : 'oficial') : 'directo';

  const selection = selectNews(news);
  const items = includeExcerpts ? await Promise.all(selection.map(item => addOfficialText(item, fetcher))) : selection;
  headers['Netlify-CDN-Cache-Control'] = satCescAvailable === satCescRequests.length && (officialNews || available.length === results.length)
    ? 'public, durable, s-maxage=10800, stale-while-revalidate=3600'
    : 'public, durable, s-maxage=300';
  return { statusCode: 200, headers, body: JSON.stringify({ items, satelliteChanges, satCescMissing, mundoMissing,
    partial: available.length < results.length || kingResult.status === 'rejected' }) };
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache', Allow: 'GET' },
    body: '{}'
  };
  return getNewsResponse();
}
