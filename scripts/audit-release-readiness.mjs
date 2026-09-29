import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const domain = 'https://www.antenaszalla.com';
const forbiddenVisible = [
  /vista previa/i,
  /modo de revisión/i,
  /versión de revisión/i,
  /página de prueba/i,
  /página local generada/i,
  /generada para esa localidad/i,
  /selección parcial/i,
  /pendiente(?:s)? de revisión/i,
  /inventario .*revisión/i,
  /web actual permanece/i,
  /no sustituye la web actual/i,
  /\bnoindex\b/i,
  /\bpreview\b/i,
  /\bdemo\b/i,
  /\btest\b/i
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function visibleText(html) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
  return body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function existsForHref(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return fs.existsSync(path.join(root, 'index.html'));
  const rel = clean.replace(/^\//, '');
  const tries = [
    path.join(root, rel),
    path.join(root, rel + '.html'),
    path.join(root, rel, 'index.html')
  ];
  return tries.some(fs.existsSync);
}

const htmlFiles = walk(root).filter(f => f.endsWith('.html'));
let canonicals = 0;
let checkedLinks = 0;
const broken = [];

for (const file of htmlFiles) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  const visible = visibleText(html);

  for (const pattern of forbiddenVisible) {
    if (pattern.test(visible)) throw new Error(`${rel}: texto técnico/de desarrollo visible detectado: ${pattern}`);
  }
  if (/antenaszalla\.netlify\.app/i.test(html)) throw new Error(`${rel}: contiene referencia a Netlify`);

  const shouldHaveCanonical = rel === 'index.html' || rel.startsWith('Antenas-');
  if (shouldHaveCanonical) {
    const matches = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
    if (matches.length !== 1) throw new Error(`${rel}: debe tener exactamente un canonical`);
    if (!matches[0][1].startsWith(domain + '/')) throw new Error(`${rel}: canonical fuera del dominio final`);
    canonicals++;
  }

  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    checkedLinks++;
    if (!existsForHref(href)) broken.push(`${rel} -> ${href}`);
  }
}

if (broken.length) throw new Error(`Enlaces internos rotos (${broken.length}): ${broken.slice(0, 20).join(' | ')}`);

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const href of ['/aviso-legal.html','/privacidad.html','/cookies.html']) {
  if (!home.includes(`href="${href}"`)) throw new Error(`Portada: falta enlace legal ${href}`);
}
if (!home.includes('data-cookie-notice') || !home.includes('data-cookie-dismiss')) throw new Error('Portada: falta aviso informativo de privacidad/cookies');
const siteJs = fs.readFileSync(path.join(root, 'assets', 'site.js'), 'utf8');
if (!siteJs.includes('antenaszalla-cookie-info-v1') || !siteJs.includes('data-cookie-dismiss')) throw new Error('site.js: gestión del aviso informativo incompleta');
if (/gtag\(|googletagmanager|google-analytics|clarity\(|fbq\(/i.test(siteJs)) throw new Error('site.js: se ha detectado analítica o tracking no previsto');
for (const legal of ['aviso-legal.html','privacidad.html','cookies.html']) {
  const legalHtml = fs.readFileSync(path.join(root, legal), 'utf8');
  if (!legalHtml.includes('class="legal-page"') || !legalHtml.includes('class="legal-aside"')) throw new Error(`${legal}: diseño legal incompleto`);
  if (!legalHtml.includes('data-cookie-notice')) throw new Error(`${legal}: falta aviso informativo`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'local-pages-manifest.json'), 'utf8'));
if (!manifest.length) throw new Error('Manifiesto local vacío');
const services = JSON.parse(fs.readFileSync(path.resolve('content', 'services.json'), 'utf8'));
const provinceSegmentsForStats = new Set(manifest.map(page => String(page.path || '').replace(/^\//, '').split('/')[0]).filter(Boolean));
if (!home.includes('id="rapid-stats"') || !home.includes('id="rapid-stats-title"')) throw new Error('Portada: falta el bloque final de cifras');
const expectedStats = [manifest.length.toLocaleString('es-ES'), String(provinceSegmentsForStats.size), String(services.length)];
for (const value of expectedStats) if (!home.includes(`<strong>${value}</strong>`)) throw new Error(`Portada: cifra real ausente ${value}`);
for (const page of manifest) {
  if (!existsForHref(page.path)) throw new Error(`Falta HTML para ${page.path}`);
}

const cssFile = path.join(root, 'assets', 'site.css');
const css = fs.readFileSync(cssFile, 'utf8');
// Zalla usa una cabecera/hero responsive propios: se auditan sus reglas reales,
 // no los marcadores CSS heredados de Rapid.
if (!/@media\(max-width:760px\)[\s\S]*?\.head nav\{[^}]*overflow-x:auto!important/.test(css)) throw new Error('CSS Zalla: falta navegación móvil accesible');
if (!/@media\(max-width:760px\)[\s\S]*?\.hero-copy\{[^}]*background:rgba\(248,252,255,.96\)!important/.test(css)) throw new Error('CSS Zalla: el hero móvil no garantiza tarjeta legible');
if (!/@media\(max-width:760px\)[\s\S]*?\.hero \.actions\{[^}]*display:flex!important/.test(css)) throw new Error('CSS Zalla: faltan CTA de llamada/WhatsApp en hero móvil');
if (!/@media\(max-width:760px\)[\s\S]*?\.strip \.wrap\{[^}]*grid-template-columns:1fr 1fr!important/.test(css)) throw new Error('CSS Zalla: tira móvil no compacta');

console.log(`CIERRE PREPRODUCCIÓN OK: ${manifest.length} páginas locales, ${canonicals} canonicals finales, ${checkedLinks} enlaces internos comprobados, 0 rotos, 0 textos técnicos visibles y móvil Zalla legible y responsive.`);
