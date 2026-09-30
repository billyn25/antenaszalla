import { brandMark } from './logo.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const phone = '670 042 626';
const tel = '+34670042626';
const whatsapp = '34670042626';
const domain = 'https://antenaszalla.com';

const legalLinks = '<nav class="legal-links" aria-label="Información legal"><a href="/aviso-legal.html">Aviso legal</a><span class="legal-sep" aria-hidden="true">·</span><a href="/privacidad.html">Privacidad y RGPD</a><span class="legal-sep" aria-hidden="true">·</span><a href="/cookies.html">Cookies</a></nav>';

const cookieNotice = `<aside class="cookie-notice" data-cookie-notice hidden aria-label="Información sobre cookies y privacidad"><div class="cookie-notice-copy"><strong>Privacidad clara, sin cookies publicitarias</strong><p>Antenas Zalla no utiliza cookies de analítica, publicidad ni seguimiento en esta versión. Solo guardamos en este navegador que ya has cerrado este aviso.</p></div><div class="cookie-notice-actions"><a href="/cookies.html">Política de cookies</a><button type="button" data-cookie-dismiss>Entendido</button></div></aside>`;

function injectShared(html) {
  if (!html.includes('class="legal-links"')) {
    html = html.replace('<p class="fine">', `${legalLinks}<p class="fine">`);
  }
  if (!html.includes('data-cookie-notice')) {
    if (html.includes('<div class="mobilebar">')) {
      html = html.replace('<div class="mobilebar">', `${cookieNotice}<div class="mobilebar">`);
    } else {
      html = html.replace('</body>', `${cookieNotice}</body>`);
    }
  }
  return html;
}

function legalHead(title, description, route) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Antenas Zalla</title><meta name="description" content="${description}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${domain}${route}"><meta name="theme-color" content="#222327"><link rel="stylesheet" href="/assets/site.css?v=cabecera-hero-2"><script src="/assets/site.js" defer></script></head>`;
}

function legalHeader() {
  return `<div class="legal-top"><div class="wrap legal-top-inner"><a class="legal-home" href="/" aria-label="Antenas Zalla, inicio">${brandMark()}<span class="legal-home-subtitle">Antenas · Porteros · Videoporteros</span></a><a class="legal-phone" href="tel:${tel}"><small>Contacto directo</small><strong>${phone}</strong></a></div></div>`;
}

function legalFooter() {
  return `<footer class="footer legal-footer"><div class="wrap"><div class="foot-grid"><div><strong>Antenas Zalla</strong><p>Instalación y reparación de antenas, porteros automáticos y videoporteros.</p></div><div><strong>Contacto</strong><p><a href="tel:${tel}">${phone}</a><br><a href="https://wa.me/${whatsapp}">WhatsApp</a></p></div><div><strong>Información</strong>${legalLinks}</div></div><p class="fine">Antenas Zalla · Propiedad de R.F.G. · ${phone}</p></div></footer><div class="mobilebar"><a href="tel:${tel}">☎ ${phone}</a><a href="https://wa.me/${whatsapp}">WhatsApp</a></div>`;
}

function page({title, description, route, kicker, lead, body}) {
  return `${legalHead(title, description, route)}<body>${legalHeader()}<main class="legal-page"><section class="legal-hero"><div class="wrap"><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${lead}</p></div></section><section class="legal-content"><div class="wrap legal-layout"><article class="legal-copy">${body}<p class="legal-updated">Última actualización: 23 de septiembre de 2026.</p></article><aside class="legal-aside"><strong>Información legal</strong><p>Documentación del sitio y tratamiento de la información.</p><a href="/aviso-legal.html"${route==='/aviso-legal.html'?' aria-current="page"':''}>Aviso legal</a><a href="/privacidad.html"${route==='/privacidad.html'?' aria-current="page"':''}>Privacidad y RGPD</a><a href="/cookies.html"${route==='/cookies.html'?' aria-current="page"':''}>Cookies</a><a href="/">Volver a la web</a></aside></div></section></main>${legalFooter()}${cookieNotice}</body></html>`;
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

for (const file of walk(root)) {
  if (!file.endsWith('.html')) continue;
  fs.writeFileSync(file, injectShared(fs.readFileSync(file, 'utf8')));
}

fs.writeFileSync(path.join(root, 'aviso-legal.html'), page({
  title:'Aviso legal',
  description:'Aviso legal de Antenas Zalla con los datos disponibles del titular, medios de contacto, condiciones de uso y responsabilidad del sitio web.',
  route:'/aviso-legal.html',
  kicker:'Información del titular',
  lead:'Datos disponibles del responsable de antenaszalla.com y condiciones generales de uso de la web.',
  body:`
<h2>Datos disponibles del titular</h2>
<dl class="legal-data">
  <div><dt>Nombre comercial</dt><dd>Antenas Zalla</dd></div>
  <div><dt>Titular</dt><dd>R.F.G.</dd></div>
  <div><dt>Sitio web</dt><dd>antenaszalla.com</dd></div>
  <div><dt>Teléfono</dt><dd><a href="tel:${tel}">${phone}</a></dd></div>
  <div><dt>Contacto por mensajería</dt><dd><a href="https://wa.me/${whatsapp}">WhatsApp</a></dd></div>
</dl>
<h2>Finalidad del sitio</h2>
<p>Antenas Zalla informa sobre servicios de instalación, reparación y mantenimiento de antenas TDT, parabólicas, porteros automáticos, videoporteros, amplificación y otros trabajos técnicos relacionados.</p>
<h2>Condiciones de uso</h2>
<p>El acceso a esta web implica un uso responsable, lícito y respetuoso con los derechos de terceros. La información publicada tiene finalidad informativa y comercial y no sustituye la revisión de una instalación concreta.</p>
<h2>Propiedad intelectual</h2>
<p>Los textos, diseño, elementos gráficos, marca y demás contenidos propios de la web están protegidos por la normativa aplicable. No se autoriza su explotación fuera de los usos permitidos legalmente sin autorización del titular.</p>
<h2>Enlaces y servicios externos</h2>
<p>La web facilita enlaces a servicios externos, como WhatsApp. Al utilizarlos abandonas el entorno controlado por Antenas Zalla y pasan a aplicarse también las condiciones y políticas del proveedor correspondiente.</p>
<h2>Responsabilidad</h2>
<p>Antenas Zalla procura mantener la información accesible y actualizada, pero no puede garantizar la ausencia absoluta de interrupciones, errores técnicos o cambios en servicios de terceros.</p>
<h2>Legislación aplicable</h2>
<p>El uso de esta web se rige por la legislación española, sin perjuicio de los derechos que correspondan a consumidores y usuarios.</p>`
}));

fs.writeFileSync(path.join(root, 'privacidad.html'), page({
  title:'Privacidad y RGPD',
  description:'Política de privacidad de Antenas Zalla: datos tratados al contactar, finalidades, base jurídica, conservación, destinatarios y derechos.',
  route:'/privacidad.html',
  kicker:'Protección de datos',
  lead:'Explicamos qué información puede tratarse cuando contactas con Antenas Zalla y para qué se utiliza.',
  body:`
<h2>Responsable</h2>
<dl class="legal-data">
  <div><dt>Responsable</dt><dd>R.F.G. · Antenas Zalla</dd></div>
  <div><dt>Web</dt><dd>antenaszalla.com</dd></div>
  <div><dt>Teléfono</dt><dd><a href="tel:${tel}">${phone}</a></dd></div>
  <div><dt>WhatsApp</dt><dd><a href="https://wa.me/${whatsapp}">Abrir conversación</a></dd></div>
</dl>
<h2>Qué datos podemos tratar</h2>
<p>La web no dispone de formulario de contacto. Si llamas o escribes por WhatsApp, podremos tratar los datos que facilites voluntariamente para entender y atender tu solicitud: por ejemplo nombre, teléfono, localidad o dirección del servicio, tipo de inmueble y detalles de la avería o instalación.</p>
<h2>Finalidades</h2>
<ul><li>Responder consultas y solicitudes de presupuesto.</li><li>Organizar avisos, visitas, instalaciones y reparaciones.</li><li>Mantener las comunicaciones necesarias durante la prestación del servicio.</li><li>Cumplir obligaciones administrativas o legales cuando correspondan.</li></ul>
<h2>Base jurídica</h2>
<p>El tratamiento se basa, según el caso, en las medidas solicitadas por la persona interesada antes de contratar, en la ejecución de la relación de servicio y en el cumplimiento de obligaciones legales.</p>
<h2>Destinatarios</h2>
<p>No se prevén cesiones de datos salvo obligación legal o cuando sean necesarias para prestar el servicio solicitado. Si eliges WhatsApp, la comunicación se realiza mediante una plataforma externa y queda sujeta también a sus condiciones y política de privacidad.</p>
<h2>Conservación</h2>
<p>Los datos se conservarán durante el tiempo necesario para atender la consulta o prestar el servicio y, posteriormente, durante los plazos exigibles para atender obligaciones legales y posibles responsabilidades.</p>
<h2>Derechos</h2>
<p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación y, cuando corresponda, portabilidad de tus datos. Puedes iniciar la solicitud a través de los medios de contacto publicados en esta web. Podrá pedirse información adicional para verificar la identidad de quien ejerce el derecho.</p>
<p>Si consideras que el tratamiento no se ajusta a la normativa, puedes presentar una reclamación ante la <a href="https://www.aepd.es/" rel="noopener noreferrer">Agencia Española de Protección de Datos</a>.</p>
<h2>Decisiones automatizadas</h2>
<p>Esta web no realiza decisiones automatizadas ni elaboración de perfiles de usuarios.</p>`
}));

fs.writeFileSync(path.join(root, 'cookies.html'), page({
  title:'Política de cookies',
  description:'Política de cookies de Antenas Zalla: la web no usa cookies analíticas, publicitarias ni de seguimiento y explica su almacenamiento técnico local.',
  route:'/cookies.html',
  kicker:'Transparencia web',
  lead:'Esta versión funciona sin analítica de comportamiento, publicidad personalizada ni seguimiento del usuario.',
  body:`
<h2>Situación actual</h2>
<p>Antenas Zalla no utiliza cookies propias de analítica, publicidad, perfiles o seguimiento en esta versión de la web.</p>
<h2>Almacenamiento técnico del aviso</h2>
<p>Cuando pulsas “Entendido” en el aviso de privacidad, el navegador guarda localmente la clave <code>antenaszalla-cookie-info-v1</code> para recordar que ya has cerrado ese mensaje. Esta preferencia no se utiliza para medir visitas, crear perfiles ni mostrar publicidad.</p>
<h2>Servicios externos</h2>
<p>La web contiene enlaces a servicios externos, como WhatsApp. Las cookies o tecnologías que esos proveedores utilicen cuando accedes a sus plataformas dependen de sus propias políticas.</p>
<h2>Gestión desde el navegador</h2>
<p>Los navegadores permiten consultar, bloquear o eliminar cookies y otros datos almacenados desde sus opciones de privacidad y configuración.</p>
<h2>Cambios futuros</h2>
<p>Si Antenas Zalla incorpora en el futuro analítica, publicidad u otras tecnologías que requieran consentimiento, el sistema de información y elección se modificará antes de activarlas.</p>`
}));

console.log('LEGAL/PRIVACIDAD OK: R.F.G., teléfono, WhatsApp, políticas ampliadas y aviso informativo sin rastreo.');
