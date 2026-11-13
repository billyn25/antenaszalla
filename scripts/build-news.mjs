import fs from 'node:fs';
import path from 'node:path';
import { DOMAIN, PHONE, TEL } from './public-seo.mjs';
import backup from '../netlify/functions/novedades-tdt-backup.json' with { type: 'json' };
import { BLOG_TITLE, BLOG_DESCRIPTION, BLOG_CSS, escapeHtml, renderBlogHtml } from '../src/blog-render.mjs';
import { pageSize } from '../src/news-sources.mjs';

const root = path.resolve(process.env.PRODUCTION_ROOT || 'dist');
const homeFile = path.join(root, 'index.html');
let home = fs.readFileSync(homeFile, 'utf8');
if (!home.match(/<header\b[\s\S]*?href="\/blog\/"[\s\S]*?<\/header>/)) home = home.replace('</nav><div class="contact-top">', '<a href="/blog/">Blog de antenas</a></nav><div class="contact-top">');
if (!home.includes('id="blog-de-antenas"')) home = home.replace('</main>', '<section class="section soft" id="blog-de-antenas"><div class="wrap"><span class="eyebrow">Noticias y consejos</span><h2>Blog de antenas, TDT y satélite</h2><p class="section-lead">Cambios de canales con fecha y fuente original, y comprobaciones útiles antes de resintonizar o revisar la instalación.</p><a class="btn" href="/blog/">Ver noticias y consejos de antenas</a></div></section></main>');
const header = home.match(/<header\b[\s\S]*?<\/header>/)?.[0].replace(/href="#/g, 'href="/#');
const footer = home.match(/<footer\b[\s\S]*?<\/footer>/)?.[0].replace(/href="#/g, 'href="/#');
if (!header?.includes('href="/blog/"') || !footer) throw new Error('No se pudo enlazar la página de novedades desde la portada.');

const content = `<section class="service-hero"><div class="wrap"><span class="eyebrow">Blog de Antenas Zalla</span><h1>Noticias de antenas, TDT y satélite</h1><p>Cambios de canales y novedades de recepción, con la fecha y la fuente de cada publicación.</p></div></section>
<section class="section wrap" id="antes-de-resintonizar" aria-labelledby="guia-blog"><span class="eyebrow">Antes de tocar la instalación</span><h2 id="guia-blog">Qué comprobar cuando desaparece un canal</h2><div class="blog-practical"><article><h3>Identifica cómo recibes la televisión</h3><p>Una noticia puede referirse a TDT por antena, a un satélite concreto o a una plataforma de pago. Comprueba que el cambio corresponde a tu sistema y que la fecha ya ha llegado. El número del mando no es la frecuencia de emisión.</p><a href="/servicios/antenas-parabolicas/">Revisión de recepción por satélite</a></article><article><h3>Compara televisores y vecinos</h3><p>Si el canal falta en una sola toma, prueba un latiguillo que funcione en otra. Si afecta a varias viviendas, comunica el aviso al responsable de la comunidad. Esa comparación ayuda a distinguir un cambio de emisiones de una avería de distribución.</p><a href="/servicios/reparacion-antenas-tdt/">Cómo se comprueba una avería TDT</a></article><article><h3>Consulta la compatibilidad antes de comprar</h3><p>Resintonizar actualiza la lista de canales, pero no repara una señal defectuosa ni añade compatibilidad al televisor. Revisa el modelo y las especificaciones de recepción si la noticia habla de DVB-T2 o UHD. Anota el mensaje que aparece en pantalla.</p><a href="https://television.digital.gob.es/">Consultar la información oficial de TDT</a></article></div></section>
<!-- BLOG_CONTENT_START --><!-- BLOG_CONTENT_END -->
<section class="section wrap" aria-labelledby="consulta-blog"><div class="contact-panel"><div><h2 id="consulta-blog">¿Necesitas revisar la antena de tu vivienda o comunidad?</h2><p>Indica el municipio, los canales afectados y si ocurre en una toma o en varias viviendas. Con esos datos podemos preparar la consulta de recepción, amplificación o cableado.</p></div><div class="actions"><a class="btn call" href="tel:${TEL}">Llamar al ${PHONE}</a><a class="btn" href="/#zonas">Buscar mi pueblo</a></div></div><nav class="town-service-menu" aria-labelledby="news-towns-title"><h3 id="news-towns-title">Encuentra un antenista en tu pueblo</h3><div id="news-towns"><!-- NEWS_TOWNS --></div><p><a href="/#zonas">Ver todas las zonas</a></p></nav></section>`;
const template = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(BLOG_TITLE)}</title><meta name="description" content="${escapeHtml(BLOG_DESCRIPTION)}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${DOMAIN}/blog/"><link rel="stylesheet" href="/assets/site.css?v=zalla-pro-1"><link rel="stylesheet" href="/assets/service-guides.css"><link rel="stylesheet" href="/assets/blog.css?v=ssr-1"><script src="/assets/site.js" defer></script></head><body class="service-page"><a class="skip" href="#contenido">Saltar al contenido</a>${header}<main id="contenido">${content}</main>${footer}</body></html>`;
// The static reserve is a single complete page. The function serves the complete
// live collection and its paginated URLs, so build audits need no virtual pages.
const page = renderBlogHtml(template, { ...backup, items: backup.items.slice(0, pageSize), backup: true });
fs.mkdirSync(path.join(root, 'blog'), { recursive: true });
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
fs.writeFileSync(path.join(root, 'blog/index.html'), page);
fs.writeFileSync(path.join(root, 'assets/blog.css'), BLOG_CSS);
fs.writeFileSync(homeFile, home);
console.log('BLOG PREPARADO: HTML de reserva con noticias fechadas; publicación automática y paginación a cargo de la función del blog.');
