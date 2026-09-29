import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');

const faviconLinks='';


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
    .replace(/&middot;/gi, ' · ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const forbiddenVisible = [
  /vista previa/i,
  /modo de revisión/i,
  /versión de revisión/i,
  /pendiente(?:s)? de revisión/i,
  /página de prueba/i,
  /página local generada/i,
  /generada para esa localidad/i,
  /selección parcial/i,
  /web actual permanece/i,
  /no sustituye la web actual/i,
  /\bnoindex\b/i,
  /\bpreview\b/i,
  /\bdemo\b/i,
  /\btest\b/i
];

let changed = 0;
for (const file of walk(root)) {
  if (!file.endsWith('.html')) continue;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  

  // Ningún texto interno de desarrollo debe quedar visible para el cliente.
  // El noindex técnico de la preview se conserva únicamente en <head>/cabeceras.
  html = html
    .replace(/<div class="preview">[\s\S]*?<\/div>/gi, '')
    .replaceAll('Los nombres enlazados ya disponen de una página de prueba.', 'Selecciona tu municipio para consultar los servicios disponibles.')
    .replaceAll('Buscar en esta selección', 'Buscar municipio')
    .replaceAll(' localidades en esta selección', ' municipios disponibles')
    .replaceAll('Cada enlace abre una página local generada para esa localidad. La web continúa en modo de revisión y noindex.', 'Selecciona un municipio para consultar sus servicios de antenas, porteros y videoporteros.')
    .replaceAll('Cada enlace abre una página local generada para esa localidad.', 'Selecciona un municipio para consultar sus servicios de antenas, porteros y videoporteros.')
    .replaceAll('La web continúa en modo de revisión y noindex.', '')
    .replace(/<p class="notice">[^<]*(?:vista previa|modo de revisión|noindex|página de prueba|selección parcial|web actual|generada para esa localidad)[^<]*<\/p>/gi, '')
    .replace(/<details><summary>Información de esta vista previa y privacidad<\/summary><p>[\s\S]*?<\/p><\/details>/gi, '')
    .replaceAll('Antenas Zalla · Versión de revisión. La web actual permanece en su alojamiento. Fotografías y listado completo de localidades pendientes de revisión.', 'Antenas Zalla · Propiedad de R.F.G. · 946 390 339')
    .replaceAll('Página no incluida en esta vista previa', 'Página no disponible')
    .replaceAll('El inventario de la renovación está en revisión. Esto no indica que la página se haya eliminado de la web actual.', 'La dirección solicitada no está disponible. Puedes volver al inicio o contactar con Antenas Zalla.');

  const visible = visibleText(html);
  for (const pattern of forbiddenVisible) {
    if (pattern.test(visible)) {
      const rel = path.relative(root, file).split(path.sep).join('/');
      throw new Error(`${rel}: queda texto interno visible: ${pattern}`);
    }
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed++;
  }
}

// Bloque final de cifras de la portada, calculado desde los datos reales del build.
const manifestFile = path.join(root, 'local-pages-manifest.json');
const servicesFile = path.resolve('content', 'services.json');
if (!fs.existsSync(manifestFile)) throw new Error('Falta local-pages-manifest.json para generar las cifras de portada');
if (!fs.existsSync(servicesFile)) throw new Error('Falta content/services.json para generar las cifras de portada');
const localPages = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const services = JSON.parse(fs.readFileSync(servicesFile, 'utf8'));
const provinceSegments = new Set(localPages.map(page => String(page.path || '').replace(/^\//, '').split('/')[0]).filter(Boolean));
const stats = { towns: localPages.length, provinces: provinceSegments.size, services: services.length };
const featuredByProvince={
  'Antenas-Alava':['Vitoria-Gasteiz','Laudio / Llodio','Amurrio','Agurain / Salvatierra','Laguardia','Alegría-Dulantzi','Artziniega','Elciego'],
  'Antenas-Bizkaia':['Bilbao','Barakaldo','Getxo','Portugalete','Santurtzi','Durango','Gernika-Lumo','Mungia'],
  'Antenas-Burgos':['Burgos','Miranda de Ebro','Aranda de Duero','Briviesca','Medina de Pomar','Lerma','Belorado','Salas de los Infantes'],
  'Antenas-Cantabria':['Santander','Torrelavega','Castro-Urdiales','Camargo','Laredo','Santoña','Noja','Reinosa'],
  'Antenas-Guipuzcoa':['Donostia / San Sebastián','Irun','Errenteria','Eibar','Zarautz','Hernani','Hondarribia','Beasain'],
  'Antenas-La-Rioja':['Logroño','Calahorra','Arnedo','Haro','Alfaro','Nájera','Santo Domingo de la Calzada','Lardero'],
  'Antenas-Leon':['León','Ponferrada','San Andrés del Rabanedo','Astorga','La Bañeza','Villablino','Bembibre','Valencia de Don Juan'],
  'Antenas-Navarra':['Pamplona / Iruña','Tudela','Barañáin / Barañain','Estella-Lizarra','Tafalla','Burlada / Burlata','Zizur Mayor / Zizur Nagusia','Villava / Atarrabia'],
  'Antenas-Palencia':['Palencia','Aguilar de Campoo','Guardo','Venta de Baños','Villamuriel de Cerrato','Cervera de Pisuerga','Carrión de los Condes','Dueñas'],
  'Antenas-Salamanca':['Salamanca','Béjar','Ciudad Rodrigo','Santa Marta de Tormes','Peñaranda de Bracamonte','Villamayor','Guijuelo','Alba de Tormes'],
  'Antenas-Segovia':['Segovia','Cuéllar','El Espinar','San Ildefonso','Cantalejo','Nava de la Asunción','Riaza','Carbonero el Mayor'],
  'Antenas-Soria':['Soria','Almazán','El Burgo de Osma','Ólvega','San Esteban de Gormaz','Ágreda','San Leonardo de Yagüe','Golmayo'],
  'Antenas-Valladolid':['Valladolid','Laguna de Duero','Medina del Campo','Arroyo de la Encomienda','Tordesillas','Tudela de Duero','Íscar','Peñafiel'],
  'Antenas-Zamora':['Zamora','Benavente','Toro','Puebla de Sanabria','Morales del Vino','Villaralbo','Fuentesaúco','Fermoselle'],
  'Antenas-Asturias':['Gijón','Oviedo','Avilés','Siero','Langreo','Mieres'],
  'Antenas-Avila':['Ávila','Arévalo','Arenas de San Pedro','Las Navas del Marqués','Candeleda','El Tiemblo','Sotillo de la Adrada','Cebreros']
};
const normTown=v=>String(v||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const localByProvince=new Map();
for(const page of localPages){const seg=String(page.path||'').replace(/^\//,'').split('/')[0];if(!localByProvince.has(seg))localByProvince.set(seg,[]);localByProvince.get(seg).push(page);}
const featuredCards=[...provinceSegments].sort((a,b)=>a.localeCompare(b,'es')).map(seg=>{
 const pagesFor=localByProvince.get(seg)||[],byName=new Map(pagesFor.map(p=>[normTown(p.name),p]));
 const requested=featuredByProvince[seg]||[];
 const chosen=requested.map(n=>byName.get(normTown(n))).filter(Boolean).slice(0,18);
 const chosenPaths=new Set(chosen.map(p=>p.path));
 const extra=pagesFor.filter(p=>!chosenPaths.has(p.path)).sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'})).slice(0,12);
 const provinceName=seg.replace(/^Antenas-/,'').replace('Guipuzcoa','Gipuzkoa').replace('Alava','Álava').replaceAll('-',' ');
 if(chosen.length<4) throw new Error(`Portada: faltan pueblos destacados válidos para ${seg} (${chosen.length}/12)`);
 if(extra.length<18) throw new Error(`Portada: faltan pueblos adicionales válidos para ${seg} (${extra.length}/18)`);
 return `<article class="featured-province"><h3><a href="/${seg}/">${provinceName}</a></h3><div class="featured-towns">${chosen.map(p=>`<a href="${p.path}">Antenista en ${p.name}</a>`).join('')}</div><details class="featured-more"><summary>Más pueblos con servicio</summary><div class="featured-more-links">${extra.map(p=>`<a href="${p.path}">Antenista en ${p.name}</a>`).join('')}</div></details><a class="featured-all" href="/${seg}/">Ver todos los pueblos →</a></article>`;
}).join('');
const featuredHtml=`<section class="featured-localities" id="pueblos-destacados"><div class="wrap"><span class="eyebrow">Localidades principales</span><h2>Pueblos y ciudades con servicio</h2><p class="featured-lead">Accesos directos a más localidades con página propia. Cada enlace abre el servicio de antenista en ese pueblo; consulta la provincia para ver el listado completo.</p><div class="featured-province-grid">${featuredCards}</div></div></section>`;

const statsHtml = `<section class="rapid-stats" id="rapid-stats" aria-labelledby="rapid-stats-title"><div class="wrap"><div class="rapid-stats-head"><span class="eyebrow">Antenas Zalla en cifras</span><h2 id="rapid-stats-title">Servicio organizado por localidades</h2><p>La web reúne páginas locales y servicios técnicos para facilitar la consulta por municipio.</p></div><div class="rapid-stats-grid"><article><strong>${stats.towns.toLocaleString('es-ES')}</strong><span>Pueblos con página local</span></article><article><strong>${stats.provinces}</strong><span>Provincias organizadas</span></article><article><strong>${stats.services}</strong><span>Servicios técnicos</span></article></div></div></section>`;
const homeFile = path.join(root, 'index.html');
let homeHtml = fs.readFileSync(homeFile, 'utf8');
homeHtml=homeHtml.replace('<section class="hero">','<section class="hero home-clean-hero">');
if (!homeHtml.includes('id="pueblos-destacados"')) { const marker='<section class="section wrap faq" id="preguntas">'; if(!homeHtml.includes(marker)) throw new Error('Portada: no se encontró el punto para insertar pueblos destacados'); homeHtml=homeHtml.replace(marker,featuredHtml+marker); }
if (!homeHtml.includes('id="rapid-stats"') && homeHtml.includes('<footer class="footer">')) {
  homeHtml = homeHtml.replace('<footer class="footer">', `${statsHtml}<footer class="footer">`);
} else if (!homeHtml.includes('id="rapid-stats"')) {
  throw new Error('No se encontró el footer para insertar las cifras de portada');
}
fs.writeFileSync(homeFile, homeHtml);

// CSS visual se mantiene exclusivamente en src/site.css para evitar capas heredadas y solapes.
console.log(`COPY FINAL OK: ${changed} HTML limpiados; CSS visual único conservado.`);
