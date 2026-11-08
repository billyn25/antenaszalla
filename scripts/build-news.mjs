import fs from 'node:fs';
import path from 'node:path';
import { DOMAIN, PHONE, TEL } from './public-seo.mjs';

const root = path.resolve(process.env.PRODUCTION_ROOT || 'dist');
const homeFile = path.join(root, 'index.html');
const home = fs.readFileSync(homeFile, 'utf8').replace('</nav><div class="contact-top">', '<a href="/blog/">Novedades TDT</a></nav><div class="contact-top">');
const header = home.match(/<header\b[\s\S]*?<\/header>/)?.[0].replace(/href="#/g, 'href="/#');
const footer = home.match(/<footer\b[\s\S]*?<\/footer>/)?.[0].replace(/href="#/g, 'href="/#');
if (!header?.includes('href="/blog/"') || !footer) throw new Error('No se pudo enlazar la página de novedades desde la portada.');

const title = 'Blog de antenas, TDT y satélite | Antenas Zallatel';
const description = 'Guías de Zallatel para recuperar canales de TDT, comprobar una antena colectiva y detectar fallos de señal en la parabólica. Novedades de TDT y satélite.';
const content = `<section class="service-hero"><div class="wrap"><span class="eyebrow">Blog de Antenas Zallatel</span><h1>Guías y novedades de antenas, TDT y satélite</h1><p>Qué puedes comprobar cuando faltan canales, la imagen se pixela o la parabólica pierde señal. Consejos para viviendas y comunidades.</p></div></section>
<section class="section wrap" aria-labelledby="guias-tdt">
  <h2 id="guias-tdt">Guías de Zallatel para problemas de señal</h2>
  <div class="service-catalogue">
    <article id="faltan-canales-tdt">
      <h3>He resintonizado la tele y siguen faltando canales</h3>
      <p>Apunta los nombres de los canales que faltan y comprueba si aparecen en otro televisor conectado a la misma antena. Si la otra tele los recibe, revisa que la búsqueda esté configurada en «Antena» o «TDT» y comprueba el cable de esa toma. Si ambos equipos pierden el mismo grupo de canales, guarda la lista para el diagnóstico.</p>
      <p>Si solo faltan versiones UHD, consulta si tu modelo admite emisiones terrestres DVB‑T2 y vídeo HEVC. La resolución 4K de la pantalla y el sintonizador de la tele son características distintas.</p>
      <a href="/servicios/reparacion-antenas-tdt/">Revisión de señal y canales TDT</a>
    </article>
    <article id="tdt-pixelada-comunidad">
      <h3>La TDT se pixela por la noche o en varios pisos</h3>
      <p>Apunta la hora, qué canales se cortan y si les ocurre también a otros vecinos. Prueba otra toma de la vivienda cuando aparezca el fallo. Si el problema se repite en varios pisos a la vez, pasa ese dato al administrador para orientar la revisión de la cabecera y la distribución comunitaria.</p>
      <p>Si falla una sola toma, avisa de si hay un alargador, un repartidor o un conector suelto. La comparación entre tomas ayuda a decidir dónde medir primero.</p>
      <a href="/servicios/mantenimiento-antenas-comunidades/">Revisión de antenas colectivas</a>
    </article>
    <article id="parabolica-sin-senal">
      <h3>La parabólica pierde señal cuando llueve</h3>
      <p>Anota si la imagen se recupera al parar la lluvia y si se cortan todos los canales o solo algunos. Si el receptor muestra nivel y calidad, haz una foto de esos valores en un canal afectado y, si puedes, otra cuando se vea bien.</p>
      <p>Si el fallo aparece con lluvia ligera o continúa con cielo despejado, esos datos ayudan a revisar el margen de señal, la orientación y las conexiones exteriores. Deja la comprobación de la cubierta y los conectores exteriores al técnico.</p>
      <a href="/servicios/antenas-parabolicas/">Orientación y reparación de parabólicas</a>
      <a href="/servicios/tdt-por-satelite-hd/">Consultar instalación de TDT por satélite</a>
    </article>
  </div>
</section>
<section class="wrap" aria-labelledby="consulta-blog"><div class="contact-panel"><div><h2 id="consulta-blog">¿Necesitas un antenista en tu pueblo?</h2><p>Instalamos y reparamos antenas TDT, parabólicas y antenas colectivas. Dinos en qué pueblo está la instalación y qué canales o tomas fallan.</p></div><div class="actions"><a class="btn call" href="tel:${TEL}">Llamar al ${PHONE}</a><a class="btn" href="/#zonas">Buscar mi pueblo</a></div></div></section>
<section class="section soft" aria-labelledby="noticias-tdt"><div class="wrap"><h2 id="noticias-tdt">Noticias de TDT y satélite</h2><p>Enlaces a <a href="https://www.mundoplus.tv/seccion/tv-digital/">Mundoplus</a> con notas de Zallatel sobre recepción y sintonización.</p><ul id="news-items" class="steps" hidden></ul>
<nav class="town-service-menu" aria-labelledby="news-towns-title"><h3 id="news-towns-title">Encuentra un antenista en tu pueblo</h3><div id="news-towns"><!-- NEWS_TOWNS --></div><p><a href="/#zonas">Ver todas las zonas</a></p></nav></div></section>`;
const page = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${DOMAIN}/blog/"><link rel="stylesheet" href="/assets/site.css?v=zallatel-1"><link rel="stylesheet" href="/assets/service-guides.css"><style>.news-town-links{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;padding-top:8px;border-top:1px solid var(--line);font-size:.88em}.news-town-links a{overflow-wrap:anywhere}</style><script src="/assets/site.js" defer></script><script src="/assets/news.js?v=3" defer></script></head><body class="service-page"><a class="skip" href="#contenido">Saltar al contenido</a>${header}<main id="contenido">${content}</main>${footer}</body></html>`;

fs.mkdirSync(path.join(root, 'blog'), { recursive: true });
fs.writeFileSync(path.join(root, 'blog/index.html'), page);
fs.writeFileSync(homeFile, home);
fs.copyFileSync('src/news.js', path.join(root, 'assets/news.js'));
