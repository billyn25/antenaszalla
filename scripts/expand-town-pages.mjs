import fs from 'node:fs';
import path from 'node:path';
import { pages, site, renderPage, routeFile, esc } from './build.mjs';
import { stableHash, slugifyTown } from './generate-town-pages.mjs';

const cachePath = path.resolve('.cache/municipios-selected.json');
if (!fs.existsSync(cachePath)) throw new Error('Falta .cache/municipios-selected.json; ejecuta fetch-municipalities.mjs antes.');
const dataset = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const provinces = pages.filter(p => p.type === 'province');
const explicitTowns = pages.filter(p => p.type === 'town');
const normalize = value => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const explicitByKey = new Map(explicitTowns.map(p => [`${p.parent}|${normalize(p.name)}`, p]));

const leadVariants = [
  (t,p) => `Servicio de antenista en ${t}, ${p}, para reparación e instalación de antenas TDT, parabólicas, amplificación, porteros automáticos y videoporteros.`,
  (t,p) => `Técnico de antenas en ${t}, ${p}, para viviendas, comunidades y pequeños negocios. Revisamos señal, distribución, porteros y cobertura móvil residencial.`,
  (t,p) => `Instalación y reparación de antenas en ${t}. TDT, satélite, amplificadores, cableado, porteros automáticos y videoporteros con atención por teléfono y WhatsApp.`,
  (t,p) => `Antenas Zallatel presta servicio en ${t}, ${p}, para averías de señal, instalaciones nuevas, antenas individuales y colectivas, porteros y videoporteros.`,
  (t,p) => `¿Necesitas antenista en ${t}? Atendemos pérdida de señal, instalaciones TDT y parabólicas, amplificación, telefonillos y videoporteros en ${p}.`,
  (t,p) => `Servicio técnico de antenas en ${t}, ${p}: diagnóstico, reparación, instalación y mantenimiento de sistemas de televisión, portero y videoportero.`
];
const introVariants = [
  t => `En ${t} revisamos primero el origen del problema antes de proponer cambios. Una avería puede estar en la recepción, la antena, la alimentación, la amplificación, el cableado o la distribución interior.`,
  t => `Para preparar un aviso en ${t}, conviene indicar si se trata de una vivienda, una comunidad o un negocio y si el fallo afecta a una sola toma o a varios puntos de la instalación.`,
  t => `Trabajamos en ${t} con instalaciones antiguas y actuales. Antes de sustituir material comprobamos qué elemento provoca la avería y qué partes de la instalación pueden mantenerse.`,
  t => `El servicio en ${t} incluye tanto reparación de instalaciones existentes como nuevas instalaciones de TDT, satélite, amplificación, porteros automáticos y videoporteros.`,
  t => `En ${t}, una pérdida de canales o una imagen inestable no implica necesariamente cambiar la antena. Se comprueba la instalación para localizar la causa antes de decidir la reparación.`,
  t => `Atendemos en ${t} consultas de viviendas y comunidades para señal de televisión, antenas, distribución coaxial, porteros y videoporteros, además de cobertura móvil residencial cuando procede.`
];
const adviceVariants = [
  t => `Antes de llamar desde ${t}, comprueba si el problema aparece en un solo televisor o en varias tomas. Para porteros, indica si falla la llamada, el audio, la imagen o la apertura.`,
  t => `Para una avería en ${t}, ayuda saber desde cuándo ocurre, qué canales fallan y si otros puntos de la instalación funcionan. No hace falta desmontar equipos para facilitar esos datos.`,
  t => `Si buscas una instalación nueva en ${t}, indica cuántos televisores o tomas necesitas y si ya existe antena, cableado o una instalación comunitaria.`,
  t => `Una foto del equipo visible o del mensaje del televisor puede ayudar a preparar la revisión en ${t}. El diagnóstico definitivo se realiza sobre la instalación.`,
  t => `Si el problema en ${t} afecta a una comunidad, confirma si ocurre en una vivienda o en varias. Esa diferencia orienta la revisión hacia la parte particular o común.`,
  t => `Para cobertura móvil en una vivienda de ${t}, indica operador y si el problema afecta a llamadas, datos o ambos; la solución depende de la señal disponible.`
];
const metaVariants = [
  (t,p) => `Antenista en ${t}, ${p}. ${site.phone}. Reparación e instalación de antenas TDT, colectivas, parabólicas, amplificación, porteros y videoporteros.`,
  (t,p) => `Técnico de antenas en ${t}, ${p} · ${site.phone}. TDT, parabólicas, amplificadores, antenas colectivas, porteros automáticos y videoporteros.`,
  (t,p) => `Servicio de antenista en ${t}, ${p}. Tel. ${site.phone}. Averías de señal, instalación de antenas, porteros, videoporteros y cobertura móvil residencial.`,
  (t,p) => `Reparación e instalación de antenas en ${t}, ${p} | ${site.phone}. TDT, satélite, amplificación, comunidades, porteros y videoporteros.`,
  (t,p) => `Antenista ${t}, ${p} · ${site.phone}. Antenas TDT y parabólicas, señal, amplificación, porteros automáticos y videoporteros.`
];
const focusVariants = [
  t => `Reparación de antenas y señal de TV en ${t}`,
  t => `Instalación de antena TDT y amplificación en ${t}`,
  t => `Antenas individuales y colectivas en ${t}`,
  t => `Averías de antena, portero y videoportero en ${t}`,
  t => `Servicio técnico para viviendas y comunidades en ${t}`
];

function provinceForPath(route) { return provinces.find(p => p.path === route); }
function makePage(province, item, usedPaths) {
  const explicit = explicitByKey.get(`${province.path}|${normalize(item.name)}`);
  if (explicit) {
    const h = stableHash(`${province.path}|${item.name}|meta`);
    return { ...explicit, province: province.name, municipioId: item.id, generated: false, seoDescription: metaVariants[h % metaVariants.length](explicit.name, province.name) };
  }
  const h = stableHash(`${province.path}|${item.name}`);
  let townPath = `${province.path}${slugifyTown(item.name)}.html`;
  if (usedPaths.has(townPath)) townPath = `${province.path}${slugifyTown(item.name)}-${h % 997}.html`;
  usedPaths.add(townPath);
  return {
    type: 'town', path: townPath, parent: province.path, province: province.name, municipioId: item.id,
    name: item.name, title: `Antenista en ${item.name}, ${province.name} | ${site.phone}`,
    heading: `Antenista en ${item.name}, ${province.name}`,
    lead: leadVariants[h % leadVariants.length](item.name, province.name),
    intro: introVariants[Math.floor(h / 7) % introVariants.length](item.name),
    focus: focusVariants[Math.floor(h / 17) % focusVariants.length](item.name),
    advice: adviceVariants[Math.floor(h / 31) % adviceVariants.length](item.name),
    source: dataset.source, evidence: 'municipal-dataset-generated-preview', generated: true, variant: h % 997,
    seoDescription: metaVariants[Math.floor(h / 13) % metaVariants.length](item.name, province.name)
  };
}

const serviceTextVariants = {
  repair: [
    t => `Si la televisión se pixela, desaparecen canales o la señal cambia, revisamos la instalación de ${t} para localizar el origen antes de sustituir material.`,
    t => `Una avería de antena en ${t} puede estar en recepción, alimentación, amplificación, conectores, cable coaxial o distribución. Se comprueba el conjunto antes de decidir la reparación.`,
    t => `Atendemos en ${t} pérdidas parciales o totales de señal, cortes de imagen y problemas que aparecen solo en determinadas tomas, tanto en viviendas como en comunidades.`
  ],
  tdt: [
    t => `Para una instalación TDT en ${t} valoramos recepción, recorrido de cable y número de tomas. La amplificación se ajusta a la instalación y no se añade de forma indiscriminada.`,
    t => `Instalamos y adaptamos antenas TDT en ${t}, revisando también amplificadores, fuentes, cabeceras y distribución cuando una instalación existente necesita recuperar estabilidad.`,
    t => `En una vivienda o comunidad de ${t}, la solución TDT depende de la señal disponible y de cómo se reparte por el inmueble; se revisan antena, amplificación y red coaxial.`
  ],
  collective: [
    t => `Trabajamos con antenas individuales y colectivas en ${t}. Si el problema afecta a varios vecinos, la revisión se orienta a los elementos comunes; si es una sola vivienda, se comprueba también la parte interior.`,
    t => `En ${t} atendemos viviendas y comunidades. Diferenciar si la incidencia aparece en una toma, una vivienda o varios vecinos ayuda a localizar si el fallo es individual o colectivo.`,
    t => `Las instalaciones colectivas de ${t} requieren comprobar cabecera, amplificación y distribución común, mientras que en una vivienda individual se revisa además el recorrido hasta cada toma.`
  ],
  satellite: [
    t => `Para problemas de satélite en ${t} revisamos orientación de la parabólica, LNB, conectores y cableado, valorando el conjunto antes de sustituir componentes.`,
    t => `Instalamos y revisamos antenas parabólicas en ${t}. Una falta de señal puede estar relacionada con orientación, LNB, una conexión o el recorrido del cable.`,
    t => `En ${t} podemos valorar una instalación nueva de parabólica o una avería en un sistema existente, comprobando recepción y estado de los elementos accesibles.`
  ],
  door: [
    t => `Reparamos e instalamos porteros automáticos y videoporteros en ${t}. Revisamos llamada, conversación, imagen y apertura y comprobamos compatibilidad antes de proponer recambios.`,
    t => `Si el portero de ${t} no llama, no se escucha o no abre, distinguimos qué función falla y si ocurre en una vivienda o en toda la comunidad. Trabajamos con equipos antiguos y actuales.`,
    t => `En ${t} atendemos averías, renovaciones e instalaciones nuevas de portero y videoportero, comprobando sistema y cableado antes de cambiar equipos.`
  ],
  mobile: [
    t => `Cuando una vivienda individual de ${t} tiene mala cobertura de datos, podemos estudiar la señal y valorar una antena exterior para router 4G/5G. Los repetidores de llamadas deben ajustarse a la normativa y al operador.`,
    t => `En casas de ${t} con señal móvil débil se puede valorar la recepción exterior, ubicación del router y una antena 4G/5G adecuada. Primero se determina qué solución es técnica y normativamente viable.`,
    t => `La mejora de cobertura móvil en una vivienda de ${t} comienza comprobando operador, señal y uso principal: llamadas, datos o ambos; después se estudia la solución apropiada.`
  ]
};

function localSeoBlock(page) {
  const h = stableHash(`${page.path}|bloques`);
  const pick = (key, offset) => serviceTextVariants[key][Math.floor(h / offset) % serviceTextVariants[key].length](page.name);
  const faq = [
    [`¿Atendéis una avería aunque no sepa dónde está el fallo en ${page.name}?`, `Sí. Indica qué ocurre y si afecta a una o varias tomas. La revisión sirve precisamente para localizar si el problema está en recepción, amplificación, cableado o distribución.`],
    [`¿Trabajáis con instalaciones antiguas en ${page.name}?`, `Sí. Revisamos equipos e instalaciones existentes cuando siguen siendo reparables o compatibles y valoramos qué elementos pueden mantenerse antes de renovar.`],
    [`¿Puedo consultar por WhatsApp antes de una visita en ${page.name}?`, `Sí. Puedes indicar localidad, tipo de inmueble, síntomas y, si ayuda, una foto del equipo visible. No es necesario desmontar tapas ni acceder a cubiertas.`],
    [`¿Revisáis antenas de comunidades en ${page.name}?`, `Sí. En instalaciones colectivas comprobamos si la incidencia afecta a varios vecinos y revisamos los elementos comunes que correspondan.`]
  ][h % 4];
  return `<section class="section soft local-intent-section" id="servicio-local" data-local-variant="${h % 997}"><div class="wrap"><span class="eyebrow">Servicio en ${esc(page.name)} · ${esc(site.phone)}</span><h2>Servicios de antenista en ${esc(page.name)}</h2><p class="section-lead">Página de servicio para ${esc(page.name)} con información sobre los trabajos que atendemos en la localidad. No representa una oficina o sede física.</p><div class="local-intents"><article><h3>Reparación de antenas en ${esc(page.name)}</h3><p>${esc(pick('repair',3))}</p></article><article><h3>Instalación de antena TDT y amplificación en ${esc(page.name)}</h3><p>${esc(pick('tdt',5))}</p></article><article><h3>Antenas colectivas e individuales en ${esc(page.name)}</h3><p>${esc(pick('collective',7))}</p></article><article><h3>Antenas parabólicas y señal de satélite en ${esc(page.name)}</h3><p>${esc(pick('satellite',11))}</p></article><article><h3>Porteros automáticos y videoporteros en ${esc(page.name)}</h3><p>${esc(pick('door',13))}</p></article><article><h3>Cobertura móvil 4G/5G en vivienda individual en ${esc(page.name)}</h3><p>${esc(pick('mobile',17))}</p></article></div><div class="local-faq"><h3>${esc(faq[0])}</h3><p>${esc(faq[1])}</p></div><div class="local-contact"><strong>Servicio en ${esc(page.name)}</strong><a href="tel:${site.tel}">${esc(site.phone)}</a><a href="https://wa.me/${site.whatsapp}">WhatsApp</a></div></div></section><style>.local-intents{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:24px}.local-intents article{background:#fff;border:1px solid var(--line);border-top:3px solid var(--brand);padding:22px}.local-intents h3,.local-faq h3{margin:0 0 8px;font-size:20px;line-height:1.25}.local-intents p,.local-faq p{margin:0;color:var(--muted);font-size:14px}.local-faq{margin-top:18px;background:#fff;border-left:4px solid var(--brand);padding:20px}.local-contact{display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;margin-top:24px;padding:18px;background:var(--deep);color:#fff}.local-contact a{color:#fff;font-weight:800}.local-contact a:last-child{margin-left:auto}@media(max-width:760px){.local-intents{grid-template-columns:1fr}.local-contact a:last-child{margin-left:0}}</style>`;
}
function injectLocalBlock(html, page) {
  const marker = '<section class="section wrap faq" id="preguntas">';
  if (!html.includes(marker)) throw new Error(`${page.path}: no se encontró el punto de inserción SEO local`);
  return html.replace(marker, localSeoBlock(page) + marker);
}

function renderProvinceIndex(province, locals) {
  const sorted = [...locals].sort((a,b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  const groups = new Map();
  for (const p of sorted) {
    const letter = normalize(p.name).charAt(0).toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(p);
  }
  return `<section class="section soft" id="localidades"><div class="wrap" data-locality-search><span class="eyebrow">Servicio por pueblos</span><h2>Antenistas en los municipios de ${esc(province.name)}</h2><p class="section-lead">${locals.length} localidades con página propia de servicio. Busca tu pueblo y consulta antenas, porteros, videoporteros y cobertura móvil.</p><label class="search-label" for="town-search">Buscar localidad</label><input class="search-field" id="town-search" type="search" placeholder="Escribe el nombre de tu localidad" autocomplete="off"><p class="search-status" role="status" aria-live="polite">${locals.length} localidades</p><nav class="alphabet" aria-label="Inicial de la localidad">${[...groups.keys()].map(l=>`<a href="#letra-${l}">${l}</a>`).join('')}</nav>${[...groups].map(([l,items])=>`<section class="letter-group" id="letra-${l}" data-letter-group><h3>${l}</h3><ul class="town-list">${items.map(p=>`<li data-town="${esc(p.name)}"><a href="${p.path}">${esc(p.name)} →</a></li>`).join('')}</ul></section>`).join('')}<p class="notice">Cada enlace abre una página local generada para esa localidad. La web continúa en modo de revisión y noindex.</p></div></section>`;
}
function replaceProvinceIndex(html, province, locals) {
  const start = html.indexOf('<section class="section soft" id="localidades">');
  const end = html.indexOf('<section class="section wrap faq" id="preguntas">');
  if (start < 0 || end < 0 || end <= start) throw new Error(`${province.name}: no se pudo sustituir el índice provincial`);
  return html.slice(0,start) + renderProvinceIndex(province, locals) + html.slice(end);
}
function insertHomeSummary(html, allPages) {
  const marker = '<section class="section wrap faq" id="preguntas">';
  const cards = provinces.map(p => {
    const count = allPages.filter(x => x.parent === p.path).length;
    return `<a class="province-card" href="${p.path}"><strong>${esc(p.name)}</strong><span>${count} localidades con página propia</span><span class="arrow" aria-hidden="true">→</span></a>`;
  }).join('');
  const block = `<section class="section soft" id="paginas-locales"><div class="wrap"><span class="eyebrow">SEO local por municipio</span><h2>${allPages.length} páginas locales preparadas</h2><p class="section-lead">Álava, Bizkaia, Burgos, Cantabria, Gipuzkoa, Navarra, La Rioja, Palencia, Valladolid, León y Segovia ya se generan automáticamente por localidad, con URL, título, H1, teléfono y servicios locales.</p><div class="province-grid">${cards}</div></div></section>`;
  if (!html.includes(marker)) throw new Error('Portada: no se encontró el punto para el resumen local');
  return html.replace(marker, block + marker);
}

const usedPaths = new Set(pages.map(p => p.path));
const allPages = [];
for (const province of provinces) {
  const items = dataset.provinces[province.path] || [];
  for (const item of items) allPages.push(makePage(province, item, usedPaths));
}
if (allPages.length !== 2007) throw new Error(`Cobertura Zalla incompleta: ${allPages.length}/2007 páginas locales para Bizkaia, Gipuzkoa, Álava, Burgos, Cantabria, Navarra, La Rioja, Palencia, Valladolid, León y Segovia.`);

const root = path.resolve('dist');
for (const page of allPages) {
  const province = provinceForPath(page.parent);
  let html = renderPage(page);
  html = injectLocalBlock(html, page, province);
  const file = path.join(root, routeFile(page.path));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

for (const province of provinces) {
  const file = path.join(root, routeFile(province.path));
  const locals = allPages.filter(p => p.parent === province.path);
  const html = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, replaceProvinceIndex(html, province, locals));
}
const homeFile = path.join(root, 'index.html');
fs.writeFileSync(homeFile, insertHomeSummary(fs.readFileSync(homeFile, 'utf8'), allPages));

fs.writeFileSync(path.join(root, 'local-pages-manifest.json'), JSON.stringify(allPages.map(p => ({ path:p.path, name:p.name, province:p.province, generated:!!p.generated, seoDescription:p.seoDescription, municipioId:p.municipioId })), null, 2));
const previewPath = path.join(root, 'preview-manifest.json');
const preview = JSON.parse(fs.readFileSync(previewPath, 'utf8'));
preview.localPages = allPages.length;
preview.municipalSource = dataset.source;
preview.pages = [...preview.pages.filter(p => p.path === '/' || provinces.some(x => x.path === p.path)), ...allPages.map(p => ({ path:p.path, canonical:new URL(p.path, site.domain).href, locality:p.name, province:p.province, generated:!!p.generated }))];
fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2));

console.log(`EXPANSIÓN SEO LOCAL OK: ${allPages.length} páginas locales generadas y enlazadas desde las ${provinces.length} provincias.`);
