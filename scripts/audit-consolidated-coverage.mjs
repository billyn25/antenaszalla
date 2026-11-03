import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileForPublicPath,decodeHtml} from './public-seo.mjs';
import {distanceKm} from './municipal-coverage.mjs';
const root=path.resolve(process.env.PRODUCTION_ROOT||'dist');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const coverage=read('coverage-manifest.json'),manifest=read('public-seo-manifest.json'),towns=read('local-pages-manifest.json');
const geo=new Map(JSON.parse(fs.readFileSync('content/municipal-geography.json','utf8')).municipalities.map(t=>[t.code,t]));
const expected=Object.values(JSON.parse(fs.readFileSync('.cache/municipios-selected.json','utf8')).provinces).flat();
assert.equal(coverage.total,expected.length);assert.equal(coverage.assignments.length,expected.length);
assert.deepEqual(new Set(coverage.assignments.map(a=>a.code)),new Set(expected.map(t=>t.id)));
assert.equal(towns.length,coverage.retained);assert.equal(coverage.redirected,coverage.total-coverage.retained);
const retained=new Map(towns.map(t=>[t.publicPath,t]));
const redirects=new Map(manifest.redirects.map(r=>[r.from,r.to]));
const htmls=new Map(towns.map(t=>[t.publicPath,fs.readFileSync(path.join(root,t.path.slice(1)),'utf8')]));
for(const row of coverage.assignments){
 const hub=retained.get(row.destination);assert(hub,`Destino inexistente: ${row.name}`);
 assert.equal(row.province,hub.province);assert.ok(distanceKm(geo.get(row.code),hub)<=coverage.policy.maxDistanceKm);
 if(row.population>=coverage.policy.minimumPopulation||row.name==='Zalla')assert.equal(row.original,row.destination);
 if(row.original!==row.destination){
  assert(!fs.existsSync(path.join(root,row.originalFile.slice(1))),`HTML retirado sigue publicado: ${row.name}`);
  assert.equal(redirects.get(row.original),row.destination);
  assert(htmls.get(row.destination).includes(`id="cobertura-${row.code}">${row.name.replaceAll('&','&amp;')}`),`Pueblo no visible: ${row.name}`);
  assert.equal(row.url,row.destination+`#cobertura-${row.code}`);
 }
}
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const payload=JSON.parse(home.match(/<script[^>]*data-enquiry-towns[^>]*>([\s\S]*?)<\/script>/)?.[1]||'[]');
assert.equal(payload.length,coverage.total,'Buscador incompleto');
for(const row of coverage.assignments){
 const entry=payload.find(t=>t.name===row.name&&t.province===row.province);assert(entry,'Falta municipio en buscador: '+row.name);assert.equal(entry.route,row.url);
}
const docs=new Map(manifest.documents.map(d=>[d.path,d]));
for(const doc of manifest.documents){
 const html=fs.readFileSync(path.join(root,doc.file),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'IDs duplicados: '+doc.path);
 for(const match of html.matchAll(/\bdata-route="([^"]*)"/g)){
  const u=new URL(decodeHtml(match[1]),'https://antenaszalla.com');assert(docs.has(u.pathname));
  if(u.hash)assert(fs.readFileSync(path.join(root,fileForPublicPath(u.pathname)),'utf8').includes(`id="${u.hash.slice(1)}"`));
 }
}
console.log(`COBERTURA CONSOLIDADA OK: ${coverage.total} municipios, ${coverage.retained} páginas propias, ${coverage.redirected} agrupados, buscador completo y distancias verificadas.`);
