import fs from 'node:fs';
import path from 'node:path';
import { DOMAIN } from './public-seo.mjs';

const root = path.resolve(process.env.PRODUCTION_ROOT || 'dist');
const homeFile = path.join(root, 'index.html');
const home = fs.readFileSync(homeFile, 'utf8').replace('</nav><div class="contact-top">', '<a href="/blog/">Novedades TDT</a></nav><div class="contact-top">');
const header = home.match(/<header\b[\s\S]*?<\/header>/)?.[0].replace(/href="#/g, 'href="/#');
const footer = home.match(/<footer\b[\s\S]*?<\/footer>/)?.[0].replace(/href="#/g, 'href="/#');
if (!header?.includes('href="/blog/"') || !footer) throw new Error('No se pudo enlazar la página de novedades desde la portada.');

const title = 'Novedades de TDT y satélite | Antenas Zallatel';
const description = 'Cambios de canales, frecuencias y recepción de la TDT y la televisión por satélite, con guías de diagnóstico de Antenas Zallatel.';
const content = `<section class="service-hero"><div class="wrap"><span class="eyebrow">Blog de Antenas Zallatel</span><h1>Novedades de TDT y satélite</h1><p>Cambios en la recepción de televisión, nuevos canales y ajustes de sintonización.</p></div></section>
<section class="section wrap" aria-labelledby="guias-tdt"><h2 id="guias-tdt">Qué revisar si faltan canales</h2><p class="section-lead">Si solo falla una televisión, comprueba si los mismos canales se ven en otra toma antes de resintonizar. Si faltan en varias viviendas, apunta cuáles son y consulta si hay una incidencia de emisión o un problema de antena colectiva.</p><p><a href="/servicios/reparacion-antenas-tdt/">Diagnóstico y reparación de TDT</a> · <a href="/servicios/tdt-por-satelite-hd/">Cuándo consultar por TDT por satélite</a></p></section>
<section class="section soft" aria-labelledby="noticias-tdt"><div class="wrap"><span class="eyebrow">Selección automática</span><h2 id="noticias-tdt">Últimas novedades</h2><p>Información de <a href="https://www.mundoplus.tv/">Mundoplus</a>. Los enlaces abren las noticias en su web.</p><p id="news-status" role="status" hidden></p><noscript><p>Puedes consultar la sección de <a href="https://www.mundoplus.tv/seccion/tv-digital/">TV Digital de Mundoplus</a>.</p></noscript><ul id="news-items" class="steps" hidden></ul>
<nav class="town-service-menu" aria-labelledby="news-towns-title"><h3 id="news-towns-title">Encuentra un antenista en tu pueblo</h3><div id="news-towns"><a href="/#zonas">Ver todas las zonas</a></div></nav></div></section>`;
const page = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${DOMAIN}/blog/"><link rel="stylesheet" href="/assets/site.css?v=zallatel-1"><link rel="stylesheet" href="/assets/service-guides.css"><script src="/assets/site.js" defer></script><script src="/assets/news.js" defer></script></head><body class="service-page"><a class="skip" href="#contenido">Saltar al contenido</a>${header}<main id="contenido">${content}</main>${footer}</body></html>`;

fs.mkdirSync(path.join(root, 'blog'), { recursive: true });
fs.writeFileSync(path.join(root, 'blog/index.html'), page);
fs.writeFileSync(homeFile, home);
fs.copyFileSync('src/news.js', path.join(root, 'assets/news.js'));
