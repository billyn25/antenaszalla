import fs from 'node:fs';
import path from 'node:path';

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
    `Antenas Zallatel en ${page.name}, ${page.province}. ${PHONE}. Urgencias 24h para TDT, parabólicas, señal, porteros automáticos y videoporteros.`,
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

// Galería procedente de los recursos fotográficos indicados por el propietario.
// Las imágenes se descargan durante el build y Antenas Zallatel las sirve desde /assets/galeria/;
// no quedan enlazadas externamente a Antenas Zallatel.
// antena5.jpg se excluye expresamente porque muestra la fachada de Antenas Zallatel.
const gallerySources = [
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-01.jpg', alt: 'Videoportero' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-02.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-03.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-04.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-05.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-06.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-07.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-08.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-09.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-10.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-11.jpg', alt: 'Trabajo técnico de antena' },
  { url: 'https://antenaszalla.netlify.app/assets/galeria/trabajo-12.jpg', alt: 'Trabajo técnico de antena' }
];
const galleryDir = path.join(root, 'assets', 'galeria');
fs.rmSync(galleryDir, { recursive: true, force: true });
fs.mkdirSync(galleryDir, { recursive: true });
const imported = [];

for (const source of gallerySources) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(source.url, {
      headers: { 'user-agent': 'AntenasZalla-gallery-migration' },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('image/')) throw new Error(`Tipo inválido: ${type}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 2000) throw new Error('Imagen demasiado pequeña');
    const localName = `trabajo-${String(imported.length + 1).padStart(2, '0')}.jpg`;
    fs.writeFileSync(path.join(galleryDir, localName), bytes);
    imported.push({ name: localName, alt: source.alt });
  } catch (error) {
    throw new Error(`No se pudo migrar ${source.url}: ${error.message}`);
  }
}

if (imported.length !== 12) throw new Error(`La galería debe tener exactamente 12 imágenes y tiene ${imported.length}`);

const galleryStyle = `<style id="zalla-gallery-style">
.gallery-section{padding:48px 0;background:#fff;border-top:1px solid var(--line)}
.gallery-head{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:22px}
.gallery-head h2{margin:8px 0 0}.gallery-head p{max-width:580px;margin:0;color:var(--muted);font-size:14px}
.gallery-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.gallery-grid figure{margin:0;overflow:hidden;border-radius:12px;border:1px solid var(--line);background:#eceae6;aspect-ratio:4/3;box-shadow:0 8px 22px rgba(29,31,35,.07)}
.gallery-open{display:block;width:100%;height:100%;padding:0;border:0;background:transparent;cursor:zoom-in}
.gallery-grid img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .25s ease}
.gallery-open:hover img,.gallery-open:focus-visible img{transform:scale(1.025)}
.gallery-open:focus-visible{outline:3px solid var(--brand);outline-offset:-4px}
.gallery-lightbox{width:min(94vw,1180px);max-width:none;padding:0;border:0;border-radius:12px;background:#111;box-shadow:0 28px 90px rgba(0,0,0,.55)}
.gallery-lightbox::backdrop{background:rgba(8,9,12,.88);backdrop-filter:blur(2px)}
.gallery-lightbox-inner{position:relative;display:grid;place-items:center;min-height:200px}
.gallery-lightbox img{display:block;max-width:94vw;max-height:88vh;width:auto;height:auto;object-fit:contain}
.gallery-lightbox-close{position:absolute;z-index:2;top:12px;right:12px;width:44px;height:44px;border:0;border-radius:50%;background:rgba(20,20,22,.86);color:#fff;font-size:30px;line-height:1;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.3)}
.gallery-lightbox-close:hover{background:var(--brand)}
@media(max-width:900px){.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.gallery-section{padding:34px 0}.gallery-head{display:block}.gallery-head p{margin-top:8px}.gallery-grid{gap:9px}.gallery-grid figure{border-radius:9px}.gallery-lightbox{width:96vw}.gallery-lightbox img{max-width:96vw;max-height:82vh}.gallery-lightbox-close{top:8px;right:8px;width:42px;height:42px}}
</style>`;

const galleryHtml = `<section class="gallery-section" id="galeria"><div class="wrap"><div class="gallery-head"><div><span class="eyebrow">Trabajos e instalaciones</span><h2>Galería de trabajos</h2></div><p>Una muestra visual de instalaciones y trabajos técnicos de antena y videoportero.</p></div><div class="gallery-grid">${imported.map(item => `<figure><button class="gallery-open" type="button" data-src="/assets/galeria/${item.name}" data-alt="${item.alt}" aria-label="Ampliar: ${item.alt}"><img src="/assets/galeria/${item.name}" alt="${item.alt}" loading="lazy" decoding="async" width="640" height="480"></button></figure>`).join('')}</div></div></section><dialog class="gallery-lightbox" id="gallery-lightbox" aria-label="Imagen ampliada"><div class="gallery-lightbox-inner"><button class="gallery-lightbox-close" type="button" aria-label="Cerrar imagen">×</button><img src="" alt=""></div></dialog>`;

const galleryScript = `<script id="zalla-gallery-script">
(()=>{
  const dialog=document.getElementById('gallery-lightbox');
  if(!dialog) return;
  const modalImg=dialog.querySelector('img');
  const close=dialog.querySelector('.gallery-lightbox-close');
  let opener=null;
  document.querySelectorAll('.gallery-open').forEach(btn=>btn.addEventListener('click',()=>{
    opener=btn;
    modalImg.src=btn.dataset.src||'';
    modalImg.alt=btn.dataset.alt||'';
    dialog.showModal();
  }));
  const shut=()=>{if(dialog.open) dialog.close();};
  close.addEventListener('click',shut);
  dialog.addEventListener('click',event=>{if(event.target===dialog) shut();});
  dialog.addEventListener('close',()=>{modalImg.src='';if(opener) opener.focus();});
})();
</script>`;

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

console.log(`SEO/GALERÍA OK: ${localPages.length} páginas locales; title máx. ${maxTitle}, meta ${minDescription}-${maxDescription}; 12 imágenes migradas, sin fachada de Antenas Zallatel y con zoom modal accesible.`);
