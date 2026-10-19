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
  (t,p) => `Antenista en ${t}, ${p}, con revisión orientada a localizar el punto de fallo antes de sustituir equipos: TDT, satélite, amplificación, porteros y videoporteros.`,
  (t,p) => `Servicio técnico en ${t}, ${p}, para comprobar recepción, cabecera, distribución y tomas cuando la televisión falla o pierde canales.`,
  (t,p) => `Técnico antenista en ${t}: diagnóstico de señal, antenas individuales y colectivas, parabólicas, porteros automáticos y videoporteros.`,
  (t,p) => `Antenas Zallatel atiende consultas en ${t}, ${p}, diferenciando primero si la incidencia está en la recepción, la red interior o los elementos comunes.`,
  (t,p) => `¿Falla la televisión o el portero en ${t}? Preparamos la revisión según el síntoma, el tipo de inmueble y si afecta a una sola vivienda o a varios puntos.`,
  (t,p) => `Instalación y reparación de antenas en ${t}, ${p}, con especial atención a amplificación, distribución coaxial, satélite y sistemas de acceso.`
];
const introVariants = [
  t => `En ${t} no partimos de que la antena esté averiada. Una pérdida de señal puede venir de recepción, fuente de alimentación, amplificador, repartidor, derivación, toma o cableado; la revisión separa cada tramo.`,
  t => `Para preparar una intervención en ${t}, interesa saber si el fallo aparece en una sola toma, en toda la vivienda o también en otros vecinos. Esa diferencia cambia por completo el punto de revisión.`,
  t => `En ${t} trabajamos sobre instalaciones existentes antes de plantear una renovación completa. Si parte del sistema sigue siendo válida, se valora mantenerla y actuar solo sobre el elemento que provoca la incidencia.`,
  t => `Una instalación de televisión en ${t} se revisa como un recorrido: recepción, amplificación, distribución y puntos finales. En porteros y videoporteros se separan llamada, audio, imagen y apertura.`,
  t => `Cuando en ${t} desaparecen canales o la imagen se pixela, conviene comparar tomas y comprobar si el problema es individual o comunitario antes de comprar amplificadores o cambiar antenas.`,
  t => `Antenas Zallatel organiza la atención en ${t} por tipo de avería y de inmueble: vivienda individual, comunidad o pequeño negocio, evitando presupuestar recambios sin haber delimitado antes el fallo.`
];
const adviceVariants = [
  t => `Antes de llamar desde ${t}, comprueba únicamente si el fallo aparece en uno o varios televisores. No accedas al tejado ni abras amplificadores: esa información básica ya orienta la primera revisión.`,
  t => `Si la avería está en ${t}, anota qué canales faltan, desde cuándo ocurre y si cambia entre tomas. Para porteros, indica por separado llamada, audio, imagen y apertura.`,
  t => `Para una instalación nueva en ${t}, indica cuántas tomas necesitas, si existe red coaxial y si la antena es individual o comunitaria. Así se prepara el trabajo sin asumir material innecesario.`,
  t => `Una fotografía de la placa, monitor, amplificador o receptor visible puede ayudar a identificar el sistema de ${t}; no hace falta desmontar tapas ni desconectar cables.`,
  t => `Si varios vecinos de ${t} tienen el mismo problema, comunícalo desde el principio. Puede orientar la comprobación hacia cabecera, alimentación o distribución común en lugar de la vivienda.`,
  t => `En una consulta de cobertura o satélite en ${t}, indica operador o servicio, equipo existente y si antes funcionaba. La solución depende de la señal disponible y de la instalación actual.`
];
const metaVariants = [
  (t,p) => `Antenista en ${t}, ${p} · ${site.phone}. Diagnóstico y reparación de TDT, amplificación, antenas colectivas, parabólicas, porteros y videoporteros.`,
  (t,p) => `Técnico antenista en ${t}, ${p} · ${site.phone}. Revisión de señal, cabecera, cableado, tomas, satélite, porteros automáticos y videoporteros.`,
  (t,p) => `Reparación de antenas en ${t}, ${p}. ${site.phone}. Localización de averías de recepción y distribución, TDT, parabólicas y sistemas de acceso.`,
  (t,p) => `Servicio técnico de antenas en ${t}, ${p} | ${site.phone}. Viviendas y comunidades: señal TV, amplificación, porteros, videoporteros y satélite.`,
  (t,p) => `Antenas Zallatel en ${t}, ${p} · ${site.phone}. Diagnóstico de TDT, red coaxial, antenas colectivas, parabólicas, porteros y videoporteros.`
];
const focusVariants = [
  t => `Localizar dónde se pierde la señal en ${t}`,
  t => `Separar recepción, amplificación y distribución en ${t}`,
  t => `Diagnóstico de antena individual o colectiva en ${t}`,
  t => `Comprobar una avería de portero o videoportero en ${t}`,
  t => `Revisar la instalación antes de sustituir equipos en ${t}`
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

const diagnosticRoutes = [
  {
    key:'senal',
    title:t=>`¿La televisión pierde señal en ${t}?`,
    text:t=>`Comparamos lo que ocurre entre tomas y, cuando corresponde, entre viviendas. El objetivo es saber si la incidencia empieza en recepción, amplificación, distribución o en un punto final de la instalación.`
  },
  {
    key:'cabecera',
    title:t=>`Amplificación y distribución en ${t}`,
    text:t=>`Fuentes, amplificadores, repartidores, derivadores y cable coaxial forman parte del mismo recorrido. Añadir ganancia sin medir el problema puede empeorar la instalación; primero se delimita el tramo que falla.`
  },
  {
    key:'comunidad',
    title:t=>`Vivienda o comunidad: no se revisan igual`,
    text:t=>`Si el fallo afecta a varios vecinos de ${t}, la comprobación se orienta a elementos comunes. Si ocurre solo dentro de una vivienda, se estudian derivación, cableado interior y tomas.`
  },
  {
    key:'acceso',
    title:t=>`Portero automático y videoportero en ${t}`,
    text:t=>`Separamos llamada, conversación, imagen y apertura. Antes de cambiar monitor, telefonillo o placa interesa identificar sistema, alimentación y compatibilidad con el cableado existente.`
  },
  {
    key:'satelite',
    title:t=>`Parabólica, SAT-TDT y Starlink en ${t}`,
    text:t=>`Para satélite se comprueban equipo, soporte, cableado y recepción. En SAT-TDT y Starlink el montaje físico y las condiciones del servicio se valoran por separado.`
  }
];

function localSeoBlock(page) {
  const h = stableHash(`${page.path}|zallatel-diagnostico`);
  const ordered = [...diagnosticRoutes.slice(h % diagnosticRoutes.length), ...diagnosticRoutes.slice(0,h % diagnosticRoutes.length)];
  const visible = ordered.slice(0,4);
  const checklists = [
    ['Una toma o varias','Indica si el fallo aparece en un solo televisor o en más puntos.'],
    ['Vivienda o comunidad','Comenta si otros vecinos observan la misma incidencia.'],
    ['Qué función falla','En porteros: llamada, audio, imagen o apertura.'],
    ['Qué equipo existe','Marca o referencia visible, sin desmontar tapas.']
  ];
  const serviceSignals = [
    `Reparación de antenas en ${page.name}`,
    `Porteros automáticos y videoporteros en ${page.name}`,
    `Cobertura móvil 4G/5G en vivienda individual en ${page.name}`
  ];
  return `<section class="section soft local-intent-section zallatel-diagnostic" id="diagnostico-local" data-local-variant="${h % 997}"><div class="wrap"><span class="eyebrow">Servicio en ${esc(page.name)} · ${esc(site.phone)}</span><h2>Antes de cambiar equipos, localizamos el punto de fallo</h2><p class="section-lead">En ${esc(page.name)} orientamos la revisión por el recorrido real de la instalación: recepción, amplificación, distribución y equipo final. En porteros y videoporteros se revisa cada función por separado.</p><nav class="zallatel-service-signals" aria-label="Servicios técnicos en ${esc(page.name)}">${serviceSignals.map(label=>`<span>${esc(label)}</span>`).join('')}</nav><div class="zallatel-diagnostic-grid">${visible.map(item=>`<article><span class="diag-number">0${diagnosticRoutes.indexOf(item)+1}</span><h3>${esc(item.title(page.name))}</h3><p>${esc(item.text(page.name))}</p></article>`).join('')}</div><aside class="zallatel-intake"><div><span class="eyebrow">Para preparar la visita</span><h3>Cuatro datos que ayudan</h3></div><ul>${checklists.map(([a,b])=>`<li><strong>${esc(a)}</strong><span>${esc(b)}</span></li>`).join('')}</ul></aside><div class="zallatel-local-actions"><a href="${page.parent}">Ver todos los municipios de ${esc(page.province)} →</a><a href="tel:${site.tel}">Llamar ${esc(site.phone)}</a><a href="https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Hola, necesito revisar una instalación en ${page.name}, ${page.province}. Os indico qué falla y si afecta a una o varias tomas.`)}">Explicar la avería por WhatsApp</a></div></div></section>`;
}

function injectLocalBlock(html, page) {
  const marker = '<section class="section wrap faq" id="preguntas">';
  if (!html.includes(marker)) throw new Error(`${page.path}: no se encontró el punto de inserción SEO local`);
  return html.replace(marker, localSeoBlock(page) + marker);
}


const PRIORITY_TOWNS = {
  'Álava': ['Amurrio','Laudio / Llodio','Artziniega','Laguardia','Agurain / Salvatierra','Alegría-Dulantzi','Ayala / Aiara','Zuia'],
  'Bizkaia': ['Zalla','Balmaseda','Gernika-Lumo','Durango','Mungia','Bermeo','Lekeitio','Galdakao'],
  'Burgos': ['Lerma','Aranda de Duero','Medina de Pomar','Miranda de Ebro','Briviesca','Salas de los Infantes','Roa','Villadiego'],
  'Gipuzkoa': ['Eibar','Tolosa','Zarautz','Oñati','Azpeitia','Bergara','Hondarribia','Elgoibar'],
  'Cantabria': ['Castro-Urdiales','Laredo','Santoña','Noja','Reinosa','Torrelavega','Camargo','Potes'],
  'Navarra': ['Tudela','Estella-Lizarra','Tafalla','Sangüesa / Zangoza','Corella','Bera','Baztan','Olite / Erriberri'],
  'La Rioja': ['Haro','Calahorra','Arnedo','Nájera','Santo Domingo de la Calzada','Alfaro','Ezcaray','Cervera del Río Alhama'],
  'Palencia': ['Aguilar de Campoo','Guardo','Cervera de Pisuerga','Carrión de los Condes','Dueñas','Venta de Baños','Villamuriel de Cerrato','Saldaña'],
  'Valladolid': ['Medina del Campo','Tordesillas','Peñafiel','Íscar','Tudela de Duero','Laguna de Duero','Olmedo','Medina de Rioseco'],
  'León': ['Ponferrada','Astorga','La Bañeza','Bembibre','Villablino','Valencia de Don Juan','Cistierna','La Pola de Gordón'],
  'Segovia': ['Cuéllar','El Espinar','Riaza','Cantalejo','Nava de la Asunción','Carbonero el Mayor','Sepúlveda','San Ildefonso']
};

const loose = value => normalize(value).replace(/[^a-z0-9]+/g,'');
function priorityPages(province, locals, limit=8) {
  const wanted = PRIORITY_TOWNS[province.name] || [];
  const byLoose = new Map(locals.map(p => [loose(p.name),p]));
  const selected = [];
  for (const name of wanted) {
    const page = byLoose.get(loose(name));
    if (page && !selected.some(x => x.path === page.path)) selected.push(page);
    if (selected.length >= limit) break;
  }
  if (selected.length < limit) {
    for (const page of locals) {
      if (!selected.some(x => x.path === page.path)) selected.push(page);
      if (selected.length >= limit) break;
    }
  }
  return selected;
}
function priorityBlock(province, locals, limit=8) {
  const selected = priorityPages(province,locals,limit);
  if (!selected.length) return '';
  return `<section class="priority-localities" aria-label="Localidades destacadas de ${esc(province.name)}"><h3>Localidades destacadas en ${esc(province.name)}</h3><p>Acceso directo a páginas de servicio de antenas, porteros automáticos y videoporteros.</p><div class="priority-town-grid">${selected.map(p=>`<a href="${p.path}">Antenista en ${esc(p.name)} <span aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}

const provinceSeoFocus = {
  'Álava': 'revisiones de señal, instalaciones individuales y comunidades',
  'Bizkaia': 'averías de TDT, cabeceras comunitarias y sistemas de acceso',
  'Burgos': 'instalaciones de televisión, amplificación y distribución en vivienda',
  'Gipuzkoa': 'diagnóstico de señal, porteros y videoporteros en viviendas y comunidades',
  'Cantabria': 'recepción TDT, parabólica y distribución de señal',
  'Navarra': 'antenas, amplificación y sistemas de portero por localidad',
  'La Rioja': 'averías de televisión, satélite y renovación de porteros',
  'Palencia': 'instalaciones TDT, señal débil y redes interiores de televisión',
  'Valladolid': 'ampliación de tomas, antenas y sistemas de acceso',
  'León': 'recepción, satélite y revisión de instalaciones antiguas',
  'Segovia': 'diagnóstico de señal, distribución y porteros automáticos'
};

function provinceDiagnosticBlock(province) {
  const focus = provinceSeoFocus[province.name] || 'diagnóstico de antenas, señal y sistemas de acceso';
  return `<section class="province-diagnostic"><div class="province-diagnostic-main"><span class="eyebrow">Servicio técnico por municipios</span><h3>Antenista en ${esc(province.name)}: diagnóstico antes de sustituir equipos</h3><p>Antenas Zallatel organiza la atención en ${esc(province.name)} con especial foco en ${esc(focus)}. Antes de proponer un cambio de antena se comprueba si el problema está en recepción, alimentación, amplificación, distribución o en una toma concreta.</p><div class="province-service-tags" aria-label="Servicios técnicos de Antenas Zallatel"><span>TDT y señal</span><span>Antenas colectivas</span><span>Parabólicas</span><span>Porteros</span><span>Videoporteros</span><span>Amplificación</span></div></div><div class="province-diagnostic-points"><span><strong>¿Falla una sola TV?</strong> Puede ser toma, cableado o distribución interior.</span><span><strong>¿Falla a varios vecinos?</strong> Conviene revisar cabecera, alimentación y elementos comunes.</span><span><strong>¿El portero llama pero no abre?</strong> Se separa audio, llamada y apertura para localizar el fallo.</span><span><strong>¿No llega bien la TDT?</strong> Primero se descarta una avería antes de valorar SAT-TDT.</span></div><div class="province-quick-faq"><h4>Antes de pedir visita en ${esc(province.name)}</h4><details><summary>¿Qué datos conviene indicar?</summary><p>Municipio, tipo de inmueble, equipo afectado y si el problema aparece en una sola toma o en varios puntos.</p></details><details><summary>¿Hay que comprar material antes?</summary><p>No. Es mejor identificar primero el origen de la avería para evitar sustituir amplificadores, antenas o terminales sin necesidad.</p></details></div></section>`;
}

function renderProvinceIndex(province, locals) {
  const sorted = [...locals].sort((a,b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  const groups = new Map();
  for (const p of sorted) {
    const letter = normalize(p.name).charAt(0).toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(p);
  }
  return `<section class="section soft" id="localidades"><div class="wrap" data-locality-search><span class="eyebrow">Servicio por pueblos</span><h2>Antenista en los municipios de ${esc(province.name)}</h2><p class="section-lead">Busca tu localidad para consultar instalación y reparación de antenas TDT, parabólicas, porteros automáticos y videoporteros.</p>${provinceDiagnosticBlock(province)}${priorityBlock(province,locals)}<label class="search-label" for="town-search">Buscar localidad</label><input class="search-field" id="town-search" type="search" placeholder="Escribe el nombre de tu localidad" autocomplete="off"><p class="search-status" role="status" aria-live="polite">${locals.length} localidades</p><nav class="alphabet" aria-label="Inicial de la localidad">${[...groups.keys()].map(l=>`<a href="#letra-${l}">${l}</a>`).join('')}</nav>${[...groups].map(([l,items])=>`<section class="letter-group" id="letra-${l}" data-letter-group><h3>${l}</h3><ul class="town-list">${items.map(p=>`<li data-town="${esc(p.name)}"><a href="${p.path}">${esc(p.name)} →</a></li>`).join('')}</ul></section>`).join('')}<p class="notice">Cada enlace abre una página local generada para esa localidad. La web continúa en modo de revisión y noindex.</p></div></section>`;
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
    const locals = allPages.filter(x => x.parent === p.path);
    const direct = priorityPages(p,locals,4);
    return `<article class="home-province-local"><a class="province-card" href="${p.path}"><strong>Antenista en ${esc(p.name)}</strong><span>${locals.length} localidades</span><span class="arrow" aria-hidden="true">→</span></a><div class="home-priority-links">${direct.map(t=>`<a href="${t.path}">Antenista en ${esc(t.name)}</a>`).join('')}</div></article>`;
  }).join('');
  const block = `<section class="section soft" id="paginas-locales"><div class="wrap"><span class="eyebrow">Servicio por localidades</span><h2>Encuentra antenista en tu pueblo</h2><p class="section-lead">Elige provincia o entra directamente en una localidad. Consulta antenas TDT, parabólicas, amplificación, porteros automáticos y videoporteros.</p><div class="home-province-grid">${cards}</div></div></section>`;
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
