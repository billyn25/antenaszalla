import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');

const PHONE = '670 042 626';
const TEL = '+34670042626';
const DOMAIN = 'https://antenaszalla.com';

fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
const heroSource=path.join('src','assets','hero-zalla.jpg.png');
const heroTarget=path.join(root,'assets','hero-zallatel.png');
if(fs.existsSync(heroSource)) fs.copyFileSync(heroSource,heroTarget);


const home = path.join(root, 'index.html');
if (fs.existsSync(home)) {
  let html = fs.readFileSync(home, 'utf8');
  html = html.replace(/<section class="section soft" id="paginas-locales">[\s\S]*?<\/section>/, '');
  fs.writeFileSync(home, html);
}

const historicRoutes = new Map([
  ['/Antenas-Burgos/aranda-de-duero.html', '/Antenas-Burgos/aranda_duero.html']
]);

const manifestFile = path.join(root, 'local-pages-manifest.json');
let localPages = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : [];

for (const page of localPages) {
  const historic = historicRoutes.get(page.path);
  if (!historic) continue;
  const oldFile = path.join(root, page.path.slice(1));
  const newFile = path.join(root, historic.slice(1));
  if (fs.existsSync(oldFile)) {
    fs.mkdirSync(path.dirname(newFile), { recursive: true });
    fs.renameSync(oldFile, newFile);
  }
  page.path = historic;
}

function replaceHistoricRoutes(text) {
  for (const [from, to] of historicRoutes) {
    text = text.replaceAll(from, to).replaceAll(`${DOMAIN}${from}`, `${DOMAIN}${to}`);
  }
  return text;
}

if (localPages.length) {
  fs.writeFileSync(manifestFile, JSON.stringify(localPages, null, 2));
  const previewFile = path.join(root, 'preview-manifest.json');
  if (fs.existsSync(previewFile)) fs.writeFileSync(previewFile, replaceHistoricRoutes(fs.readFileSync(previewFile, 'utf8')));
}

const urgentStyles = '';

function moveSectionBefore(html, sectionId, beforeId) {
  const sectionStart = html.indexOf(`<section class="section wrap" id="${sectionId}">`);
  const beforeStart = html.indexOf(`<section class="doorphones section" id="${beforeId}">`);
  if (sectionStart < 0 || beforeStart < 0 || sectionStart < beforeStart) return html;
  const nextSection = html.indexOf('<section ', sectionStart + 9);
  if (nextSection < 0) return html;
  const block = html.slice(sectionStart, nextSection);
  const without = html.slice(0, sectionStart) + html.slice(nextSection);
  const insertAt = without.indexOf(`<section class="doorphones section" id="${beforeId}">`);
  if (insertAt < 0) return html;
  return without.slice(0, insertAt) + block + without.slice(insertAt);
}

const byProvince = new Map();
for (const page of localPages) {
  if (!byProvince.has(page.province)) byProvince.set(page.province, []);
  byProvince.get(page.province).push(page);
}
for (const list of byProvince.values()) list.sort((a,b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

function relatedTownBlock(page) {
  const list = byProvince.get(page.province) || [];
  if (list.length < 2) return '';
  const index = list.findIndex(p => p.path === page.path);
  const selected = [];
  for (const offset of [-3,-2,-1,1,2,3,4,-4]) {
    if (selected.length >= 6) break;
    const candidate = list[(index + offset + list.length) % list.length];
    if (candidate && candidate.path !== page.path && !selected.some(x => x.path === candidate.path)) selected.push(candidate);
  }
  return `<section class="related-towns-section" aria-label="Otros pueblos de ${page.province}"><div class="wrap"><div class="related-towns"><h3>Servicio de antenista en otros pueblos de ${page.province}</h3><p>Consulta también nuestras páginas de servicio en otros municipios de la provincia.</p><div class="related-town-links">${selected.map(p => `<a href="${p.path}">${p.name}</a>`).join('')}</div></div></div></section>`;
}

function stableHash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function seoTitle(page) {
  const v = stableHash(`${page.province}|${page.name}|title`) % 4;
  const patterns = [
    `Antenista en ${page.name}, ${page.province} · Urgencias 24h | ${PHONE}`,
    `Reparación de antenas en ${page.name} · Urgencias 24h | ${PHONE}`,
    `Técnico de antenas en ${page.name}, ${page.province} · Urgencias 24h | ${PHONE}`,
    `Antenas y porteros en ${page.name}, ${page.province} · Urgencias 24h | ${PHONE}`
  ];
  return patterns[v];
}

function seoDescription(page) {
  const v = stableHash(`${page.province}|${page.name}|description`) % 6;
  const patterns = [
    `Antenista en ${page.name}, ${page.province}. Urgencias 24h · ${PHONE}. Reparación e instalación de TDT, parabólicas, amplificación, porteros automáticos y videoporteros.`,
    `Urgencias 24h en ${page.name}, ${page.province} · ${PHONE}. Técnico para antenas TDT, señal, parabólicas, amplificadores, porteros automáticos y videoporteros.`,
    `Reparación de antenas en ${page.name}, ${page.province}. Urgencias 24h · ${PHONE}. TDT, satélite, antenas colectivas, porteros automáticos y videoporteros.`,
    `Técnico de antenas en ${page.name}, ${page.province} · ${PHONE}. Urgencias 24h, TDT, parabólicas, amplificación, porteros automáticos y cobertura móvil 4G/5G.`,
    `Servicio de antenista en ${page.name}, ${page.province}. ${PHONE} · Urgencias 24h. Averías de señal, TDT, parabólicas, porteros automáticos y videoporteros.`,
    `Antenas Zallatel en ${page.name}, ${page.province} · Urgencias 24h · ${PHONE}. Antenas individuales y colectivas, TDT, satélite, porteros y videoporteros.`
  ];
  return patterns[v];
}

function serviceSchema(page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${DOMAIN}${page.path}#servicio`,
    name: `Instalación y reparación de antenas en ${page.name}, ${page.province}`,
    url: `${DOMAIN}${page.path}`,
    telephone: TEL,
    provider: {
      '@type': 'Organization',
      '@id': `${DOMAIN}/#organizacion`,
      name: 'Antenas Zallatel',
      url: `${DOMAIN}/`,
      telephone: TEL
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: `${page.name}, ${page.province}`
    },
    serviceType: [
      'Instalación y reparación de antenas TDT',
      'Antenas individuales y colectivas',
      'Antenas parabólicas',
      'Amplificación y distribución de señal',
      'Porteros automáticos y videoporteros',
      'Cobertura móvil 4G/5G en vivienda individual'
    ]
  };
}

function strengthenLocalSeo(html, page) {
  const currentTitle = html.match(/<title>(.*?)<\/title>/)?.[1];
  const title = seoTitle(page);
  if (currentTitle) {
    html = html.replace(`<title>${currentTitle}</title>`, `<title>${title}</title>`);
    html = html.replace(`<meta property="og:title" content="${currentTitle}">`, `<meta property="og:title" content="${title}">`);
  }

  const currentDesc = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
  const description = seoDescription(page);
  if (currentDesc) {
    html = html.replace(`<meta name="description" content="${currentDesc}">`, `<meta name="description" content="${description}">`);
    html = html.replace(`<meta property="og:description" content="${currentDesc}">`, `<meta property="og:description" content="${description}">`);
  }

  if (!html.includes('id="local-service-schema"')) {
    const schema = JSON.stringify(serviceSchema(page)).replace(/</g, '\\u003c');
    html = html.replace('</head>', `<script id="local-service-schema" type="application/ld+json">${schema}</script></head>`);
  }

  if (!html.includes('class="related-towns"')) {
    const block = relatedTownBlock(page);
    if (block) html = html.replace('<section class="section wrap faq" id="preguntas">', block + '<section class="section wrap faq" id="preguntas">');
  }
  return html;
}

function fixHtml(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) fixHtml(file);
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      let html = replaceHistoricRoutes(fs.readFileSync(file, 'utf8')).replaceAll('Antennistas', 'Antenistas');

      html = moveSectionBefore(html, 'servicios', 'porteros-videoporteros');

                  if (!html.includes('id="urgent-24h-style"')) html = html.replace('</head>', urgentStyles + '</head>');

      html = html.replaceAll('>Porteros y videoporteros<', '>Porteros automáticos y videoporteros<');
      html = html.replaceAll('<strong>Porteros y videoporteros</strong>', '<strong>Porteros automáticos y videoporteros</strong>');
      if (!html.includes('<span>Cobertura móvil 4G/5G</span>')) {
        html = html.replace('<span>Porteros automáticos y videoporteros</span><span>Instalación y mantenimiento</span>', '<span>Porteros automáticos y videoporteros</span><span>Cobertura móvil 4G/5G</span><span>Instalación y mantenimiento</span>');
      }

      const rel = '/' + path.relative(root, file).split(path.sep).join('/');
      const page = localPages.find(p => p.path === rel);
      if (page) html = strengthenLocalSeo(html, page);

      fs.writeFileSync(file, html);
    }
  }
}
fixHtml(root);

console.log(`ASSET/HTML OK: ${localPages.length} páginas locales con bloque de pueblos centrado, titles/metas variados, schema Service sin dirección ficticia, interlinking provincial, Urgencias 24h y URLs históricas preservadas.`);
