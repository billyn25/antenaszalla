import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.PRODUCTION_ROOT || 'dist');
const domain = 'https://antenaszalla.com';

if (!fs.existsSync(root)) throw new Error(`No existe el paquete a auditar: ${root}`);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function decodeXml(value) {
  return String(value).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function sitemapKey(url) {
  const first = new URL(url).pathname.split('/').filter(Boolean)[0] || '';
  if (/^Antenas-/i.test(first)) return first.replace(/^Antenas-/i, '').toLowerCase();
  return 'core';
}

const htmlFiles = walk(root).filter(file => file.endsWith('.html'));
const excluded = new Set(['404.html', 'aviso-legal.html', 'privacidad.html', 'cookies.html']);
const expectedCanonicals = [];

for (const file of htmlFiles) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  if (/ANTENAS\s+RAPID|Antenas\s+Rapid/i.test(html)) throw new Error(`${rel}: conserva identidad Antenas Rapid`);
  if (/946\s*390\s*339|\+?34946390339/.test(html)) throw new Error(`${rel}: conserva el teléfono antiguo`);
  if (/https:\/\/www\.antenaszalla\.com/i.test(html)) throw new Error(`${rel}: conserva URLs www en lugar del dominio principal`);
  if (excluded.has(rel)) continue;

  if (!html.includes('<meta name="robots" content="index,follow">')) {
    throw new Error(`${rel}: falta index,follow en el paquete final`);
  }
  if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*(?:noindex|nofollow)/i.test(html)) {
    throw new Error(`${rel}: conserva noindex/nofollow en el paquete final`);
  }
  if (/\b(?:noindex|nofollow)\b/i.test(html.replace(/<meta\s+name=["']robots["'][^>]*>/gi,''))) {
    throw new Error(`${rel}: aparece una directiva noindex/nofollow residual fuera del meta robots final`);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) throw new Error(`${rel}: falta canonical`);
  if (!canonical.startsWith(domain + '/')) throw new Error(`${rel}: canonical incorrecto ${canonical}`);
  expectedCanonicals.push(canonical);
}

if (expectedCanonicals.length < 1809) {
  throw new Error(`Paquete final incompleto: ${expectedCanonicals.length}/1809 páginas indexables mínimas (1798 pueblos + 10 provincias + portada)`);
}
if (new Set(expectedCanonicals).size !== expectedCanonicals.length) {
  throw new Error('Canonicals duplicados en el paquete final');
}


const expectedGroups = new Map();
for (const url of expectedCanonicals) {
  const key = sitemapKey(url);
  if (!expectedGroups.has(key)) expectedGroups.set(key, new Set());
  expectedGroups.get(key).add(url);
}

const sitemapFile = path.join(root, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) throw new Error('Falta sitemap.xml');
const sitemapIndex = fs.readFileSync(sitemapFile, 'utf8');
if (!/<sitemapindex\b/i.test(sitemapIndex)) throw new Error('sitemap.xml no es un sitemap index');

const childLocs = [...sitemapIndex.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>\s*<\/sitemap>/g)]
  .map(match => decodeXml(match[1]));

if (!childLocs.length) throw new Error('El sitemap index no contiene sitemaps hijos');
if (new Set(childLocs).size !== childLocs.length) throw new Error('El sitemap index contiene hijos duplicados');
if (childLocs.length !== expectedGroups.size) {
  throw new Error(`Sitemap index incompleto: ${childLocs.length} hijos frente a ${expectedGroups.size} grupos esperados`);
}

const seenUrls = [];
const seenByKey = new Map();

for (const childUrl of childLocs) {
  if (!childUrl.startsWith(domain + '/sitemaps/sitemap-') || !childUrl.endsWith('.xml')) {
    throw new Error(`Sitemap hijo con URL inesperada: ${childUrl}`);
  }
  const relative = new URL(childUrl).pathname.replace(/^\//, '');
  const childFile = path.join(root, relative);
  if (!fs.existsSync(childFile)) throw new Error(`Falta sitemap hijo ${relative}`);

  const xml = fs.readFileSync(childFile, 'utf8');
  if (!/<urlset\b/i.test(xml)) throw new Error(`${relative}: no contiene urlset`);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decodeXml(match[1]));
  if (!urls.length) throw new Error(`${relative}: sitemap vacío`);
  if (new Set(urls).size !== urls.length) throw new Error(`${relative}: URLs duplicadas`);
  if (urls.some(url => !url.startsWith(domain + '/'))) throw new Error(`${relative}: URL fuera del dominio final`);

  const key = path.basename(relative, '.xml').replace(/^sitemap-/, '');
  if (!expectedGroups.has(key)) throw new Error(`${relative}: grupo no esperado ${key}`);
  const expected = expectedGroups.get(key);
  const actual = new Set(urls);
  const missing = [...expected].filter(url => !actual.has(url));
  const extra = urls.filter(url => !expected.has(url));
  if (missing.length || extra.length) {
    throw new Error(`${relative}: no coincide con su grupo. Faltan=${missing.slice(0,5).join(', ')} Extras=${extra.slice(0,5).join(', ')}`);
  }

  seenByKey.set(key, urls.length);
  seenUrls.push(...urls);
}

if (new Set(seenUrls).size !== seenUrls.length) throw new Error('Una URL aparece en más de un sitemap hijo');
const expectedSet = new Set(expectedCanonicals);
const seenSet = new Set(seenUrls);
const missingGlobal = expectedCanonicals.filter(url => !seenSet.has(url));
const extraGlobal = seenUrls.filter(url => !expectedSet.has(url));
if (missingGlobal.length || extraGlobal.length || seenUrls.length !== expectedCanonicals.length) {
  throw new Error(`Sitemaps no coinciden con canonicals. Faltan=${missingGlobal.slice(0,5).join(', ')} Extras=${extraGlobal.slice(0,5).join(', ')}`);
}

const robotsFile = path.join(root, 'robots.txt');
if (!fs.existsSync(robotsFile)) throw new Error('Falta robots.txt');
const robots = fs.readFileSync(robotsFile, 'utf8');
if (!/^User-agent:\s*\*$/mi.test(robots) || !/^Allow:\s*\/$/mi.test(robots)) {
  throw new Error('robots.txt no permite rastreo general');
}
if (!robots.includes(`Sitemap: ${domain}/sitemap.xml`)) {
  throw new Error('robots.txt no declara el sitemap index final');
}
if (/^Disallow:\s*\/$/mi.test(robots)) throw new Error('robots.txt bloquea el rastreo');

const manifestFile = path.join(root, 'local-pages-manifest.json');
if (!fs.existsSync(manifestFile)) throw new Error('Falta local-pages-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
if (manifest.length !== 1798) throw new Error(`Manifiesto local incompleto: ${manifest.length}/1798 páginas`);

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const provinceSegments = new Set();

for (const page of manifest) {
  const cleanPath = String(page.path || '').replace(/^\//, '');
  const segment = cleanPath.split('/')[0];
  if (!/^Antenas-/i.test(segment)) throw new Error(`Ruta local fuera de provincia: ${page.path}`);
  provinceSegments.add(segment);

  const townFile = path.join(root, cleanPath);
  if (!fs.existsSync(townFile)) throw new Error(`Falta HTML local ${page.path}`);

  const provinceFile = path.join(root, segment, 'index.html');
  if (!fs.existsSync(provinceFile)) throw new Error(`Falta página provincial /${segment}/`);
  const provinceHtml = fs.readFileSync(provinceFile, 'utf8');
  const exact = `href="${page.path}"`;
  const pretty = `href="${String(page.path).replace(/\.html$/, '')}"`;
  if (!provinceHtml.includes(exact) && !provinceHtml.includes(pretty)) {
    throw new Error(`/${segment}/: falta enlace a ${page.path}`);
  }
}

if (provinceSegments.size !== 10) throw new Error(`Cobertura provincial incompleta: ${provinceSegments.size}/10`);
for (const segment of provinceSegments) {
  if (!home.includes(`href="/${segment}/"`)) throw new Error(`Portada: falta enlace a /${segment}/`);
  const key = segment.replace(/^Antenas-/i, '').toLowerCase();
  if (!seenByKey.has(key)) throw new Error(`Falta sitemap provincial para ${segment}`);
}

const headersFile = path.join(root, '_headers');
if (fs.existsSync(headersFile)) {
  const headers = fs.readFileSync(headersFile, 'utf8');
  if (/X-Robots-Tag:\s*noindex/i.test(headers)) throw new Error('_headers conserva noindex global');
}

if (fs.existsSync(path.join(root, 'preview-manifest.json'))) {
  throw new Error('El paquete final conserva preview-manifest.json');
}

for (const legal of ['aviso-legal.html', 'privacidad.html', 'cookies.html']) {
  const file = path.join(root, legal);
  if (!fs.existsSync(file)) throw new Error(`Falta ${legal}`);
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('class="legal-page"') || !html.includes('data-cookie-notice')) throw new Error(`${legal}: cierre legal/privacidad incompleto`);
}
const siteJs = fs.readFileSync(path.join(root, 'assets', 'site.js'), 'utf8');
if (!siteJs.includes('antenaszalla-cookie-info-v1')) throw new Error('Producción: falta memoria técnica del aviso de privacidad');
if (/gtag\(|googletagmanager|google-analytics|clarity\(|fbq\(/i.test(siteJs)) throw new Error('Producción: tracking inesperado sin consentimiento');

console.log(`PAQUETE PRODUCCIÓN OK: ${expectedCanonicals.length} URLs indexables; ${provinceSegments.size} provincias con sitemap propio + core, robots abierto, canonicals únicos, enlazado provincial completo y 0 URLs fuera del índice.`);
