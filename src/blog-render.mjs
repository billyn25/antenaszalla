import { pageSize, maxNews, selectNews, newsMaxAge } from './news-sources.mjs';
import { blogSeoMetadata, SEO_BRAND } from '../scripts/seo-metadata.mjs';
import { DOMAIN, organizationSchema } from '../scripts/public-seo.mjs';

export const BLOG_DOMAIN = DOMAIN;
export const BLOG_TITLE = blogSeoMetadata().title;
export const BLOG_DESCRIPTION = blogSeoMetadata().description;
const allowedSources = new Map([
  ['www.mundoplus.tv', 'Mundoplus'], ['satcesc.com', 'SatCesc'],
  ['www.uhdspain.com', 'UHD Spain'], ['www.ses.com', 'SES / Astra TV'],
  ['television.digital.gob.es', 'Televisión Digital'],
  ['digital.gob.es', 'Ministerio para la Transformación Digital']
]);
const syndicatedHost = 'news.google.com';
const syndicatedPublishers = new Set(['Mundoplus', 'SatCesc']);
const allowedNewsHosts = new Set([...allowedSources.keys(), syndicatedHost]);
const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const asText = value => typeof value === 'string' ? value.trim() : '';

export function blogPath(page = 1) {
  return page === 1 ? '/blog/' : `/blog/pagina/${page}/`;
}

export function parseBlogPath(pathname) {
  if (/^\/blog\/?$/.test(pathname)) return { page: 1, canonicalPath: '/blog/' };
  const match = /^\/blog\/pagina\/([1-9]\d{0,2})\/?$/.exec(pathname);
  if (!match) return null;
  const page = Number(match[1]);
  if (page > Math.ceil(maxNews / pageSize)) return null;
  return { page, canonicalPath: blogPath(page) };
}

function sourceUrl(value, allowed) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed.has(url.hostname)) return null;
    if (url.hostname === syndicatedHost && url.hash) return null;
    url.hash = '';
    return url;
  } catch { return null; }
}

export function normaliseNews(data, now = Date.now()) {
  const items = (Array.isArray(data?.items) ? data.items : []).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const url = sourceUrl(item.url, allowedNewsHosts);
    const date = Date.parse(item.date);
    const label = asText(item.label);
    const age = url?.hostname === 'www.ses.com' ? 180 * 86400000 : newsMaxAge;
    if (!url || !label || !Number.isFinite(date) || date > now || now - date > age) return [];
    const syndicated = url.hostname === syndicatedHost;
    if (syndicated) {
      const params = [...url.searchParams];
      if (!/^\/rss\/articles\/[A-Za-z0-9_-]+$/.test(url.pathname) ||
          !syndicatedPublishers.has(item.publisher) || item.via !== 'Google Noticias' ||
          params.length > 1 || params.some(([key, value]) => key !== 'oc' || !/^\d+$/.test(value))) return [];
    }
    const headlineWords = label.split(/\s+/);
    const headline = headlineWords.length > 25 ? headlineWords.slice(0, 25).join(' ') + '…' : label;
    return [{
      type: (asText(item.type) || 'Televisión').slice(0, 60), label: headline.slice(0, 300), url: url.href,
      date: new Date(date).toISOString(), publisher: syndicated ? item.publisher : allowedSources.get(url.hostname),
      ...(syndicated ? { via: 'Google Noticias' } : {})
    }];
  });
  const satelliteChanges = (Array.isArray(data?.satelliteChanges) ? data.satelliteChanges : []).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const url = sourceUrl(item.url, new Set(['es.kingofsat.tv']));
    const date = Date.parse(item.date);
    if (!url || !/^\/news(?:19\.2E|30W)$/.test(url.pathname) || !Number.isFinite(date) || date > now || now - date > 30 * 86400000 || !asText(item.channel)) return [];
    if (!['Cambio de frecuencia', 'Nuevo canal', 'Fin de emisión'].includes(item.change)) return [];
    return [{
      channel: asText(item.channel).slice(0, 100), change: item.change,
      position: url.pathname === '/news19.2E' ? 'Astra 19,2° Este' : 'Hispasat 30° Oeste',
      date: new Date(date).toISOString(), url: url.href,
      ...(/^\d{4,5}(?:[.,]\d+)?$/.test(item.frequency) && /^[HV]$/.test(item.polarization)
        ? { frequency: item.frequency, polarization: item.polarization } : {})
    }];
  }).slice(0, 5);
  return { items: selectNews(items), satelliteChanges, backup: data?.backup === true,
    partial: data?.partial === true, partialBackup: data?.partialBackup === true };
}

function safeTowns(towns) {
  return (Array.isArray(towns) ? towns : []).filter(town => town && asText(town.name) && /^\/antenas-[a-z-]+\/[a-z0-9_-]+$/.test(town.route));
}

function townLinks(url, towns, featured) {
  const hash = route => {
    let value = 2166136261;
    for (const char of url + '|' + route) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return value >>> 0;
  };
  const pair = towns.filter(town => !featured.has(town.route)).sort((a, b) => hash(a.route) - hash(b.route)).slice(0, 2);
  if (!pair.length) return '';
  pair.forEach(town => featured.add(town.route));
  return `<footer class="news-town-links">${pair.map(town => `<a href="${escapeHtml(town.route)}">Antenista en ${escapeHtml(town.name)}</a>`).join('')}</footer>`;
}

export function renderNewsContent(news, page = 1, towns = []) {
  const count = Math.max(1, Math.ceil(news.items.length / pageSize));
  if (!Number.isInteger(page) || page < 1 || page > count) return null;
  const selected = news.items.slice((page - 1) * pageSize, page * pageSize);
  const featured = new Set();
  const validTowns = safeTowns(towns);
  const satellites = page === 1 ? `<section class="section wrap" aria-labelledby="cambios-satelite"><span class="eyebrow">Recepción por satélite</span><h2 id="cambios-satelite">Cambios de canales en Astra e Hispasat</h2><p>Los avisos de KingOfSat indican altas, bajas y cambios de frecuencia. Comprueba la fecha, el satélite y la fuente antes de modificar tu receptor: un cambio por satélite no implica que cambie también la TDT terrestre.</p>${news.satelliteChanges.length ? `<ul class="news-satellite-list">${news.satelliteChanges.map(item => `<li><strong>${escapeHtml(item.channel)} · ${escapeHtml(item.change)}</strong><time datetime="${item.date}">${dateFormat.format(new Date(item.date))}</time><p>${escapeHtml(item.position)}${item.frequency ? ` · ${escapeHtml(item.frequency)} MHz, polarización ${item.polarization === 'V' ? 'vertical' : 'horizontal'}` : ''}.</p><a href="${escapeHtml(item.url)}">Consultar el listado original de KingOfSat</a></li>`).join('')}</ul>` : '<p>No hay avisos recientes disponibles en esta selección. Puedes consultar directamente los listados de <a href="https://es.kingofsat.tv/news19.2E">Astra 19,2° Este</a> y <a href="https://es.kingofsat.tv/news30W">Hispasat 30° Oeste</a>.</p>'}<p><a href="/servicios/antenas-parabolicas/">Orientación y reparación de antenas parabólicas</a></p></section>` : '';
  const pagination = count > 1 ? `<nav class="news-pagination" aria-label="Paginación de noticias">${page > 1 ? `<a class="btn" rel="prev" href="${blogPath(page - 1)}">Anterior</a>` : '<span class="btn news-disabled" aria-disabled="true">Anterior</span>'}<span>Página ${page} de ${count}</span>${page < count ? `<a class="btn" rel="next" href="${blogPath(page + 1)}">Siguiente</a>` : '<span class="btn news-disabled" aria-disabled="true">Siguiente</span>'}</nav>` : '';
  return `${satellites}<section class="section soft" aria-labelledby="noticias-tdt"><div class="wrap"><span class="eyebrow">Noticias con fecha y fuente</span><h2 id="noticias-tdt">TDT, UHD, satélite y Movistar Plus+</h2><p>Avisos oficiales y noticias de UHD Spain, SES, SatCesc y Mundoplus. Cada tarjeta indica la fecha, el medio y el enlace de consulta; los titulares sindicados se identifican como «vía Google Noticias».</p>${news.backup ? '<p class="news-notice">Mostramos la selección guardada mientras se recuperan las fuentes. Las fechas originales se conservan.</p>' : news.partialBackup ? '<p class="news-notice">Algunas fuentes no están disponibles. Completamos la selección con publicaciones guardadas, que conservan su fecha y enlace original.</p>' : ''}${selected.length ? `<ol id="news-items" class="news-grid" start="${(page - 1) * pageSize + 1}">${selected.map(item => `<li><article><p class="news-meta">${escapeHtml(item.type)} · <time datetime="${item.date}">${dateFormat.format(new Date(item.date))}</time></p><h3><a href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a></h3><p class="news-source">Fuente: ${escapeHtml(item.publisher)}${item.via === 'Google Noticias' ? ' · vía Google Noticias' : ''}</p><a class="news-original" href="${escapeHtml(item.url)}">${item.via === 'Google Noticias' ? 'Ver noticia en Google Noticias' : 'Leer la publicación original'}</a>${townLinks(item.url, validTowns, featured)}</article></li>`).join('')}</ol>` : '<p>No hay noticias recientes disponibles en esta selección. Las guías de recepción y resintonización siguen disponibles.</p>'}${pagination}<p class="news-guides-link"><a href="/servicios/reparacion-antenas-tdt/">Consultar la guía de averías y recepción TDT</a> · <a href="/blog/#antes-de-resintonizar">Qué comprobar antes de resintonizar</a></p></div></section>`;
}

function replaceMeta(html, key, value, property = false) {
  const attribute = property ? 'property' : 'name';
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${key}["'])[^>]*>`, 'i');
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}">`;
  return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', `${tag}</head>`);
}

export function renderBlogHtml(template, data, { page = 1, towns = [], now = Date.now() } = {}) {
  const news = normaliseNews(data, now);
  const content = renderNewsContent(news, page, towns);
  if (content === null) return null;
  if (!template.includes('<!-- BLOG_CONTENT_START -->') || !template.includes('<!-- BLOG_CONTENT_END -->')) throw new Error('La plantilla del blog no contiene sus marcadores de contenido.');
  const url = BLOG_DOMAIN + blogPath(page);
  const { title, description, heading } = blogSeoMetadata(page);
  let html = template.replace(/<!-- BLOG_CONTENT_START -->[\s\S]*?<!-- BLOG_CONTENT_END -->/, () => `<!-- BLOG_CONTENT_START -->${content}<!-- BLOG_CONTENT_END -->`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i, () => `<link rel="canonical" href="${url}">`);
  html = replaceMeta(html, 'description', description);
  for (const [key, value] of Object.entries({ 'og:title': title, 'og:description': description, 'og:url': url, 'og:site_name': SEO_BRAND })) html = replaceMeta(html, key, value, true);
  for (const [key, value] of Object.entries({ 'twitter:title': title, 'twitter:description': description })) html = replaceMeta(html, key, value);
  html = html.replace(/(<h1\b[^>]*>)[\s\S]*?<\/h1>/i, (_, open) => `${open}${escapeHtml(heading)}</h1>`);
  const existing = /<script\b(?=[^>]*\bid=["']blog-structured-data["'])[^>]*>([\s\S]*?)<\/script>/i;
  const identity = new Map();
  const previousGraph = template.match(existing)?.[1];
  if (previousGraph) {
    const entities = JSON.parse(previousGraph)['@graph'] || [];
    for (const entity of entities) {
      if ((entity['@type'] === 'Organization' && entity['@id'] === BLOG_DOMAIN + '/#organizacion') ||
          (entity['@type'] === 'WebSite' && entity['@id'] === BLOG_DOMAIN + '/#website')) identity.set(entity['@id'], entity);
    }
  }
  if (!identity.has(BLOG_DOMAIN + '/#organizacion')) identity.set(BLOG_DOMAIN + '/#organizacion', organizationSchema());
  if (!identity.has(BLOG_DOMAIN + '/#website')) identity.set(BLOG_DOMAIN + '/#website', {
    '@type': 'WebSite', '@id': BLOG_DOMAIN + '/#website', name: SEO_BRAND, url: BLOG_DOMAIN + '/',
    publisher: { '@id': BLOG_DOMAIN + '/#organizacion' }
  });
  const graph = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', '@id': url + '#page', name: title, description, url, inLanguage: 'es', isPartOf: { '@id': BLOG_DOMAIN + '/#website' }, publisher: { '@id': BLOG_DOMAIN + '/#organizacion' } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: BLOG_DOMAIN + '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog de antenas', item: BLOG_DOMAIN + '/blog/' },
        ...(page > 1 ? [{ '@type': 'ListItem', position: 3, name: `Página ${page}`, item: url }] : [])
      ] },
      ...identity.values()
    ]
  };
  const schema = `<script type="application/ld+json" id="blog-structured-data">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
  html = existing.test(html) ? html.replace(existing, () => schema) : html.replace('</head>', `${schema}</head>`);
  return html;
}

export const BLOG_CSS = `.news-grid{list-style:none;margin:1.5rem 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.news-grid>li{min-width:0}.news-grid article{height:100%;padding:24px;background:var(--paper,#fff);border:1px solid var(--line,#dbe2e7);border-radius:16px;display:flex;flex-direction:column;align-items:flex-start}.news-grid h3{margin:.5rem 0 .75rem;font-size:1.22rem;line-height:1.4}.news-grid p{line-height:1.65;overflow-wrap:anywhere}.news-meta,.news-source,.news-excerpt-label{font-size:.85rem;margin:.2rem 0;color:var(--muted,#526171)}.news-excerpt-label{font-style:italic}.news-original{margin-top:auto;padding-top:12px;font-weight:700}.news-town-links{display:flex;flex-wrap:wrap;gap:8px 16px;width:100%;margin-top:16px;padding-top:14px;border-top:1px solid var(--line,#dbe2e7);font-size:.88rem}.news-town-links a{overflow-wrap:anywhere}.news-pagination{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:14px;margin:1.75rem 0}.news-disabled{opacity:.45}.news-satellite-list{list-style:none;padding:0;display:grid;gap:12px}.news-satellite-list li{padding:18px;border:1px solid var(--line,#dbe2e7);border-radius:12px}.news-satellite-list time{display:block;font-size:.85rem;margin-top:6px}.news-satellite-list p{margin:.5rem 0}.news-notice{padding:12px 16px;border-left:3px solid var(--accent,#0867bd);background:#edf4f8}.news-guides-link{margin-top:20px}.blog-practical{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.blog-practical article{padding:22px;border:1px solid var(--line,#dbe2e7);border-radius:14px}.blog-practical h3{margin-top:0}.blog-practical p{line-height:1.7}@media(max-width:760px){.news-grid,.blog-practical{grid-template-columns:1fr}.news-grid article{padding:20px}.news-pagination .btn{min-height:44px}}`;
