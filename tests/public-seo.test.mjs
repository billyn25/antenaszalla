import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DOMAIN, publicPath, fileForPublicPath, rewriteUrl, rewriteStructuredData, townMetadata, escapeHtml, decodeHtml, redirectRules } from '../scripts/public-seo.mjs';
import { finalizePublicSeo } from '../scripts/finalize-public-seo.mjs';
import { auditPublicSeo } from '../scripts/audit-public-seo.mjs';

for (const [before,after] of [
  ['/Antenas-Segovia/castro-de-fuentiduena.html','/antenas-segovia/castro-de-fuentiduena'],
  ['/Antenas-Leon/fuentes-de-carbajal.html','/antenas-leon/fuentes-de-carbajal'],
  ['/Antenas-Palencia/poblacion-de-cerrato.html','/antenas-palencia/poblacion-de-cerrato'],
  ['/Antenas-Segovia/index.html','/antenas-segovia/'],
  ['/Antenas-Segovia/','/antenas-segovia/'],
  ['/Antenas-Burgos/aranda-de-duero.html','/antenas-burgos/aranda_duero'],
  ['/Antenas-Bizkaia/abanto-zierbena.html','/antenas-bizkaia/abanto-y-ciervana-abanto-zierbena'],
  ['/index.htm','/'], ['/index.html','/'], ['/cookies.html','/cookies']
]) test(`public URL: ${before}`,()=>assert.equal(publicPath(before),after));

test('rejects unsafe paths and does not lowercase asset filenames',()=>{
  for(const value of ['//external.test/x','../file','/a/../x','/x?y','/x#y','/x\\y']) assert.throws(()=>publicPath(value));
  assert.equal(publicPath('/assets/Photo.PNG'),'/assets/Photo.PNG');
});
test('flat HTML and provincial indexes have deterministic storage paths',()=>{
  assert.equal(fileForPublicPath('/antenas-segovia/pueblo'),'antenas-segovia/pueblo.html');
  assert.equal(fileForPublicPath('/antenas-segovia/'),'antenas-segovia/index.html');
  assert.equal(fileForPublicPath('/'),'index.html');
  assert.throws(()=>fileForPublicPath('/Antenas-Segovia/pueblo.html'));
});
test('preserves queries and fragments while removing domain and path aliases',()=>{
  assert.equal(rewriteUrl('http://www.antenaszalla.com/Antenas-Leon/pueblo.html?utm_source=x#servicios'),DOMAIN+'/antenas-leon/pueblo?utm_source=x#servicios');
  assert.equal(rewriteUrl('/Antenas-Leon/pueblo.html?x=1&y=2#servicios'),'/antenas-leon/pueblo?x=1&y=2#servicios');
  assert.equal(rewriteUrl('#servicios'),'#servicios');
});
test('does not change phone, WhatsApp, external sources, or assets',()=>{
  for(const value of ['tel:+34670042626','https://wa.me/34670042626?text=a&x=1','https://example.org/Antenas-X/a.html','/assets/site.css?v=x','mailto:test@example.org']) assert.equal(rewriteUrl(value),value);
});
test('rewrites nested schema URLs and IDs without changing text',()=>{
  const data={'@id':DOMAIN+'/Antenas-Leon/pueblo.html#page',items:[{item:DOMAIN+'/Antenas-Leon/'}],name:'Antenas Zallatel'};
  const result=rewriteStructuredData(data);
  assert.equal(result['@id'],DOMAIN+'/antenas-leon/pueblo#page');
  assert.equal(result.items[0].item,DOMAIN+'/antenas-leon/');
  assert.equal(result.name,data.name);
  assert.notDeepEqual(data,result);
});
test('long municipality titles never lose the phone or provincial disambiguation',()=>{
  const town={name:'Montejo de la Vega de la Serrezuela',province:'Segovia'};
  const meta=townMetadata(town);
  for(const value of Object.values(meta)) for(const part of [town.name,town.province,'670 042 626']) assert.ok(value.includes(part));
});
test('HTML escaping is reversible and safe for attributes',()=>{
  const value=`a&b"c'd<e>`;
  assert.equal(decodeHtml(escapeHtml(value)),value);
});

function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zalla-public-seo-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const towns=[
    {path:'/Antenas-Segovia/castro-de-fuentiduena.html',name:'Castro de Fuentidueña',province:'Segovia'},
    {path:'/Antenas-Burgos/aranda_duero.html',name:'Aranda de Duero',province:'Burgos'},
    {path:'/Antenas-Bizkaia/abanto-y-ciervana-abanto-zierbena.html',name:'Abanto y Ciérvana-Abanto Zierbena',province:'Bizkaia'}
  ];
  const put=(file,text)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),text);};
  const html=(route,title,body)=>`<!doctype html><html lang="es"><head><title>${title}</title><meta name="description" content="Descripción inicial"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${DOMAIN+route}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'WebSite','name':'Antenas Zallatel',url:DOMAIN+'/'},{'@type':'WebPage',url:DOMAIN+route,name:title,description:'Descripción inicial'}]})}</script></head><body><h1>${title}</h1><a href="/">Inicio</a><a href="https://wa.me/34670042626?x=1&amp;y=2">WhatsApp</a><section id="servicios">TDT y porteros</section>${body}</body></html>`;
  const provinces=['Segovia','Burgos','Bizkaia'];
  put('index.html',html('/','Antenas Zallatel',provinces.map(p=>`<a href="/Antenas-${p}/">${p}</a>`).join('')));
  for(const province of provinces) put(`Antenas-${province}/index.html`,html(`/Antenas-${province}/`,province,towns.filter(town=>town.province===province).map(town=>`<a href="${town.path}#servicios">${town.name}</a>`).join('')));
  for(const town of towns) put(town.path.slice(1),html(town.path,`Antenista en ${town.name}, ${town.province}`,'<a href="#servicios">Servicios</a>'));
  put('Antenas-Bizkaia/abanto-zierbena.html',html('/Antenas-Bizkaia/abanto-zierbena.html','Abanto-Zierbena',''));
  put('local-pages-manifest.json',JSON.stringify(towns));
  put('assets/site.css','/* approved design */');
  put('assets/hero-zallatel.png',Buffer.from('fixture image'));
  return {root,towns,put};
}
function makeIndexable(root,result) {
  for(const doc of result.documents) {
    const file=path.join(root,doc.file);
    fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('noindex,nofollow','index,follow'));
  }
  fs.mkdirSync(path.join(root,'sitemaps'),{recursive:true});
  fs.writeFileSync(path.join(root,'sitemap.xml'),`<sitemapindex><sitemap><loc>${DOMAIN}/sitemaps/sitemap-core.xml</loc></sitemap></sitemapindex>`);
  fs.writeFileSync(path.join(root,'sitemaps/sitemap-core.xml'),`<urlset>${result.documents.filter(d=>d.indexable).map(d=>`<url><loc>${DOMAIN+d.path}</loc></url>`).join('')}</urlset>`);
}

test('finalization fixes HTML, schema and legacy aliases without opening preview indexing',t=>{
  const {root}=fixture(t);
  const result=finalizePublicSeo(root);
  assert.equal(result.documents.length,7);
  assert.equal(result.redirects.get('/Antenas-Bizkaia/abanto-zierbena.html'),'/antenas-bizkaia/abanto-y-ciervana-abanto-zierbena');
  assert.ok(!fs.existsSync(path.join(root,'Antenas-Bizkaia/abanto-zierbena.html')));
  const html=fs.readFileSync(path.join(root,'antenas-segovia/castro-de-fuentiduena.html'),'utf8');
  assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
  assert.ok(html.includes(`rel="canonical" href="${DOMAIN}/antenas-segovia/castro-de-fuentiduena"`));
  assert.ok(html.includes('https://wa.me/34670042626?x=1&amp;y=2'));
  assert.ok(!html.includes('&amp;amp;'));
  assert.equal(fs.readFileSync(path.join(root,'assets/site.css'),'utf8'),'/* approved design */');
  assert.ok(fs.existsSync(path.join(root,'favicon.svg')));
  makeIndexable(root,result);
  const report=auditPublicSeo(root);
  assert.equal(report.municipalities,3);
  assert.equal(report.orphans,0);
});

test('repeated finalization preserves historical redirects and HTML',t=>{
  const {root}=fixture(t);
  const first=finalizePublicSeo(root);
  const before=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const second=finalizePublicSeo(root);
  assert.deepEqual([...first.redirects].sort(),[...second.redirects].sort());
  assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),before);
});

test('public audit fails on a canonical pointing back to a redirect',t=>{
  const {root}=fixture(t);
  const result=finalizePublicSeo(root);
  makeIndexable(root,result);
  const file=path.join(root,'antenas-segovia/castro-de-fuentiduena.html');
  fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(`rel="canonical" href="${DOMAIN}/antenas-segovia/castro-de-fuentiduena"`,`rel="canonical" href="${DOMAIN}/Antenas-Segovia/castro-de-fuentiduena.html"`));
  assert.throws(()=>auditPublicSeo(root),/canonical is not self-referencing/);
});

test('public audit fails on broken internal links',t=>{
  const {root}=fixture(t);
  const result=finalizePublicSeo(root);
  makeIndexable(root,result);
  const file=path.join(root,'index.html');
  fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('</body>','<a href="/missing-page">Missing</a></body>'));
  assert.throws(()=>auditPublicSeo(root),/missing href resource/);
});
