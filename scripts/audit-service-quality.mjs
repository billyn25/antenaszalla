import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {guides,guideRoute,SERVICE_RELEASE,selectedGuidesForTown} from './service-guides.mjs';
import {DOMAIN,fileForPublicPath,decodeHtml,publicPath} from './public-seo.mjs';
const root=path.resolve(process.env.PRODUCTION_ROOT||'dist');
const towns=JSON.parse(fs.readFileSync(path.join(root,'local-pages-manifest.json'),'utf8'));
const read=route=>fs.readFileSync(path.join(root,fileForPublicPath(route)),'utf8');
let enquiries=0,links=0;
for(const town of towns) {
  const html=read(town.publicPath);
  assert(html.includes(`data-service-release="${SERVICE_RELEASE}"`),town.name+': versión');
  const selected=selectedGuidesForTown(town);
  assert.equal((html.match(/data-service-guide=/g)||[]).length,4,town.name+': fichas');
  assert.equal((html.match(/class="town-service-detail"/g)||[]).length,4,town.name+': diagnóstico');
  assert(html.includes('id="preparar-visita-local"'),town.name+': condiciones');
  assert(html.includes('id="servicios-en-tu-pueblo"'),town.name+': navegación');
  for(const id of ['averias-tdt','averias-portero','averias-videoportero','soluciones-satelite']) assert(html.includes('id="'+id+'"'),town.name+': orientación por avería');
  assert(html.includes('/servicios/montaje-antenas-starlink/'),town.name+': Starlink');
  for(const g of guides) {
    assert(html.includes(`href="${guideRoute(g)}"`),town.name+': guía '+g.id); links++;
  }
  for(const g of selected) {
    const card=html.match(new RegExp(`<article class="service-card" id="${g.id}"[^>]*>[\\s\\S]*?<\\/article>`))?.[0];
    assert(card,town.name+': servicio seleccionado '+g.id);
    const href=decodeHtml(card.match(/class="service-enquiry" href="([^"]+)"/)?.[1]||'');
    const url=new URL(href);
    assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/34670042626');
    const message=url.searchParams.get('text');
    assert(message.includes(`${town.name}, ${town.province}`),town.name+': contexto del aviso');
    assert(message.includes(g.label.toLowerCase()),town.name+': servicio del aviso');enquiries++;
  }
  let catalog=false;
  for(const [,raw] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const d=JSON.parse(raw);
    for(const entity of d['@graph']||[d]) if(entity['@type']==='Service' && entity.hasOfferCatalog) {
      assert.equal(entity.hasOfferCatalog.itemListElement.length,guides.length);catalog=true;
      assert(!entity.address,'No se crea una oficina para el municipio');
    }
  }
  assert(catalog,town.name+': catálogo estructurado');
}
const stripText=html=>decodeHtml(String(html).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim().toLowerCase();
const shingles=(text,size=5)=>{const words=text.split(/\s+/).filter(Boolean);const set=new Set();for(let i=0;i<=words.length-size;i++)set.add(words.slice(i,i+size).join(' '));return set;};
const jaccard=(a,b)=>{let common=0;for(const x of a)if(b.has(x))common++;const union=a.size+b.size-common;return union?common/union:0;};
const sampleSize=Math.min(160,towns.length);
const sample=Array.from({length:sampleSize},(_,i)=>towns[Math.floor(i*(towns.length-1)/(sampleSize-1))]).map(town=>{
  let normalized=stripText(read(town.publicPath));
  for(const value of [town.name,town.province,PHONE].filter(Boolean)) normalized=normalized.replaceAll(String(value).toLowerCase(),'{local}');
  normalized=normalized.replace(/\b\d+[a-z]?\b/gi,'#');
  return {path:town.publicPath,set:shingles(normalized)};
});
let highestSimilarity={score:0,a:'',b:''};
for(let i=0;i<sample.length;i++)for(let j=i+1;j<sample.length;j++){
  const score=jaccard(sample[i].set,sample[j].set);
  if(score>highestSimilarity.score)highestSimilarity={score,a:sample[i].path,b:sample[j].path};
}

for(const g of guides) {
  const html=read(guideRoute(g));
  assert(html.includes(`data-service-release="${SERVICE_RELEASE}"`));
  assert(html.includes(g.name));assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.equal((html.match(/<details>/g)||[]).length,3);
  assert(html.includes('id="presupuesto"'));
  assert(html.includes(`href="${DOMAIN+guideRoute(g)}"`));
  for(const [label,url] of g.sources) {assert.equal(new URL(url).protocol,'https:');assert(html.includes(label));}
}
const report={towns:towns.length,fullServiceCardsPerTown:4,availableGuideLinksPerTown:guides.length,contextualEnquiries:enquiries,guideLinksFromTowns:links,guides:guides.length,index:'/servicios/',finalSampleMaxSimilarity:+highestSimilarity.score.toFixed(3),similarityPair:[highestSimilarity.a,highestSimilarity.b],release:SERVICE_RELEASE};
console.log('CALIDAD DE SERVICIOS OK: '+JSON.stringify(report));
