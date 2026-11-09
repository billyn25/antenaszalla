import fs from 'node:fs';
import path from 'node:path';
import { DOMAIN, PHONE, TEL } from './public-seo.mjs';

const root = path.resolve(process.env.PRODUCTION_ROOT || 'dist');
const homeFile = path.join(root, 'index.html');
const home = fs.readFileSync(homeFile, 'utf8')
  .replace('</nav><div class="contact-top">', '<a href="/blog/">Blog de antenas</a></nav><div class="contact-top">')
  .replace('</main>', '<section class="section soft" id="blog-de-antenas"><div class="wrap"><span class="eyebrow">Novedades</span><h2>Blog de antenas, TDT y satélite</h2><p class="section-lead">Consulta las últimas noticias sobre canales, resintonización y recepción de televisión por satélite.</p><a class="btn" href="/blog/">Ver el blog de antenas</a></div></section></main>');
const header = home.match(/<header\b[\s\S]*?<\/header>/)?.[0].replace(/href="#/g, 'href="/#');
const footer = home.match(/<footer\b[\s\S]*?<\/footer>/)?.[0].replace(/href="#/g, 'href="/#');
if (!header?.includes('href="/blog/"') || !footer) throw new Error('No se pudo enlazar la página de novedades desde la portada.');

const title = 'Blog de antenas, TDT y satélite | Antenas Zallatel';
const description = 'Noticias sobre TDT, UHD, satélite y Movistar Plus+ en España. Cambios de canales, frecuencias, paquetes y resintonización.';
const content = `<section class="service-hero"><div class="wrap"><span class="eyebrow">Blog de Antenas Zallatel</span><h1>Noticias de antenas, TDT y satélite</h1><p>Últimas novedades de televisión digital, cambios de canales y resintonización en España.</p></div></section>
<section class="wrap" aria-labelledby="consulta-blog"><div class="contact-panel"><div><h2 id="consulta-blog">¿Necesitas un antenista en tu pueblo?</h2><p>Instalamos y reparamos antenas TDT, parabólicas y antenas colectivas. Dinos en qué pueblo está la instalación y qué canales o tomas fallan.</p></div><div class="actions"><a class="btn call" href="tel:${TEL}">Llamar al ${PHONE}</a><a class="btn" href="/#zonas">Buscar mi pueblo</a></div></div></section>
<section class="section wrap" aria-labelledby="cambios-satelite">
  <h2 id="cambios-satelite">Cambios de canales por satélite</h2>
  <p>En este bloque recogemos los cambios que KingOfSat detecta en canales de interés para España en <strong>Astra 19,2° Este</strong> e <strong>Hispasat 30° Oeste</strong>. Cada aviso indica el canal, el satélite y la fecha en que la fuente registró el cambio.</p>
  <p>Un <strong>cambio de frecuencia</strong> indica que el canal pasa a emitir con otros parámetros en ese satélite. Un <strong>alta</strong> señala que se ha incorporado una emisión y una <strong>baja</strong>, que ha cesado en la posición indicada. El mismo canal puede seguir disponible por otra vía, como la TDT terrestre.</p>
  <p>Consulta en KingOfSat los listados de <a href="https://es.kingofsat.tv/news19.2E">Astra 19,2° Este</a> y <a href="https://es.kingofsat.tv/news30W">Hispasat 30° Oeste</a>.</p>
  <p id="satellite-changes-empty" hidden>Por ahora no hay avisos recientes para los canales que seguimos. Los nuevos cambios se mostrarán aquí automáticamente.</p>
  <ul id="satellite-changes" hidden></ul>
  <p><a href="/servicios/antenas-parabolicas/">Orientación y reparación de antenas parabólicas</a></p>
</section>
<section class="section soft" aria-labelledby="noticias-tdt"><div class="wrap"><h2 id="noticias-tdt" tabindex="-1">Noticias de TDT, satélite y Movistar Plus+</h2><p>Avisos del <a href="https://television.digital.gob.es/atencion-a-la-ciudadania/notas-prensa">portal oficial de Televisión Digital</a> y noticias de <a href="https://www.uhdspain.com/noticias/">UHD Spain</a>, <a href="https://www.ses.com/news/news-releases">SES / Astra TV</a>, <a href="https://satcesc.com/">SatCesc</a> y <a href="https://www.mundoplus.tv/seccion/tv-digital/">Mundoplus</a>. Cada ficha enlaza a la publicación original.</p><p id="news-loading" role="status">Cargando noticias recientes…</p><ul id="news-items" class="steps" hidden></ul>
<nav id="news-pagination" class="news-pagination" aria-label="Paginación de noticias" hidden><button class="btn" type="button" id="news-previous" aria-controls="news-items">Anterior</button><span id="news-page-status" aria-live="polite"></span><button class="btn" type="button" id="news-next" aria-controls="news-items">Siguiente</button></nav>
<nav class="town-service-menu" aria-labelledby="news-towns-title"><h3 id="news-towns-title">Encuentra un antenista en tu pueblo</h3><div id="news-towns"><!-- NEWS_TOWNS --></div><p><a href="/#zonas">Ver todas las zonas</a></p></nav></div></section>`;
const page = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${DOMAIN}/blog/"><link rel="stylesheet" href="/assets/site.css?v=zallatel-1"><link rel="stylesheet" href="/assets/service-guides.css"><style>.news-town-links{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;padding-top:8px;border-top:1px solid var(--line);font-size:.88em}.news-town-links a{overflow-wrap:anywhere}.news-pagination:not([hidden]){display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:1.25rem}.news-pagination button:disabled{opacity:.5;cursor:default}</style><script src="/assets/site.js" defer></script><script type="module" src="/assets/news.js?v=11"></script></head><body class="service-page"><a class="skip" href="#contenido">Saltar al contenido</a>${header}<main id="contenido">${content}</main>${footer}</body></html>`;

fs.mkdirSync(path.join(root, 'blog'), { recursive: true });
fs.writeFileSync(path.join(root, 'blog/index.html'), page);
fs.writeFileSync(homeFile, home);
fs.copyFileSync('src/news.js', path.join(root, 'assets/news.js'));
fs.copyFileSync('src/news-sources.mjs', path.join(root, 'assets/news-sources.mjs'));
