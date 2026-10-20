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

const zenitUrl='https://www.suministroselectricos.es/20691-home_default/antena-v-zenit-uhf-2o-dividendo-digital-lte700-televes-149221.jpg';
const zenitTarget=path.join(root,'assets','televes-v-zenit-149221.jpg');
async function fetchAsset(url,target,label){
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 AntenasZallatel/1.0'}});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=Buffer.from(await response.arrayBuffer());
      if(data.length<5000) throw new Error(`archivo demasiado pequeño (${data.length} bytes)`);
      fs.writeFileSync(target,data);
      return;
    }catch(error){
      last=error;
      if(attempt<3) await new Promise(resolve=>setTimeout(resolve,500*attempt));
    }
  }
  throw new Error(`No se pudo preparar ${label}: ${last?.message||last}`);
}
await fetchAsset(zenitUrl,zenitTarget,'foto original de la Televés V Zenit 149221');

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

const LOCAL_AREAS = [
  {province:'Bizkaia',name:'Enkarterri',towns:['Zalla','Balmaseda','Güeñes','Sopuerta','Gordexola','Galdames','Artzentales','Karrantza Harana/Valle de Carranza','Trucios-Turtzioz','Lanestosa']},
  {province:'Bizkaia',name:'Durangaldea',towns:['Durango','Amorebieta-Etxano','Abadiño','Berriz','Elorrio','Iurreta','Atxondo','Garai']},
  {province:'Bizkaia',name:'Busturialdea',towns:['Gernika-Lumo','Bermeo','Mundaka','Busturia','Forua','Muxika','Sukarrieta','Gautegiz Arteaga']},
  {province:'Bizkaia',name:'Uribe',towns:['Mungia','Bakio','Plentzia','Gorliz','Lemoiz','Gatika','Laukiz','Urduliz']},
  {province:'Bizkaia',name:'Nerbioi-Ibaizabal',towns:['Galdakao','Basauri','Arrigorriaga','Etxebarri','Ugao-Miraballes','Zeberio','Zaratamo','Lemoa']},
  {province:'Bizkaia',name:'Margen Izquierda',towns:['Barakaldo','Portugalete','Santurtzi','Sestao','Valle de Trápaga-Trapagaran','Ortuella','Abanto y Ciérvana-Abanto Zierbena','Muskiz']},
  {province:'Burgos',name:'Arlanza',towns:['Lerma','Covarrubias','Santa María del Campo','Villalmanzo','Quintanilla del Agua y Tordueles','Madrigal del Monte','Mecerreyes']},
  {province:'Burgos',name:'Ribera del Duero',towns:['Aranda de Duero','Roa','Gumiel de Izán','Gumiel de Mercado','La Horra','Peñaranda de Duero','Fuentespina','Villalba de Duero']},
  {province:'Burgos',name:'Las Merindades',towns:['Medina de Pomar','Villarcayo de Merindad de Castilla la Vieja','Espinosa de los Monteros','Frías','Oña','Trespaderne','Valle de Mena','Merindad de Montija']},
  {province:'Burgos',name:'La Bureba',towns:['Briviesca','Poza de la Sal','Monasterio de Rodilla','Pancorbo','Prádanos de Bureba','Quintanavides','Rojas','Salinillas de Bureba']},
  {province:'Burgos',name:'Sierra de la Demanda',towns:['Salas de los Infantes','Quintanar de la Sierra','Canicosa de la Sierra','Hontoria del Pinar','Huerta de Rey','Regumiel de la Sierra','Vilviestre del Pinar','Neila']},
  {province:'Cantabria',name:'Costa Oriental',towns:['Castro-Urdiales','Laredo','Colindres','Limpias','Ampuero','Guriezo','Ramales de la Victoria','Rasines']},
  {province:'Cantabria',name:'Trasmiera',towns:['Santoña','Noja','Arnuero','Bareyo','Meruelo','Escalante','Bárcena de Cicero','Hazas de Cesto']},
  {province:'Cantabria',name:'Besaya',towns:['Torrelavega','Cartes','Corrales de Buelna, Los','San Felices de Buelna','Reocín','Polanco','Suances','Santillana del Mar']},
  {province:'Cantabria',name:'Campoo',towns:['Reinosa','Campoo de Enmedio','Hermandad de Campoo de Suso','Campoo de Yuso','Rozas de Valdearroyo, Las','Valdeolea','Valdeprado del Río','Valderredible']},
  {province:'Cantabria',name:'Liébana',towns:['Potes','Cillorigo de Liébana','Camaleño','Vega de Liébana','Pesaguero','Tresviso','Peñarrubia']},
  {province:'Cantabria',name:'Bahía de Santander',towns:['Camargo','Astillero, El','Santa Cruz de Bezana','Piélagos','Marina de Cudeyo','Medio Cudeyo','Ribamontán al Mar','Ribamontán al Monte']}
];

const normalizeTown = value => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');

function areaFor(page) {
  const key = normalizeTown(page.name);
  return LOCAL_AREAS.find(area => area.province === page.province && area.towns.some(name => normalizeTown(name) === key));
}

function relatedTownBlock(page) {
  const list = byProvince.get(page.province) || [];
  if (list.length < 2) return '';
  const byName = new Map(list.map(p => [normalizeTown(p.name),p]));
  const area = areaFor(page);
  const selected = [];

  if (area) {
    for (const name of area.towns) {
      const candidate = byName.get(normalizeTown(name));
      if (candidate && candidate.path !== page.path && !selected.some(x => x.path === candidate.path)) selected.push(candidate);
      if (selected.length >= 6) break;
    }
  }

  if (selected.length < 6) {
    const index = list.findIndex(p => p.path === page.path);
    const offsets = [-2,-1,1,2,-3,3,-4,4,5,-5];
    for (const offset of offsets) {
      if (selected.length >= 6) break;
      const candidate = list[(index + offset + list.length) % list.length];
      if (candidate && candidate.path !== page.path && !selected.some(x => x.path === candidate.path)) selected.push(candidate);
    }
  }

  const heading = area ? `Antenista en pueblos de ${area.name}` : `Servicio de antenista en otros municipios de ${page.province}`;
  const intro = area
    ? `Consulta también localidades de ${area.name} relacionadas con esta zona de ${page.province}.`
    : `Consulta otras páginas locales de Antenas Zallatel dentro de ${page.province}.`;
  const label = area ? `Zona: ${area.name}` : `Provincia: ${page.province}`;

  return `<section class="related-towns-section" aria-label="${heading}"><div class="wrap"><div class="related-towns"><span class="related-area-label">${label}</span><h3>${heading}</h3><p>${intro}</p><div class="related-town-links">${selected.map(p => `<a href="${p.path}">${p.name}</a>`).join('')}</div></div></div></section>`;
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
