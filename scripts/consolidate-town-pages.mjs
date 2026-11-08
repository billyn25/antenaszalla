import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DOMAIN,publicPath,fileForPublicPath,escapeHtml as esc,decodeHtml} from './public-seo.mjs';
import {selectCoverage,policy,distanceKm,COVERAGE_CSS,COVERAGE_RELEASE} from './municipal-coverage.mjs';
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
 return `<section class="section soft municipal-coverage" id="cobertura-cercana"><div class="wrap"><span class="eyebrow">Servicio en los alrededores</span><h2>Antenista en ${esc(town.name)} y localidades cercanas</h2><p class="section-lead">Esta página reúne las consultas de instalación y reparación de antenas TDT, parabólicas, amplificación, porteros y videoporteros en ${esc(town.name)} y estos municipios próximos.</p><ul class="municipal-coverage-list">${members.map(t=>`<li id="cobertura-${t.code}">${esc(t.name)}</li>`).join('')}</ul><p>Indica tu municipio y si el problema afecta a una sola toma, a toda la vivienda o a varios vecinos. Para un portero o videoportero, comenta si falla la llamada, el audio, la imagen o la apertura. El desplazamiento, la disponibilidad y las condiciones de atención se confirman al consultar.</p><a class="coverage-consult" href="#contacto">Preparar la consulta →</a></div></section>`;
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
  const near=retained.filter(t=>t.province===town.province&&t.code!==town.code).sort((a,b)=>distanceKm(town,a)-distanceKm(town,b)||a.code.localeCompare(b.code)).slice(0,8);
  html=html.replace(/<nav class="other-towns"[^>]*>[\s\S]*?<\/nav>/g,`<nav class="other-towns" aria-label="Municipios próximos con página propia">${near.map(t=>`<a href="${esc(t.publicPath)}">Antenista en ${esc(t.name)}</a>`).join('')}</nav>`);
  html=html.replace(/(<section\b[^>]*\bid="contacto"[^>]*>)/,coverageSection(town)+'$1');
  if(assignments.some(a=>a.hub.code===town.code&&a.town.code!==town.code)&&!html.includes('id="cobertura-cercana"'))throw new Error('No se pudo insertar cobertura en '+town.name);
 }
 fs.writeFileSync(file,html);
}
// Resolve every historical alias directly to the retained document, including .html aliases.
const redirects=new Map(manifest.redirects.map(r=>[r.from,destination(r.to,'/',false)]));
for(const a of retired)redirects.set(a.town.publicPath,a.hub.publicPath);
for(const a of retired)fs.rmSync(path.join(root,a.town.path.slice(1)));
manifest.documents=docs;manifest.towns=retained.length;manifest.coveredMunicipalities=towns.length;
manifest.redirects=[...redirects].map(([from,to])=>({from,to}));
fs.writeFileSync(path.join(root,'public-seo-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'local-pages-manifest.json'),JSON.stringify(retained,null,2)+'\n');
const newsTowns=retained.map(t=>({name:t.name,route:t.publicPath}));
fs.writeFileSync(path.join(root,'assets/news-towns.json'),JSON.stringify(newsTowns)+'\n');
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
execFileSync(process.execPath,['scripts/prepare-production-assets.mjs'],{env:{...process.env,CONFIRM_PRODUCTION_PREP:'1',PRODUCTION_ROOT:root},stdio:'inherit'});
console.log(`CONSOLIDACIÓN OK: ${retained.length} páginas municipales, ${retired.length} municipios agrupados, ${towns.length} cubiertos.`);
