import {townReception,RECEPTION_CSS} from './town-reception.mjs';
import {applyLocalTownGuide} from './local-town-guides.mjs';
import {simplifyContacts} from './contact-policy.mjs';
import {localEnquiry} from './local-enquiry.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { brandMark, brandLogoSvg } from './logo.mjs';
import { displayPlaceName, homeSeoMetadata, provinceSeoMetadata, serviceSeoMetadata, serviceIndexSeoMetadata } from './seo-metadata.mjs';
import { DOMAIN, PHONE, BRAND, LEGAL_FILES, publicPath, fileForPublicPath, rewriteUrl, escapeHtml, decodeHtml, titleOf, metaOf, setMeta, rewriteStructuredData, townMetadata, redirectRules, organizationSchema } from './public-seo.mjs';
const PROVINCE_META = {
  '/antenas-alava/': ['Álava','diagnóstico de señal, antenas colectivas y porteros'],
  '/antenas-bizkaia/': ['Bizkaia','TDT, cabeceras comunitarias, porteros y videoporteros'],
  '/antenas-burgos/': ['Burgos','antenas, amplificación, distribución y satélite'],
  '/antenas-guipuzcoa/': ['Gipuzkoa','señal TV, porteros, videoporteros y comunidades'],
  '/antenas-cantabria/': ['Cantabria','TDT, parabólicas, amplificación y distribución'],
  '/antenas-navarra/': ['Navarra','antenas, señal, porteros y sistemas de acceso'],
  '/antenas-la-rioja/': ['La Rioja','TDT, satélite, amplificación y porteros'],
  '/antenas-palencia/': ['Palencia','antenas, señal débil, cableado y comunidades'],
  '/antenas-valladolid/': ['Valladolid','antenas, nuevas tomas, porteros y videoporteros'],
  '/antenas-leon/': ['León','recepción TV, satélite, instalaciones antiguas y porteros'],
  '/antenas-segovia/': ['Segovia','TDT, distribución, porteros automáticos y comunidades']
};
function provinceMetadata(route) {
  const info = PROVINCE_META[route];
  if (!info) return null;
  return provinceSeoMetadata(info[0]);
}


export function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path.join(dir,entry.name)) : [path.join(dir,entry.name)]);
}

export function finalizePublicSeo(root = path.resolve(process.env.PRODUCTION_ROOT || 'dist')) {
  root = path.resolve(root);
  const manifestFile = path.join(root, 'local-pages-manifest.json');
  const sourceTowns = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const nameCounts = new Map();
  const nameKey = town => displayPlaceName(town.name).toLocaleLowerCase('es');
  for (const town of sourceTowns) nameCounts.set(nameKey(town), (nameCounts.get(nameKey(town)) || 0) + 1);
  const towns = sourceTowns.map(town => ({...town, disambiguate: town.disambiguate || nameCounts.get(nameKey(town)) > 1}));
  const townByPath = new Map(towns.map(t => [publicPath(t.path), t]));
  if (townByPath.size !== towns.length) throw new Error('Two municipalities resolve to the same public URL');
  const documents = walk(root).filter(f => f.endsWith('.html')).map(file => {
    const legacyFile = path.relative(root, file).split(path.sep).join('/');
    const route = publicPath('/' + legacyFile);
    return {legacyFile, path:route, file: fileForPublicPath(route), html:fs.readFileSync(file,'utf8')};
  });
  const byPath = new Map();
  // A historic alias is removed only when its equivalent municipality has a real HTML document.
  for (const doc of documents) {
    const old = byPath.get(doc.path);
    if (!old || ('/' + doc.legacyFile).toLowerCase() === '/' + doc.file) byPath.set(doc.path, doc);
  }
  for (const doc of documents) {
    if (doc.file !== doc.legacyFile.toLowerCase() && doc.legacyFile !== 'index.html' && !documents.some(other => other.legacyFile.toLowerCase() === doc.file)) {
      throw new Error(`Missing destination for ${doc.legacyFile}: ${doc.file}`);
    }
  }
  const rules = redirectRules(documents);
  const priorManifest = path.join(root, 'public-seo-manifest.json');
  if (fs.existsSync(priorManifest)) {
    for (const {from,to} of JSON.parse(fs.readFileSync(priorManifest,'utf8')).redirects) {
      if (!byPath.has(to) || (rules.has(from) && rules.get(from)!==to)) throw new Error('Inconsistent previous redirect manifest');
      rules.set(from,to);
    }
  }
  const report = [];
  for (const doc of byPath.values()) {
    let html = doc.html;
    const canonical = DOMAIN + doc.path;
    const legal = LEGAL_FILES.has(doc.file);
    const errorPage = doc.file === '404.html';
    const town = townByPath.get(doc.path);
    html = html.replace(/\b(href|src)=("|')([^"']*)\2/gi, (_,attr,quote,value) => `${attr}=${quote}${escapeHtml(rewriteUrl(decodeHtml(value),doc.path))}${quote}`);
    let title = titleOf(html);
    let description = metaOf(html,'description');
    let heading;
    if (town) {
      const metadata = townMetadata(town);
      title = metadata.title;
      description = metadata.description;
      heading = metadata.heading;
      if (!html.includes('id="recepcion-tdt-local"')) {
        html = html.replace(/(<section class="section wrap" id="servicios">[\s\S]*?<\/section>)/, section => section + townReception(town));
      }
      html = applyLocalTownGuide(html,town);
      if (!html.includes('/assets/town-reception.css')) html=html.replace('</head>','<link rel="stylesheet" href="/assets/town-reception.css?v=zallatel-recepcion-v1"></head>');
    } else if (provinceMetadata(doc.path)) {
      const metadata = provinceMetadata(doc.path);
      title = metadata.title;
      description = metadata.description;
      heading = metadata.heading;
    } else if (doc.path === '/') {
      ({title,description,heading}=homeSeoMetadata());
      html = html.replace(/<p\b[^>]*id="identidad-zalla"[^>]*>[\s\S]*?<\/p>/, '');
      if (!html.includes('id="antenas-zalla-enkarterri"')) {
        const names = ['Zalla','Balmaseda','Güeñes','Sopuerta','Gordexola','Galdames','Artzentales','Karrantza Harana/Valle de Carranza','Trucios-Turtzioz','Lanestosa','Muskiz','Abanto y Ciérvana-Abanto Zierbena','Ortuella','Valle de Trápaga-Trapagaran','Barakaldo','Getxo','Portugalete','Santurtzi','Durango','Gernika-Lumo','Mungia','Amorebieta-Etxano','Basauri','Bermeo','Eibar','Elgoibar','Bergara','Beasain','Tolosa','Zarautz','Amurrio','Artziniega','Lerma','Medina de Pomar','Salas de los Infantes','Haro'];
        const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
        const links = names.map(name => towns.find(t => normalize(t.name) === normalize(name))).filter(Boolean);
        if (links.length) {
          const local = `<section class="section soft" id="antenas-zalla-enkarterri"><div class="wrap"><span class="eyebrow">Consulta por localidad</span><h2>Encuentra ayuda en tu pueblo</h2><p class="section-lead">Busca entre los 2.007 municipios de nuestras 11 provincias y prepara una consulta de antenas, porteros, TDT por satélite o montaje Starlink.</p>${localEnquiry(towns)}<h3 class="local-enquiry-directory-title">Accesos directos a más pueblos</h3><nav class="featured-towns" aria-label="Accesos directos a pueblos con servicio de antenista">${links.map(t => `<a href="${escapeHtml(publicPath(t.path))}">Antenista en ${escapeHtml(t.name)}</a>`).join('')}</nav><a class="local-enquiry-route" href="#zonas">Ver los municipios de las 11 provincias →</a></div></section>`;
          html = html.replace('</main>', local + '</main>');
        }
      }
    } else if (doc.path.startsWith('/servicios/')) {
      ({title,description,heading}=doc.path==='/servicios/' ? serviceIndexSeoMetadata() : serviceSeoMetadata(doc.path));
    }
    if (heading) html = html.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, (_,open,close) => open + escapeHtml(heading) + close);
    if (legal) html = setMeta(html,'robots','noindex,follow');
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    if (!errorPage) {
      html = setMeta(html,'description',description);
      for (const [key,value] of Object.entries({'og:title':title,'og:description':description,'og:url':canonical,'og:site_name':BRAND,'og:locale':'es_ES','og:type':'website'})) html = setMeta(html,key,value,true);
      if (fs.existsSync(path.join(root,'assets/hero-zallatel.png')) && !legal) {
        const image = DOMAIN + '/assets/hero-zallatel.png';
        html = setMeta(html,'og:image',image,true);
        html = setMeta(html,'og:image:alt','Antenas Zalla: servicio técnico de antenas',true);
        for (const [key,value] of Object.entries({'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image})) html = setMeta(html,key,value);
        if (html.includes('class="hero-photo"') && !html.includes('as="image"')) html = html.replace('</head>','<link rel="preload" as="image" href="/assets/hero-zallatel.png" fetchpriority="high"></head>');
      }
    }
    html = html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi, (_,open,raw,close) => {
      const data = rewriteStructuredData(JSON.parse(raw));
      const entities = data['@graph'] || [data];
      for (const entity of entities) {
        if (['WebPage','CollectionPage'].includes(entity['@type'])) Object.assign(entity,{name:title,description,url:canonical,inLanguage:'es'});
        if (entity['@type'] === 'WebSite') Object.assign(entity,{name:BRAND,alternateName:'Antenas Zallatel',url:DOMAIN+'/',publisher:{'@id':DOMAIN+'/#organizacion'}});
        if (entity['@type'] === 'Organization' && entity['@id'] === DOMAIN+'/#organizacion') Object.assign(entity,organizationSchema());
        if (entity['@type'] === 'Service') {
          entity.description = description;
          if (Array.isArray(entity.serviceType) && !entity.serviceType.includes('TDT por satélite HD')) entity.serviceType.push('TDT por satélite HD');
        }
      }
      if (data['@graph'] && !entities.some(e => e['@id'] === DOMAIN+'/#organizacion')) entities.push(organizationSchema());
      return open + JSON.stringify(data).replace(/</g,'\\u003c') + close;
    });
    if (!html.includes('rel="icon"')) html = html.replace('</head>','<link rel="icon" type="image/svg+xml" href="/favicon.svg"></head>');
    if (doc.path === '/') html = html.replace('href="/antenas-leon/">Leon</a>', 'href="/antenas-leon/">León</a>');
    html=html.replace(/<div class="strip"><div class="wrap">[\s\S]*?<\/div><\/div>/g,'');
    if (!legal && !errorPage) html = simplifyContacts(html);
    html=html.replace(/href="\/assets\/site\.css(?:\?[^"]*)?"/g,'href="/assets/site.css?v=zalla-20261113-local"');
    doc.html = html;
    report.push({path:doc.path,file:doc.file,indexable:!legal&&!errorPage,type:town?'town':doc.path==='/'?'home':doc.path.startsWith('/servicios/')?'service':doc.path.startsWith('/guias/')?'guide':doc.path==='/blog/'?'blog':doc.path.endsWith('/')?'province':legal?'legal':'error',title});
  }
  fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  fs.writeFileSync(path.join(root,'assets/town-reception.css'),RECEPTION_CSS);
  fs.writeFileSync(path.join(root,'assets/logo-antenas-zalla.svg'),brandLogoSvg());
  // All transformations and collision checks finish before the output is replaced.
  for (const doc of documents) fs.rmSync(path.join(root,doc.legacyFile));
  for (const doc of byPath.values()) {
    const file = path.join(root,doc.file);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,doc.html);
  }
  // Remove empty legacy directories, but never assets or nonempty content.
  for (const name of fs.readdirSync(root)) {
    const dir = path.join(root,name);
    if (/^Antenas-/.test(name) && fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length===0) fs.rmdirSync(dir);
  }
  const updated = towns.map(t => ({...t, legacyPath:t.legacyPath||t.path, path:'/'+fileForPublicPath(publicPath(t.path)), publicPath:publicPath(t.path)}));
  fs.writeFileSync(manifestFile,JSON.stringify(updated,null,2)+'\n');
  fs.writeFileSync(path.join(root,'public-seo-manifest.json'),JSON.stringify({version:1,domain:DOMAIN,towns:towns.length,documents:report,redirects:[...rules].map(([from,to])=>({from,to}))},null,2)+'\n');
  fs.writeFileSync(path.join(root,'_redirects'), '# Generated: old document URLs go directly to their canonical equivalent. No wildcard homepage fallback.\n' + [...rules].map(([from,to])=>`${from} ${DOMAIN}${to} 301!`).join('\n') + '\nhttps://www.antenaszalla.com/* https://antenaszalla.com/:splat 301!\nhttp://www.antenaszalla.com/* https://antenaszalla.com/:splat 301!\nhttp://antenaszalla.com/* https://antenaszalla.com/:splat 301!\n');
  const icon = brandMark().match(/<svg[\s\S]*?<\/svg>/)?.[0];
  if (!icon) throw new Error('Missing existing brand icon');
  fs.writeFileSync(path.join(root,'favicon.svg'),icon.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" color="#0b2d48" '));
  console.log(`PUBLIC SEO READY: ${report.filter(d=>d.indexable).length} canonical documents, ${towns.length} municipalities, ${rules.size} direct legacy redirects. Design, contact details and service content preserved.`);
  return {documents:report,redirects:rules};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) finalizePublicSeo();
