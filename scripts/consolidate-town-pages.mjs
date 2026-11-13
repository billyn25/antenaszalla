import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DOMAIN,publicPath,fileForPublicPath,escapeHtml as esc,decodeHtml} from './public-seo.mjs';
import {selectCoverage,policy,distanceKm,COVERAGE_CSS,COVERAGE_RELEASE,GETARIA_CANONICAL_PATH,GETARIA_ALIASES} from './municipal-coverage.mjs';
import {NEARBY_TOWN_LINKS_CSS} from './nearby-town-links.mjs';
import {displayPlaceName} from './seo-metadata.mjs';
const root=path.resolve(process.env.PRODUCTION_ROOT||'dist');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
if(fs.existsSync(path.join(root,'coverage-manifest.json')))throw new Error('La consolidación requiere un build completo sin consolidar.');
const all=read('local-pages-manifest.json');const manifest=read('public-seo-manifest.json');
const cache=JSON.parse(fs.readFileSync('.cache/municipios-selected.json','utf8'));
const geo=JSON.parse(fs.readFileSync('content/municipal-geography.json','utf8'));
const geography=new Map(geo.municipalities.map(t=>[t.code,t]));
const key=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const towns=all.map(t=>{
 const provinceRoute='/'+t.path.split('/').filter(Boolean)[0]+'/';
 const source=Object.entries(cache.provinces).find(([route])=>route.toLowerCase()===provinceRoute);
 const record=source?.[1].find(m=>key(m.name)===key(t.name));
 const g=geography.get(record?.id);if(!g)throw new Error('Falta geografía de '+t.name);
 return {...t,...g,name:t.name,province:t.province,protected:t.name==='Zalla',publicPath:t.publicPath||publicPath(t.path)};
});
const {retained,assignments}=selectCoverage(towns);
const selected=new Set(retained.map(t=>t.publicPath));
// Start with the five closest retained pages in each province. Add a link only
// where needed to give every retained locality an incoming contextual link.
const nearest=new Map(retained.map(town=>[town.code,retained
 .filter(t=>t.province===town.province&&t.code!==town.code)
 .sort((a,b)=>distanceKm(town,a)-distanceKm(town,b)||a.code.localeCompare(b.code))]));
const nearbyLinks=new Map(retained.map(t=>[t.code,nearest.get(t.code).slice(0,5)]));
const incoming=new Map(retained.map(t=>[t.code,0]));
for(const links of nearbyLinks.values())for(const town of links)incoming.set(town.code,incoming.get(town.code)+1);
for(const town of retained.filter(t=>incoming.get(t.code)===0)){
 const source=nearest.get(town.code).find(t=>nearbyLinks.get(t.code).length<6);
 if(!source)throw new Error('No se pudo enlazar la localidad desde otra página: '+town.name);
 nearbyLinks.get(source.code).push(town);
 incoming.set(town.code,1);
}
for(const town of retained)nearbyLinks.get(town.code).sort((a,b)=>distanceKm(town,a)-distanceKm(town,b)||a.code.localeCompare(b.code));
const byRoute=new Map(assignments.map(a=>[a.town.publicPath,a]));
const retired=assignments.filter(a=>a.town.code!==a.hub.code);
function destination(raw,current='/',anchor=true){
 let url;try{url=new URL(decodeHtml(raw),DOMAIN+current);}catch{return raw;}
 if(url.origin!==DOMAIN)return raw;
 let canonical;try{canonical=publicPath(url.pathname);}catch{return raw;}
 const row=byRoute.get(canonical);
 if(!row||row.town.code===row.hub.code)return raw;
 return row.hub.publicPath+(anchor?`#cobertura-${row.town.code}`:'');
}
function coverageSection(town){
 const members=assignments.filter(a=>a.hub.code===town.code&&a.town.code!==town.code).map(a=>a.town).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 if(!members.length)return '';
 const name=esc(displayPlaceName(town.name));
 return `<section class="section soft municipal-coverage" id="cobertura-cercana"><div class="wrap"><span class="eyebrow">Servicio en los alrededores</span><h2>Antenista en ${name} y localidades cercanas</h2><p class="section-lead">Esta página reúne las consultas de instalación y reparación de antenas TDT, parabólicas, amplificación, porteros y videoporteros en ${name} y estos municipios próximos.</p><ul class="municipal-coverage-list">${members.map(t=>`<li id="cobertura-${t.code}">${esc(displayPlaceName(t.name))}</li>`).join('')}</ul><p>Indica tu municipio y si el problema afecta a una sola toma, a toda la vivienda o a varios vecinos. Para un portero o videoportero, comenta si falla la llamada, el audio, la imagen o la apertura. El desplazamiento, la disponibilidad y las condiciones de atención se confirman al consultar.</p><a class="coverage-consult" href="#contacto">Preparar la consulta →</a></div></section>`;
}
function nearbyNavigation(town){
 const province=esc(displayPlaceName(town.province));
 const provinceRoute='/'+town.publicPath.split('/').filter(Boolean)[0]+'/';
 return `<nav class="other-towns" data-contextual-town-links aria-label="Otras localidades de ${province}">${nearbyLinks.get(town.code).map(t=>`<a href="${esc(t.publicPath)}">Antenista en ${esc(displayPlaceName(t.name))}</a>`).join('')}</nav><p class="nearby-province-link"><a href="${esc(provinceRoute)}">Ver todos los municipios de ${province} →</a></p>`;
}
function updateHomeCounts(html){
 const block=html.match(/<section\b[^>]*\bid="zalla-stats"[^>]*>[\s\S]*?<\/section>/)?.[0];
 if(!block)throw new Error('Falta el bloque de cifras de portada durante la consolidación');
 const localCounter=/<article><strong>[^<]+<\/strong><span>(?:Pueblos con página local|Localidades con página propia)<\/span><\/article>/;
 if(!localCounter.test(block))throw new Error('No se encontró el contador de páginas locales de portada');
 const provinces=new Set(towns.map(t=>t.province)).size;
 const updated=block
  .replace(localCounter,`<article><strong>${retained.length.toLocaleString('es-ES')}</strong><span>Localidades con página propia</span></article>`)
  .replace(/<p>[\s\S]*?<\/p>/,`<p>Consulta ${towns.length.toLocaleString('es-ES')} municipios de ${provinces} provincias. Las localidades con página propia reúnen también la atención a municipios cercanos.</p>`);
 return html.replace(block,()=>updated);
}
function updateHomeBasqueCoverage(html){
 const block=html.match(/<section\b[^>]*\bid="zonas"[^>]*>[\s\S]*?<\/section>/)?.[0];
 if(!block)throw new Error('Falta la sección de provincias de portada');
 const choices=[
  {name:'Bizkaia',route:'/antenas-bizkaia/',codes:['48096','48057','48086','48022']},
  {name:'Gipuzkoa',route:'/antenas-guipuzcoa/',codes:['20069','20039','20079','20081']},
  {name:'Álava',route:'/antenas-alava/',codes:['01059','01036','01002','01004']}
 ];
 const basqueRoutes=new Set(choices.map(p=>p.route));
 const others=manifest.documents.filter(d=>d.type==='province'&&!basqueRoutes.has(d.path));
 const region=`<div class="basque-coverage" id="pais-vasco" aria-labelledby="pais-vasco-title"><h3 id="pais-vasco-title">País Vasco: Bizkaia, Gipuzkoa y Álava</h3><p>Consulta la instalación o avería en tu municipio. Las fichas reúnen indicaciones para viviendas y comunidades, y los índices provinciales permiten encontrar el resto de localidades.</p><div class="featured-province-grid basque-coverage-grid">${choices.map(province=>`<article class="featured-province"><h4>${esc(province.name)}</h4><nav class="featured-towns" aria-label="Localidades destacadas de ${esc(province.name)}">${province.codes.map(code=>{
  const town=retained.find(t=>t.code===code);
  if(!town)throw new Error('Falta una ficha destacada del País Vasco: '+code);
  return `<a href="${esc(town.publicPath)}">${esc(displayPlaceName(town.name))}</a>`;
 }).join('')}</nav><a href="${province.route}">Ver todos los municipios de ${esc(province.name)} →</a></article>`).join('')}</div></div>`;
 const remaining=`<h3 class="other-provinces-title">Otras provincias</h3><div class="province-grid">${others.map(province=>{
  const name=towns.find(t=>t.publicPath.startsWith(province.path))?.province;
  if(!name)throw new Error('Provincia sin municipios: '+province.path);
  return `<a class="province-card" href="${esc(province.path)}"><strong>Antenista en ${esc(displayPlaceName(name))}</strong><span>Antenas · Porteros automáticos · Videoporteros</span><span class="arrow" aria-hidden="true">→</span></a>`;
 }).join('')}</div>`;
 return html.replace(block,()=>`<section class="section soft" id="zonas"><div class="wrap"><span class="eyebrow">Servicio por pueblos</span><h2>Encuentra un antenista en tu pueblo</h2><p class="section-lead">Elige tu provincia y localidad para consultar antenas TDT, parabólicas, porteros o videoporteros. Indica la dirección de la instalación para concretar disponibilidad, desplazamiento y condiciones de atención.</p>${region}${remaining}</div></section>`);
}
const docs=manifest.documents.filter(d=>d.type!=='town'||selected.has(d.path));
for(const doc of docs){
 const file=path.join(root,doc.file);let html=fs.readFileSync(file,'utf8');
 // Update links and the initial enquiry options without changing their municipality labels.
 html=html.replace(/\b(href|data-route)="([^"]*)"/g,(_,attr,value)=>`${attr}="${esc(destination(value,doc.path))}"`);
 html=html.replace(/(<script[^>]*data-enquiry-towns[^>]*>)([\s\S]*?)(<\/script>)/g,(_,open,raw,close)=>open+JSON.stringify(JSON.parse(raw).map(t=>({...t,route:destination(t.route,doc.path)}))).replace(/</g,'\\u003c')+close);
 const rewriteData=value=>typeof value==='string'?(/^(?:https?:\/\/|\/)/.test(value)?destination(value,doc.path,false):value):Array.isArray(value)?value.map(rewriteData):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewriteData(v)])):value;
 html=html.replace(/(<script[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,(_,open,raw,close)=>open+JSON.stringify(rewriteData(JSON.parse(raw))).replace(/</g,'\\u003c')+close);
 const town=retained.find(t=>t.publicPath===doc.path);
 if(town){
  const nav=nearbyNavigation(town);
  const existing=/<nav\b(?=[^>]*\bclass="[^"]*\bother-towns\b[^"]*")[^>]*>[\s\S]*?<\/nav>/;
  if(existing.test(html))html=html.replace(existing,()=>nav);
  else{
   const section=`<section class="section nearby-localities" id="localidades-relacionadas" aria-labelledby="localidades-relacionadas-title"><div class="wrap"><span class="eyebrow">Consulta por localidad</span><h2 id="localidades-relacionadas-title">Más localidades de ${esc(displayPlaceName(town.province))}</h2><p>Consulta otras localidades de la provincia, ordenadas por cercanía a ${esc(displayPlaceName(town.name))}.</p>${nav}</div></section>`;
   html=html.replace(/(<section\b[^>]*\bid="contacto"[^>]*>)/,opening=>section+opening);
  }
  if(!html.includes('data-contextual-town-links'))throw new Error('No se pudo insertar navegación local en '+town.name);
  html=html.replace(/(<section\b[^>]*\bid="contacto"[^>]*>)/,coverageSection(town)+'$1');
  if(assignments.some(a=>a.hub.code===town.code&&a.town.code!==town.code)&&!html.includes('id="cobertura-cercana"'))throw new Error('No se pudo insertar cobertura en '+town.name);
 }
 if(doc.path==='/')html=updateHomeBasqueCoverage(updateHomeCounts(html));
 fs.writeFileSync(file,html);
}
// Resolve every historical alias directly to the retained document, including .html aliases.
const redirects=new Map(manifest.redirects.map(r=>[r.from,destination(r.to,'/',false)]));
if(!selected.has(GETARIA_CANONICAL_PATH))throw new Error('La ficha recuperada de Getaria no está retenida');
for(const alias of GETARIA_ALIASES)redirects.set(alias,GETARIA_CANONICAL_PATH);
for(const a of retired)redirects.set(a.town.publicPath,a.hub.publicPath);
for(const a of retired)fs.rmSync(path.join(root,a.town.path.slice(1)));
manifest.documents=docs;manifest.towns=retained.length;manifest.coveredMunicipalities=towns.length;
manifest.redirects=[...redirects].map(([from,to])=>({from,to}));
fs.writeFileSync(path.join(root,'public-seo-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'local-pages-manifest.json'),JSON.stringify(retained,null,2)+'\n');
const newsTowns=retained.map(t=>({name:t.name,route:t.publicPath}));
const newsTownCounts=new Map();
const importantNewsTowns=retained.slice().sort((a,b)=>b.population-a.population||a.name.localeCompare(b.name,'es')).filter(t=>{
 const count=newsTownCounts.get(t.province)||0;
 if(count>=3&&t.name!=='Zalla')return false;
 if(t.name!=='Zalla')newsTownCounts.set(t.province,count+1);
 return true;
}).map(t=>({name:t.name,route:t.publicPath}));
fs.writeFileSync(path.join(root,'assets/news-towns.json'),JSON.stringify(importantNewsTowns)+'\n');
const newsPage=docs.find(doc=>doc.type==='blog');
if(newsPage){
 const file=path.join(root,newsPage.file);
 const initial=['Zalla','Aranda de Duero','Laredo'].map(name=>newsTowns.find(t=>t.name===name)).filter(Boolean);
 const links=[...new Set([...initial,...newsTowns])].slice(0,3)
   .map(t=>`<a href="${esc(t.route)}">Antenista en ${esc(t.name)}</a>`).join('');
 fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('<!-- NEWS_TOWNS -->',()=>links));
}
fs.writeFileSync(path.join(root,'_redirects'),'# Historical and consolidated municipalities: direct permanent destinations.\n'+[...redirects].map(([from,to])=>`${from} ${DOMAIN}${to} 301!`).join('\n')+'\nhttps://www.antenaszalla.com/* https://antenaszalla.com/:splat 301!\nhttp://www.antenaszalla.com/* https://antenaszalla.com/:splat 301!\nhttp://antenaszalla.com/* https://antenaszalla.com/:splat 301!\n');
const coverage={release:COVERAGE_RELEASE,policy,source:geo.source,edition:geo.edition,total:towns.length,retained:retained.length,redirected:retired.length,provinces:[...new Set(towns.map(t=>t.province))].map(province=>({province,total:towns.filter(t=>t.province===province).length,retained:retained.filter(t=>t.province===province).length})),assignments:assignments.map(({town,hub,distanceKm})=>({code:town.code,name:town.name,province:town.province,population:town.population,original:town.publicPath,originalFile:town.path,destination:hub.publicPath,hub:hub.name,url:hub.publicPath+(town.code===hub.code?'':`#cobertura-${town.code}`),distanceKm:Number(distanceKm.toFixed(3))}))};
fs.writeFileSync(path.join(root,'coverage-manifest.json'),JSON.stringify(coverage,null,2)+'\n');
fs.appendFileSync(path.join(root,'assets/site.css'),COVERAGE_CSS);
fs.appendFileSync(path.join(root,'assets/site.css'),NEARBY_TOWN_LINKS_CSS);
execFileSync(process.execPath,['scripts/prepare-production-assets.mjs'],{env:{...process.env,CONFIRM_PRODUCTION_PREP:'1',PRODUCTION_ROOT:root},stdio:'inherit'});
console.log(`CONSOLIDACIÓN OK: ${retained.length} páginas municipales, ${retired.length} municipios agrupados, ${towns.length} cubiertos.`);
