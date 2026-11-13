import fs from 'node:fs';
import path from 'node:path';
import {copyWorkGallery, renderWorkGallery, galleryStyle, galleryScript} from './work-gallery.mjs';

const root = path.resolve('dist');
const manifestFile = path.join(root, 'local-pages-manifest.json');
const PHONE = '670 042 626';
const MAX_TITLE = 70;
const MAX_DESCRIPTION = 165;
const MIN_DESCRIPTION = 115;

if (!fs.existsSync(manifestFile)) throw new Error('Falta local-pages-manifest.json');
const localPages = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));

function stableHash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function fitTitle(page, used) {
  const variants = [
    `Antenista en ${page.name} · Urgencias 24h | ${PHONE}`,
    `Reparación antenas ${page.name} · Urgencias 24h | ${PHONE}`,
    `Técnico antenas ${page.name} · Urgencias 24h | ${PHONE}`,
    `Antenas y porteros ${page.name} · Urgencias 24h | ${PHONE}`
  ];
  const start = stableHash(`${page.path}|title-final`) % variants.length;
  const ordered = [...variants.slice(start), ...variants.slice(0, start)];
  const fallbacks = [
    `Antenista en ${page.name} · Urgencias 24h`,
    `${page.name} · Antenista · Urgencias 24h`,
    `${page.name}, ${page.province} · Urgencias 24h`
  ];

  let title = [...ordered, ...fallbacks].find(value => value.length <= MAX_TITLE && !used.has(value));
  if (!title) title = `${page.name}, ${page.province} · Urgencias 24h`;
  if (used.has(title)) title = `${page.name} · ${page.province} · Urgencias 24h`;
  used.add(title);
  return title;
}

function fitDescription(page) {
  const variants = [
    `Antenista en ${page.name}, ${page.province}. Urgencias 24h: ${PHONE}. TDT, parabólicas, amplificación, porteros automáticos y videoporteros.`,
    `Reparación de antenas en ${page.name}, ${page.province}. ${PHONE}. Urgencias 24h, TDT, satélite, amplificación, porteros y videoporteros.`,
    `Técnico de antenas en ${page.name}, ${page.province}. Urgencias 24h: ${PHONE}. TDT, antenas colectivas, parabólicas, porteros y videoporteros.`,
    `Antenas Zalla en ${page.name}, ${page.province}. ${PHONE}. Urgencias 24h para TDT, parabólicas, señal, porteros automáticos y videoporteros.`,
    `Servicio de antenista en ${page.name}, ${page.province}. ${PHONE}. Urgencias 24h. TDT, amplificación, satélite, porteros y videoporteros.`,
    `Antenas y porteros en ${page.name}, ${page.province}. Urgencias 24h: ${PHONE}. TDT, parabólicas, amplificación y videoporteros.`
  ];
  const start = stableHash(`${page.path}|description-final`) % variants.length;
  const ordered = [...variants.slice(start), ...variants.slice(0, start)];
  let description = ordered.find(value => value.length >= MIN_DESCRIPTION && value.length <= MAX_DESCRIPTION);
  if (!description) description = ordered.find(value => value.length <= MAX_DESCRIPTION);
  if (!description) description = `Antenista en ${page.name}, ${page.province}. ${PHONE}. Urgencias 24h. TDT, parabólicas, porteros y videoporteros.`;
  if (description.length < MIN_DESCRIPTION) description += ' Instalación y reparación.';
  return description;
}

const usedTitles = new Set();
let maxTitle = 0;
let maxDescription = 0;
let minDescription = Infinity;
for (const page of localPages) {
  const file = path.join(root, page.path.replace(/^\//, ''));
  if (!fs.existsSync(file)) throw new Error(`Falta HTML local ${page.path}`);
  let html = fs.readFileSync(file, 'utf8');

  const oldTitle = html.match(/<title>(.*?)<\/title>/)?.[1];
  const oldDescription = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
  if (!oldTitle || !oldDescription) throw new Error(`${page.path}: faltan title o description`);

  const title = fitTitle(page, usedTitles);
  const description = fitDescription(page);
  maxTitle = Math.max(maxTitle, title.length);
  maxDescription = Math.max(maxDescription, description.length);
  minDescription = Math.min(minDescription, description.length);

  html = html.replace(`<title>${oldTitle}</title>`, `<title>${title}</title>`);
  html = html.replace(`<meta property="og:title" content="${oldTitle}">`, `<meta property="og:title" content="${title}">`);
  html = html.replace(`<meta name="description" content="${oldDescription}">`, `<meta name="description" content="${description}">`);
  html = html.replace(`<meta property="og:description" content="${oldDescription}">`, `<meta property="og:description" content="${description}">`);
  fs.writeFileSync(file, html);
}

// Las 12 fotografías originales se conservan en el repositorio y se sirven localmente.
const imported = copyWorkGallery(root);
const galleryHtml = renderWorkGallery(imported);

const homeFile = path.join(root, 'index.html');
let home = fs.readFileSync(homeFile, 'utf8');
if (!home.includes('id="zalla-gallery-style"')) home = home.replace('</head>', `${galleryStyle}</head>`);
if (!home.includes('id="galeria"')) {
  const marker = '<section class="section soft" id="zonas">';
  if (!home.includes(marker)) throw new Error('No se encontró el punto de inserción de la galería en portada');
  home = home.replace(marker, `${galleryHtml}${marker}`);
}
if (!home.includes('id="zalla-gallery-script"')) home = home.replace('</body>', `${galleryScript}</body>`);
fs.writeFileSync(homeFile, home);

console.log(`SEO/GALERÍA OK: ${localPages.length} páginas locales; title máx. ${maxTitle}, meta ${minDescription}-${maxDescription}; 12 fotografías originales de Antenas Zalla, con descripciones y zoom accesible.`);
