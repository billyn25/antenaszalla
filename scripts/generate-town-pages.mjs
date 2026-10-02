import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { pages, site, renderPage, routeFile, esc } from './build.mjs';

const provinces = pages.filter(p => p.type === 'province');
const explicitTowns = pages.filter(p => p.type === 'town');
const normalize = value => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const key = (parent, name) => `${parent}|${normalize(name)}`;
const explicitByKey = new Map(explicitTowns.map(p => [key(p.parent, p.name), p]));

export function stableHash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function slugifyTown(value) {
  return normalize(value)
    .replace(/[\/|]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'localidad';
}

const leadVariants = [
  (t,p) => `Servicio de antenista en ${t}, ${p}, para averías de señal, instalaciones nuevas, TDT, parabólicas, amplificación, porteros automáticos y videoporteros.`,
  (t,p) => `¿Necesitas un técnico de antenas en ${t}? Atendemos instalaciones individuales y colectivas, problemas de TDT, satélite, amplificación, porteros y videoporteros en ${p}.`,
  (t,p) => `Instalación y reparación de antenas en ${t}, ${p}. Revisamos recepción TDT, parabólicas, amplificadores, cableado, porteros automáticos, videoporteros y cobertura móvil residencial.`,
  (t,p) => `Antenas Zallatel presta servicio en ${t} para viviendas, comunidades y pequeños negocios: antenas TDT, parabólicas, distribución de señal, porteros y videoporteros.`,
  (t,p) => `Técnico antenista en ${t}, ${p}, para localizar averías, mejorar la recepción y resolver trabajos de antena, amplificación, portero automático o videoportero.`,
  (t,p) => `Servicio técnico de antenas en ${t}: instalaciones individuales y comunitarias, TDT, satélite, amplificación y sistemas de portero y videoportero.`
];

const introVariants = [
  (t,p) => `En ${t} revisamos primero el origen del problema antes de proponer cambios. Una pérdida de canales puede estar en la recepción, la antena, la amplificación, el cableado o la distribución interior. En porteros y videoporteros comprobamos llamada, audio, imagen y apertura según el sistema instalado.`,
  (t,p) => `Para preparar un aviso en ${t}, indica si la instalación pertenece a una vivienda individual, una comunidad o un negocio y qué síntoma observas. Esa información permite diferenciar una avería de recepción de un problema de distribución, amplificación o equipo terminal.`,
  (t,p) => `Los trabajos en ${t} pueden ir desde recuperar una señal inestable hasta renovar una instalación antigua. Valoramos antenas, amplificadores, fuentes, repartidores, derivadores, tomas, cableado y, cuando corresponde, el sistema de portero o videoportero.`,
  (t,p) => `Atendemos consultas en ${t} tanto para reparar instalaciones existentes como para preparar instalaciones nuevas. La revisión se plantea según el tipo de inmueble, los equipos visibles y si el fallo afecta a una sola toma o a varios puntos de la instalación.`,
  (t,p) => `En ${t}, ${p}, trabajamos con instalaciones antiguas y actuales. Antes de sustituir material comprobamos qué elemento provoca la avería y si es posible ajustar, reparar o renovar únicamente la parte necesaria.`,
  (t,p) => `El servicio en ${t} incluye diagnóstico de señal, antenas TDT y parabólicas, amplificación y distribución, además de reparación o renovación de porteros automáticos y videoporteros.`
];

const focusVariants = [
  t => `Reparación de antenas y señal de TV en ${t}`,
  t => `Instalación de antena TDT y amplificación en ${t}`,
  t => `Averías de antena, portero y videoportero en ${t}`,
  t => `Servicio técnico para viviendas y comunidades en ${t}`,
  t => `Antenas individuales y colectivas en ${t}`,
  t => `Revisión de instalaciones antiguas y actuales en ${t}`
];

const adviceVariants = [
  t => `Antes de llamar desde ${t}, comprueba si el problema aparece en un solo televisor o en varias tomas. Si es un portero, indica si falla la llamada, el audio, la imagen o la apertura. No accedas al tejado ni desmontes equipos para hacer estas comprobaciones.`,
  t => `Para una avería en ${t}, ayuda saber desde cuándo ocurre, si faltan todos los canales o solo algunos y si otros puntos de la instalación funcionan. En porteros, facilita la marca o modelo visible sin retirar tapas.`,
  t => `Si solicitas una instalación en ${t}, indica cuántos televisores o puntos necesitas y si ya existe antena, cableado o una instalación comunitaria. Para satélite, comenta si hay parabólica previa y dónde está instalada.`,
  t => `En ${t}, una foto del equipo visible o del mensaje que muestra el televisor puede ayudar a preparar la revisión. El diagnóstico definitivo se realiza comprobando la instalación y sus niveles de señal.`,
  t => `Si la incidencia afecta a una comunidad de ${t}, confirma si sucede en una sola vivienda o en varias. Esa diferencia orienta la revisión hacia la instalación particular o hacia los elementos comunes.`,
  t => `Para cobertura móvil en una vivienda de ${t}, indica operador y si el problema afecta a llamadas, datos o ambos. Las soluciones se valoran según la señal disponible y el tipo de vivienda.`
];

const metaVariants = [
  (t,p,phone) => `Antenista en ${t}, ${p}. ${phone}. Reparación e instalación de antenas TDT, colectivas, parabólicas, amplificación, porteros y videoporteros.`,
  (t,p,phone) => `Técnico de antenas en ${t}, ${p} · ${phone}. TDT, parabólicas, amplificadores, antenas colectivas, porteros automáticos y videoporteros.`,
  (t,p,phone) => `Servicio de antenista en ${t}, ${p}. Tel. ${phone}. Averías de señal, instalación de antenas, porteros, videoporteros y cobertura móvil residencial.`,
  (t,p,phone) => `Reparación e instalación de antenas en ${t}, ${p} | ${phone}. TDT, satélite, amplificación, comunidades, porteros y videoporteros.`
];

function provinceFor(page) {
  return provinces.find(p => p.path === page.parent);
}

function makeSeoDescription(page, province) {
  const h = stableHash(`${province.path}|${page.name}|meta`);
  let description = metaVariants[h % metaVariants.length](page.name, province.name, site.phone);
  if (page.urgentLabel) description = `Antenista en ${page.name}, ${province.name}. ${page.urgentLabel}. ${site.phone}. Reparación e instalación de antenas, TDT, parabólicas, porteros y videoporteros.`;
  return description;
}

export function buildTownPages() {
  const usedPaths = new Set(pages.map(p => p.path));
  const result = [];

  for (const province of provinces) {
    for (const town of province.towns || []) {
      const explicit = explicitByKey.get(key(province.path, town));
      if (explicit) {
        result.push({ ...explicit, province: province.name, seoDescription: makeSeoDescription(explicit, province), generated: false });
        continue;
      }

      const h = stableHash(`${province.path}|${town}`);
      let slug = slugifyTown(town);
      let townPath = `${province.path}${slug}.html`;
      if (usedPaths.has(townPath)) townPath = `${province.path}${slug}-${h % 997}.html`;
      usedPaths.add(townPath);

      const page = {
        type: 'town',
        path: townPath,
        parent: province.path,
        province: province.name,
        name: town,
        title: `Antenista en ${town}, ${province.name} | ${site.phone}`,
        heading: `Antenista en ${town}, ${province.name}`,
        lead: leadVariants[h % leadVariants.length](town, province.name),
        intro: introVariants[Math.floor(h / 7) % introVariants.length](town, province.name),
        focus: focusVariants[Math.floor(h / 17) % focusVariants.length](town),
        advice: adviceVariants[Math.floor(h / 31) % adviceVariants.length](town),
        source: province.source,
        evidence: 'generated-preview-from-province-list',
        generated: true,
        variant: h % 997
      };
      page.seoDescription = makeSeoDescription(page, province);
      result.push(page);
    }
  }
  return result;
}

const serviceModules = [
  {
    id: 'reparacion-local',
    title: t => `Reparación de antenas en ${t}`,
    texts: [
      t => `Si la televisión se pixela, desaparecen canales o la señal cambia según el momento del día, revisamos la instalación de ${t} para localizar el origen. Comprobamos recepción, conexiones, cableado, repartidores, derivadores y tomas antes de decidir si hace falta sustituir material.`,
      t => `Una avería de antena en ${t} no siempre implica cambiar la antena. El fallo puede estar en la alimentación, la amplificación, un conector, el cable coaxial o la distribución. La revisión sirve para separar cada posibilidad y actuar sobre el punto que realmente falla.`,
      t => `Atendemos pérdida total o parcial de señal en ${t}, cortes de imagen y problemas que aparecen solo en determinadas tomas. La comprobación se adapta a instalaciones individuales y colectivas, evitando cambiar equipos sin haber identificado primero la causa.`
    ]
  },
  {
    id: 'tdt-local',
    title: t => `Instalación de antena TDT y amplificación en ${t}`,
    texts: [
      t => `Para una instalación TDT en ${t} valoramos el punto de recepción, el recorrido del cable y el número de tomas que deben alimentarse. Cuando la señal necesita amplificación, se dimensiona según la instalación en vez de añadir ganancia de forma indiscriminada.`,
      t => `Instalamos y adaptamos antenas TDT en ${t} para viviendas y comunidades. También revisamos amplificadores, fuentes de alimentación, cabeceras y distribución cuando una instalación existente necesita recuperar estabilidad o incorporar nuevos puntos de televisión.`,
      t => `En una vivienda o comunidad de ${t}, la solución TDT depende de la señal disponible y de cómo se reparte por el inmueble. Podemos revisar antena, amplificación y red coaxial para ajustar la instalación a los televisores y tomas que realmente se utilizan.`
    ]
  },
  {
    id: 'colectivas-local',
    title: t => `Antenas colectivas e individuales en ${t}`,
    texts: [
      t => `Trabajamos tanto sobre antenas individuales como sobre instalaciones comunitarias en ${t}. Si el problema afecta a varios vecinos, la revisión se orienta a los elementos comunes; si ocurre en una sola vivienda, se comprueba también la derivación y la distribución interior.`,
      t => `En ${t} atendemos viviendas particulares y comunidades. Diferenciar si la incidencia aparece en una sola toma, en toda una vivienda o en varios vecinos ayuda a localizar si el fallo pertenece a la red individual o a la instalación colectiva.`,
      t => `Las instalaciones colectivas de ${t} requieren comprobar cabecera, amplificación y distribución común, mientras que en una vivienda individual se revisa además el recorrido hasta cada toma. El diagnóstico cambia según dónde se repite la avería.`
    ]
  },
  {
    id: 'satelite-local',
    title: t => `Antenas parabólicas y señal de satélite en ${t}`,
    texts: [
      t => `Para problemas de satélite en ${t} revisamos orientación de la parabólica, LNB, conectores y cableado. Si la instalación funcionaba antes, interesa saber cuándo comenzó la pérdida de señal y si afecta a todos los servicios recibidos.`,
      t => `Instalamos y revisamos antenas parabólicas en ${t}. Un fallo de recepción puede estar relacionado con la orientación, el LNB, una conexión o el recorrido del cable, por lo que conviene comprobar el conjunto antes de sustituir componentes.`,
      t => `En ${t} podemos valorar una instalación nueva de parabólica o una avería en un sistema existente. Se comprueba la recepción y el estado de los elementos exteriores e interiores accesibles para determinar el ajuste o reparación adecuada.`
    ]
  },
  {
    id: 'porteros-local',
    title: t => `Porteros automáticos y videoporteros en ${t}`,
    texts: [
      t => `Reparamos e instalamos porteros automáticos y videoporteros en ${t}. Revisamos llamada, conversación, imagen y apertura, y comprobamos la compatibilidad del sistema existente antes de proponer telefonillos, monitores o placas de sustitución.`,
      t => `Si el portero de ${t} no llama, no se escucha o no abre, conviene distinguir qué función falla y si ocurre en una vivienda o en toda la comunidad. Trabajamos con equipos antiguos y actuales de fabricantes habituales como Fermax, Tegui, Golmar y Comelit.`,
      t => `En ${t} atendemos averías, renovaciones e instalaciones nuevas de portero y videoportero. Antes de cambiar un equipo comprobamos sistema, cableado y compatibilidad para evitar recambios que no correspondan a la instalación existente.`
    ]
  },
  {
    id: 'movil-local',
    title: t => `Cobertura móvil 4G/5G en vivienda individual en ${t}`,
    texts: [
      t => `Cuando una vivienda individual de ${t} tiene mala cobertura de datos, podemos estudiar la señal disponible y valorar una antena exterior para router 4G/5G. Para repetidores de llamadas se deben respetar las condiciones del operador y la normativa aplicable.`,
      t => `En casas de ${t} con señal móvil débil se puede valorar la recepción exterior, la ubicación del router y una antena 4G/5G adecuada. No instalamos repetidores de llamadas de forma indiscriminada: primero se determina qué solución es técnicamente y normativamente viable.`,
      t => `La mejora de cobertura móvil en una vivienda de ${t} comienza comprobando operador, señal y uso principal: llamadas, datos o ambos. Según el caso se estudia antena exterior para router, ubicación interior y las limitaciones que correspondan a equipos repetidores.`
    ]
  }
];

function rotate(items, amount) {
  const n = ((amount % items.length) + items.length) % items.length;
  return [...items.slice(n), ...items.slice(0, n)];
}

function otherTownLinks(page, province, localPages) {
  const candidates = localPages.filter(p => p.parent === province.path && normalize(p.name) !== normalize(page.name));
  if (!candidates.length) return '';
  const h = stableHash(`${page.path}|otros`);
  const rotated = rotate(candidates, h % candidates.length).slice(0, 6);
  return `<nav class="other-towns" aria-label="Otros municipios de ${esc(province.name)}">${rotated.map(p => `<a href="${p.path}">Antenista en ${esc(p.name)}</a>`).join('')}</nav>`;
}

function localSeoBlock(page, province, allTownPages) {
  const h = stableHash(`${page.path}|contenido-local`);
  const modules = rotate(serviceModules, h % serviceModules.length);
  const sectionTitles = [
    `Servicios de antenista en ${page.name}`,
    `Reparación e instalación de antenas en ${page.name}`,
    `Técnico de antenas y telecomunicaciones en ${page.name}`,
    `Averías, instalaciones y mantenimiento en ${page.name}`
  ];
  const faqPairs = [
    [`¿Atendéis una avería aunque no sepa dónde está el fallo en ${page.name}?`,`Sí. Lo importante es indicar qué ocurre y si afecta a una o varias tomas. La revisión sirve precisamente para comprobar recepción, amplificación, cableado y distribución antes de decidir qué elemento necesita intervención.`],
    [`¿Trabajáis con instalaciones antiguas en ${page.name}?`,`Sí. Revisamos instalaciones existentes y equipos antiguos cuando siguen siendo reparables o compatibles. Si hay que renovar alguna parte, se valora qué elementos pueden mantenerse y cuáles conviene sustituir.`],
    [`¿Puedo consultar por WhatsApp antes de una visita en ${page.name}?`,`Sí. Puedes indicar localidad, tipo de inmueble y síntomas y, si ayuda, enviar una foto del equipo visible. No es necesario desmontar tapas ni acceder a cubiertas para preparar la consulta.`],
    [`¿Revisáis antenas de comunidades en ${page.name}?`,`Sí. En instalaciones colectivas comprobamos si la incidencia afecta a varios vecinos y revisamos los elementos comunes que correspondan, además de la derivación hacia la vivienda cuando sea necesario.`]
  ];
  const faq = faqPairs[h % faqPairs.length];
  return `<section class="section soft local-intent-section" id="servicio-local" data-local-variant="${h % 997}"><div class="wrap"><span class="eyebrow">Servicio en ${esc(page.name)} · ${esc(site.phone)}</span><h2>${esc(sectionTitles[h % sectionTitles.length])}</h2><p class="section-lead">Consulta por teléfono o WhatsApp indicando ${esc(page.name)}, el tipo de inmueble y el problema observado. El contenido de esta página está orientado a los trabajos que atendemos en la localidad, no a una sede física.</p><div class="local-intents">${modules.map((module, index) => { const text = module.texts[(h + index * 5) % module.texts.length](page.name); return `<article id="${module.id}"><h3>${esc(module.title(page.name))}</h3><p>${esc(text)}</p></article>`; }).join('')}</div><div class="local-faq"><h3>${esc(faq[0])}</h3><p>${esc(faq[1])}</p></div><div class="other-localities"><h3>Otros municipios con servicio en ${esc(province.name)}</h3>${otherTownLinks(page, province, allTownPages)}</div><div class="local-contact"><strong>Servicio en ${esc(page.name)}</strong><a href="tel:${site.tel}">${esc(site.phone)}</a><a href="https://wa.me/${site.whatsapp}">Consultar por WhatsApp</a></div></div></section><style id="local-intent-style">.local-intents{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:24px}.local-intents article{background:#fff;border:1px solid var(--line);border-top:3px solid var(--brand);padding:22px}.local-intents h3,.local-faq h3,.other-localities h3{margin:0 0 8px;font-size:20px;line-height:1.25}.local-intents p,.local-faq p{margin:0;color:var(--muted);font-size:14px}.local-faq{margin-top:18px;background:#fff;border-left:4px solid var(--brand);padding:20px}.other-localities{margin-top:24px}.other-towns{display:flex;flex-wrap:wrap;gap:8px}.other-towns a{display:inline-flex;padding:8px 11px;background:#fff;border:1px solid var(--line);font-size:13px;font-weight:700}.local-contact{display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;margin-top:24px;padding:18px;background:var(--deep);color:#fff}.local-contact a{color:#fff;font-weight:800}.local-contact a:last-child{margin-left:auto}@media(max-width:760px){.local-intents{grid-template-columns:1fr}.local-contact a:last-child{margin-left:0}}</style>`;
}

function injectLocalSeo(html, page, province, allTownPages) {
  const block = localSeoBlock(page, province, allTownPages);
  const marker = '<section class="section wrap faq" id="preguntas">';
  if (!html.includes(marker)) throw new Error(`${page.path}: no se encontró el punto para insertar SEO local`);
  return html.replace(marker, block + marker);
}

function linkProvinceTown(html, town, targetPath) {
  const label = esc(town);
  const plain = `<li data-town="${label}">${label}</li>`;
  if (html.includes(plain)) return html.replace(plain, `<li data-town="${label}"><a href="${targetPath}">${label} →</a></li>`);
  return html;
}

export function generateTownPages(output = 'dist') {
  const localPages = buildTownPages();
  const out = path.resolve(output);
  if (!fs.existsSync(out)) throw new Error('Primero debe ejecutarse scripts/build.mjs');

  for (const page of localPages) {
    const province = provinceFor(page);
    const html = injectLocalSeo(renderPage(page), page, province, localPages);
    const file = path.join(out, routeFile(page.path));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  }

  for (const province of provinces) {
    const file = path.join(out, routeFile(province.path));
    let html = fs.readFileSync(file, 'utf8');
    for (const page of localPages.filter(p => p.parent === province.path)) html = linkProvinceTown(html, page.name, page.path);
    html = html.replace('Los nombres enlazados ya disponen de una página de prueba.', 'Cada localidad enlazada dispone de su propia página de servicio en esta vista previa.');
    fs.writeFileSync(file, html);
  }

  const baseManifestPath = path.join(out, 'preview-manifest.json');
  const manifest = fs.existsSync(baseManifestPath) ? JSON.parse(fs.readFileSync(baseManifestPath, 'utf8')) : { mode: 'preview', inventoryComplete: false, pages: [] };
  const baseNonTown = (manifest.pages || []).filter(p => !explicitTowns.some(t => t.path === p.path));
  manifest.pages = [...baseNonTown, ...localPages.map(p => ({ path: p.path, source: p.source, evidence: p.evidence, canonical: new URL(p.path, site.domain).href, generated: !!p.generated, locality: p.name, province: p.province }))];
  manifest.localPages = localPages.length;
  manifest.generator = 'scripts/generate-town-pages.mjs';
  fs.writeFileSync(baseManifestPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(out, 'local-pages-manifest.json'), JSON.stringify(localPages.map(p => ({ path: p.path, name: p.name, province: p.province, generated: !!p.generated, seoDescription: p.seoDescription })), null, 2));

  const generated = localPages.filter(p => p.generated).length;
  console.log(`SEO LOCAL OK: ${localPages.length} páginas de localidad (${generated} generadas automáticamente + ${localPages.length - generated} especiales).`);
  return localPages;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) generateTownPages();
