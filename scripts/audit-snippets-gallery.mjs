import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'local-pages-manifest.json'), 'utf8'));
const titles = new Set();
const descriptions = new Set();
let maxTitle = 0;
let maxDescription = 0;
let over65 = 0;
let over160 = 0;

for (const page of manifest) {
  const file = path.join(root, page.path.replace(/^\//, ''));
  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/)?.[1] || '';
  const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1] || '';
  if (!title || !description) throw new Error(`${page.path}: faltan title o description`);
  if (!title.includes(page.name)) throw new Error(`${page.path}: el title ha perdido el nombre de la localidad`);
  if (!/Urgencias 24h/i.test(title)) throw new Error(`${page.path}: title sin Urgencias 24h`);
  if (!description.includes(page.name) || !description.includes(page.province)) throw new Error(`${page.path}: meta sin localidad/provincia`);
  if (!description.includes('946 390 339')) throw new Error(`${page.path}: meta sin teléfono`);
  if (!/Urgencias 24h/i.test(description)) throw new Error(`${page.path}: meta sin Urgencias 24h`);
  if (title.length > 70) throw new Error(`${page.path}: title demasiado largo (${title.length})`);
  if (description.length > 165) throw new Error(`${page.path}: meta description demasiado larga (${description.length})`);
  if (titles.has(title)) throw new Error(`${page.path}: title duplicado`);
  if (descriptions.has(description)) throw new Error(`${page.path}: meta description duplicada`);
  titles.add(title);
  descriptions.add(description);
  maxTitle = Math.max(maxTitle, title.length);
  maxDescription = Math.max(maxDescription, description.length);
  if (title.length > 65) over65++;
  if (description.length > 160) over160++;
}

const homeFile = path.join(root, 'index.html');
const home = fs.readFileSync(homeFile, 'utf8');
if (!home.includes('id="galeria"')) throw new Error('Portada: falta la galería');
if (!home.includes('id="rapid-gallery-style"')) throw new Error('Portada: faltan estilos de galería');
const galleryImgs = [...home.matchAll(/<img src="\/assets\/galeria\/([^"]+)"/g)].map(m => m[1]);
if (galleryImgs.length < 4) throw new Error(`Galería: solo ${galleryImgs.length} imágenes`);
for (const name of galleryImgs) {
  const file = path.join(root, 'assets', 'galeria', name);
  if (!fs.existsSync(file) || fs.statSync(file).size < 2000) throw new Error(`Galería: imagen local inválida ${name}`);
}
if (/www\.antenaszalla\.com\/img\/galeria/i.test(home)) throw new Error('Galería: la portada todavía enlaza imágenes remotas');

if (!home.includes('class="legal-links"')) throw new Error('Portada: faltan enlaces legales');
if (!home.includes('class="legal-sep"')) throw new Error('Portada: faltan separadores legales controlados');
const css = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');
if (!/@media\(max-width:640px\)[\s\S]*?\.legal-sep\{display:none\}/.test(css)) {
  throw new Error('Pie legal: los separadores no se ocultan en móvil');
}
for (const href of ['/aviso-legal.html','/privacidad.html','/cookies.html']) {
  if (!home.includes(`href="${href}"`)) throw new Error(`Portada: falta ${href}`);
}

console.log(`SNIPPETS/GALERÍA OK: ${manifest.length} páginas locales; title máx. ${maxTitle} (${over65} >65), meta máx. ${maxDescription} (${over160} >160); ${galleryImgs.length} imágenes locales; footer legal móvil correcto.`);
