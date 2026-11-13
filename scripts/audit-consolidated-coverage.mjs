import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DOMAIN,fileForPublicPath,decodeHtml,escapeHtml as esc} from './public-seo.mjs';
import {distanceKm,selectCoverage,PRIORITY_MUNICIPALITY_CODES,GETARIA_ALIASES,GETARIA_CANONICAL_PATH,COVERAGE_RELEASE} from './municipal-coverage.mjs';
import {displayPlaceName} from './seo-metadata.mjs';
const root=path.resolve(process.env.PRODUCTION_ROOT||'dist');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const coverage=read('coverage-manifest.json'),manifest=read('public-seo-manifest.json'),towns=read('local-pages-manifest.json');
assert.equal(coverage.release,COVERAGE_RELEASE,'Versión de cobertura desactualizada');
assert.deepEqual(coverage.policy.additionalMunicipalityCodes,PRIORITY_MUNICIPALITY_CODES,'Prioridades de cobertura desactualizadas');
const geo=new Map(JSON.parse(fs.readFileSync('content/municipal-geography.json','utf8')).municipalities.map(t=>[t.code,t]));
const cachedProvinces=JSON.parse(fs.readFileSync('.cache/municipios-selected.json','utf8')).provinces;
const expected=Object.values(cachedProvinces).flat();
assert.equal(coverage.total,expected.length);assert.equal(coverage.assignments.length,expected.length);
assert.deepEqual(new Set(coverage.assignments.map(a=>a.code)),new Set(expected.map(t=>t.id)));
assert.equal(towns.length,coverage.retained);assert.equal(coverage.redirected,coverage.total-coverage.retained);
assert.equal(manifest.towns,coverage.retained,'Manifiesto público con número de páginas incoherente');
assert.equal(manifest.coveredMunicipalities,coverage.total,'Manifiesto público con cobertura incompleta');
assert.equal(coverage.provinces.length,Object.keys(cachedProvinces).length,'Cobertura provincial incompleta');
assert.equal(new Set(towns.map(t=>t.province)).size,coverage.provinces.length,'Faltan páginas propias de una provincia');
const retained=new Map(towns.map(t=>[t.publicPath,t]));
const redirects=new Map(manifest.redirects.map(r=>[r.from,r.to]));
const htmls=new Map(towns.map(t=>[t.publicPath,fs.readFileSync(path.join(root,t.path.slice(1)),'utf8')]));
const retainedCodes=new Set(towns.map(t=>t.code));
const baseline=selectCoverage(coverage.assignments.map(row=>({...geo.get(row.code),province:row.province,protected:row.code==='48096'})),{priorityCodes:[]});
for(const town of baseline.retained)assert(retainedCodes.has(town.code),`Se ha retirado una ficha de la selección anterior: ${town.name}`);
for(const code of PRIORITY_MUNICIPALITY_CODES)assert(retainedCodes.has(code),`Falta una ficha recuperada del País Vasco: ${code}`);
for(const alias of GETARIA_ALIASES)assert.equal(redirects.get(alias),GETARIA_CANONICAL_PATH,`Alias de Getaria sin redirección directa: ${alias}`);
assert(!redirects.has(GETARIA_CANONICAL_PATH),'La ficha propia de Getaria no debe redirigir');
for(const row of coverage.assignments){
 const hub=retained.get(row.destination);assert(hub,`Destino inexistente: ${row.name}`);
 assert.equal(row.province,hub.province);assert.ok(distanceKm(geo.get(row.code),hub)<=coverage.policy.maxDistanceKm);
 if(row.population>=coverage.policy.minimumPopulation||row.name==='Zalla'||PRIORITY_MUNICIPALITY_CODES.includes(row.code))assert.equal(row.original,row.destination);
 if(row.original!==row.destination){
  assert(!fs.existsSync(path.join(root,row.originalFile.slice(1))),`HTML retirado sigue publicado: ${row.name}`);
  assert.equal(redirects.get(row.original),row.destination);
  assert(htmls.get(row.destination).includes(`id="cobertura-${row.code}">${esc(displayPlaceName(row.name))}</li>`),`Pueblo no visible: ${row.name}`);
  assert.equal(row.url,row.destination+`#cobertura-${row.code}`);
 }
}
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(home.includes('id="pais-vasco"'),'Falta la cobertura destacada del País Vasco en portada');
for(const route of ['/antenas-bizkaia/','/antenas-guipuzcoa/','/antenas-alava/',GETARIA_CANONICAL_PATH,'/antenas-bizkaia/lekeitio'])assert(home.includes(`href="${route}"`),`Falta enlace destacado del País Vasco: ${route}`);
const stats=home.match(/<section\b[^>]*\bid="zalla-stats"[^>]*>[\s\S]*?<\/section>/)?.[0];
assert(stats,'Faltan las cifras finales de portada');
const counters=new Map([...stats.matchAll(/<article><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/article>/g)].map(m=>[decodeHtml(m[2]),Number(decodeHtml(m[1]).replace(/\D/g,''))]));
assert.equal(counters.get('Localidades con página propia'),coverage.retained,'Portada: el contador no coincide con las páginas locales publicadas');
assert.equal(counters.get('Provincias organizadas'),coverage.provinces.length,'Portada: contador provincial incoherente');
assert(!stats.includes('Pueblos con página local'),'Portada: etiqueta antigua del contador local');
assert(stats.includes(`${coverage.total.toLocaleString('es-ES')} municipios`),'Portada: falta la cobertura municipal total');
assert(stats.includes(`${coverage.provinces.length} provincias`),'Portada: falta la cobertura provincial total');
const payload=JSON.parse(home.match(/<script[^>]*data-enquiry-towns[^>]*>([\s\S]*?)<\/script>/)?.[1]||'[]');
assert.equal(payload.length,coverage.total,'Buscador incompleto');
for(const row of coverage.assignments){
 const entry=payload.find(t=>t.name===row.name&&t.province===row.province);assert(entry,'Falta municipio en buscador: '+row.name);assert.equal(entry.route,row.url);
}
const docs=new Map(manifest.documents.map(d=>[d.path,d]));
const contextualIncoming=new Map(towns.map(t=>[t.publicPath,new Set()]));
const provinceLinks=new Map();
let contextualLinkCount=0;
for(const town of towns){
 const html=htmls.get(town.publicPath);
 const navs=[...html.matchAll(/<nav\b(?=[^>]*\bdata-contextual-town-links\b)[^>]*>([\s\S]*?)<\/nav>/g)];
 assert.equal(navs.length,1,`Debe existir una navegación contextual: ${town.name}`);
 const links=[...navs[0][1].matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
 const candidates=towns.filter(t=>t.province===town.province&&t.code!==town.code).sort((a,b)=>distanceKm(town,a)-distanceKm(town,b)||a.code.localeCompare(b.code));
 assert(links.length>=Math.min(4,candidates.length)&&links.length<=6,`Número de enlaces contextuales fuera de 4–6: ${town.name}`);
 const destinations=new Set();let previousDistance=-1;
 for(const [,href,label] of links){
  const url=new URL(decodeHtml(href),DOMAIN+town.publicPath);
  assert.equal(url.origin,DOMAIN,`Enlace contextual externo: ${town.name}`);
  assert(!url.hash&&!url.search,`El enlace contextual debe ir a la página propia: ${href}`);
  const target=retained.get(url.pathname);assert(target,`Destino contextual no retenido: ${href}`);
  assert.notEqual(target.code,town.code,`Autoenlace contextual: ${town.name}`);
  assert.equal(target.province,town.province,`Enlace contextual fuera de la provincia: ${town.name}`);
  assert(!destinations.has(target.publicPath),`Destino contextual duplicado: ${town.name}`);
  assert.equal(decodeHtml(label.replace(/<[^>]+>/g,'')).trim(),`Antenista en ${displayPlaceName(target.name)}`,`Etiqueta de localidad incoherente: ${href}`);
  const distance=distanceKm(town,target);
  assert(distance>=previousDistance-1e-9,`Enlaces sin ordenar por cercanía: ${town.name}`);
  previousDistance=distance;destinations.add(target.publicPath);
  contextualIncoming.get(target.publicPath).add(town.publicPath);contextualLinkCount++;
 }
 for(const target of candidates.slice(0,Math.min(4,candidates.length)))assert(destinations.has(target.publicPath),`Falta una de las localidades más próximas a ${town.name}: ${target.name}`);
 const provinceRoute='/'+town.publicPath.split('/').filter(Boolean)[0]+'/';
 assert.equal(docs.get(provinceRoute)?.type,'province',`Índice provincial inexistente: ${town.name}`);
 assert(html.includes(`href="${provinceRoute}"`),`Falta el enlace al índice provincial: ${town.name}`);
 if(!provinceLinks.has(provinceRoute)){
  const provinceHtml=fs.readFileSync(path.join(root,docs.get(provinceRoute).file),'utf8');
  const routes=new Set();
  for(const [,href] of provinceHtml.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)){
   const url=new URL(decodeHtml(href),DOMAIN+provinceRoute);
   if(url.origin===DOMAIN&&!url.hash&&!url.search)routes.add(url.pathname);
  }
  provinceLinks.set(provinceRoute,routes);
 }
 assert(provinceLinks.get(provinceRoute).has(town.publicPath),`La página no recibe enlace desde su índice provincial: ${town.name}`);
}
for(const town of towns)assert(contextualIncoming.get(town.publicPath).size>=1,`Página sin enlace entrante desde otra localidad: ${town.name}`);
for(const doc of manifest.documents){
 const html=fs.readFileSync(path.join(root,doc.file),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'IDs duplicados: '+doc.path);
 for(const match of html.matchAll(/\bdata-route="([^"]*)"/g)){
  const u=new URL(decodeHtml(match[1]),'https://antenaszalla.com');assert(docs.has(u.pathname));
  if(u.hash)assert(fs.readFileSync(path.join(root,fileForPublicPath(u.pathname)),'utf8').includes(`id="${u.hash.slice(1)}"`));
 }
}
console.log(`COBERTURA CONSOLIDADA OK: ${coverage.total} municipios, ${coverage.retained} páginas propias, ${coverage.redirected} agrupados, ${contextualLinkCount} enlaces contextuales, todas las páginas enlazadas desde otra localidad y su provincia, contador coherente, buscador completo y distancias verificadas.`);
