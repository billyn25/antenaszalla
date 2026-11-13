import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DOMAIN, PHONE, TEL, publicPath, fileForPublicPath, rewriteUrl, rewriteStructuredData, townMetadata, escapeHtml, decodeHtml, redirectRules, titleOf, metaOf } from '../scripts/public-seo.mjs';
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
  const data={'@id':DOMAIN+'/Antenas-Leon/pueblo.html#page',items:[{item:DOMAIN+'/Antenas-Leon/'}],name:'Antenas Zalla'};
  const result=rewriteStructuredData(data);
  assert.equal(result['@id'],DOMAIN+'/antenas-leon/pueblo#page');
  assert.equal(result.items[0].item,DOMAIN+'/antenas-leon/');
  assert.equal(result.name,data.name);
  assert.notDeepEqual(data,result);
});
test('long municipalities keep their full names and contact without forcing a phone into the title',()=>{
  const town={name:'Montejo de la Vega de la Serrezuela',province:'Segovia'};
  const meta=townMetadata(town);
  for(const value of Object.values(meta)) assert.ok(value.includes(town.name));
  assert.ok(meta.description.includes(PHONE));
  assert.ok(meta.title.length<=65);
  const ambiguous=townMetadata({...town,disambiguate:true});
  for(const value of Object.values(ambiguous)) assert.ok(value.includes(town.province));
});
test('schema removes invalid Service.telephone while retaining the real provider and contact details',()=>{
  const data={'@graph':[
    {'@type':['Service'],telephone:TEL,provider:{'@type':'Organization','@id':DOMAIN+'/#organizacion',name:'Antenas Zallatel',telephone:TEL},hasOfferCatalog:{itemListElement:[{itemOffered:{'@type':'Service',telephone:TEL,name:'Antenas TDT'}}]}},
    {'@type':'Organization','@id':'https://fabricante.example/#organization',name:'Fabricante',telephone:'+34900000000'},
    {'@type':'ContactPoint',telephone:TEL}
  ]};
  const original=JSON.stringify(data), result=rewriteStructuredData(data);
  const service=result['@graph'][0], provider=service.provider;
  assert.ok(!Object.hasOwn(service,'telephone'));
  assert.ok(!Object.hasOwn(service.hasOfferCatalog.itemListElement[0].itemOffered,'telephone'));
  assert.equal(provider.telephone,TEL);
  assert.equal(provider.name,'Antenas Zalla');
  assert.equal(provider.logo.url,DOMAIN+'/assets/logo-antenas-zalla.svg');
  assert.equal(provider.address.streetAddress,'Barrio El Baular s/n, C. Eroski');
  assert.equal(provider.address.addressLocality,'Zalla');
  assert.equal(provider.address.postalCode,'48860');
  assert.equal(result['@graph'][1].name,'Fabricante');
  assert.equal(result['@graph'][1].telephone,'+34900000000');
  assert.equal(result['@graph'][2].telephone,TEL);
  assert.equal(JSON.stringify(data),original,'No debe mutar el esquema de entrada');
});
test('HTML escaping is reversible and safe for attributes',()=>{
  const value=`a&b"c'd<e>`;
  assert.equal(decodeHtml(escapeHtml(value)),value);
});

function fixture(t,{homonyms=false}={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zalla-public-seo-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const towns=[
    {path:'/Antenas-Segovia/castro-de-fuentiduena.html',name:'Castro de Fuentidueña',province:'Segovia'},
    {path:'/Antenas-Burgos/aranda_duero.html',name:'Aranda de Duero',province:'Burgos'},
    {path:'/Antenas-Bizkaia/abanto-y-ciervana-abanto-zierbena.html',name:'Abanto y Ciérvana-Abanto Zierbena',province:'Bizkaia'}
  ];
  if(homonyms) towns.push(
    {path:'/Antenas-Segovia/villa-comun.html',name:'Villa Común',province:'Segovia'},
    {path:'/Antenas-Burgos/villa-comun.html',name:'Villa Común',province:'Burgos'}
  );
  const put=(file,text)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),text);};
  const html=(route,title,body)=>`<!doctype html><html lang="es"><head><title>${title}</title><meta name="description" content="Descripción inicial"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${DOMAIN+route}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'WebSite','name':'Antenas Zalla',url:DOMAIN+'/'},{'@type':'WebPage',url:DOMAIN+route,name:title,description:'Descripción inicial'}]})}</script></head><body><h1>${title}</h1><a href="/">Inicio</a><a href="https://wa.me/34670042626?x=1&amp;y=2">WhatsApp</a><section id="servicios">TDT y porteros</section>${body}</body></html>`;
  const provinces=['Segovia','Burgos','Bizkaia'];
  put('index.html',html('/','Antenas Zalla',provinces.map(p=>`<a href="/Antenas-${p}/">${p}</a>`).join('')));
  for(const province of provinces) put(`Antenas-${province}/index.html`,html(`/Antenas-${province}/`,province,towns.filter(town=>town.province===province).map(town=>`<a href="${town.path}#servicios">${town.name}</a>`).join('')));
  for(const town of towns) put(town.path.slice(1),html(town.path,`Antenista en ${town.name}, ${town.province}`,'<a href="#servicios">Servicios</a>'));
  put('Antenas-Bizkaia/abanto-zierbena.html',html('/Antenas-Bizkaia/abanto-zierbena.html','Abanto-Zierbena',''));
  put('local-pages-manifest.json',JSON.stringify(towns));
  put('assets/site.css','/* approved design */');
  put('assets/hero-zallatel.png',Buffer.from('fixture image'));
  return {root,towns,put,html};
}
function makeIndexable(root,result) {
  for(const doc of result.documents) {
    if(!doc.indexable) continue;
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
  assert.equal((html.match(/<h1\b/gi)||[]).length,1);
  assert.equal(metaOf(html,'og:title'),titleOf(html));
  assert.equal(metaOf(html,'twitter:title'),titleOf(html));
  assert.equal(metaOf(html,'og:description'),metaOf(html,'description'));
  makeIndexable(root,result);
  const report=auditPublicSeo(root);
  assert.equal(report.municipalities,3);
  assert.equal(report.orphans,0);
});

test('legal documents remain noindex while allowing their internal links to be followed',t=>{
  const {root,put,html}=fixture(t);
  put('privacidad.html',html('/privacidad.html','Privacidad | Antenas Zalla',''));
  const result=finalizePublicSeo(root);
  const doc=result.documents.find(d=>d.path==='/privacidad');
  assert.equal(doc.indexable,false);
  const output=fs.readFileSync(path.join(root,doc.file),'utf8');
  assert.equal(metaOf(output,'robots'),'noindex,follow');
  assert.ok(output.includes(`rel="canonical" href="${DOMAIN}/privacidad"`));
});

test('finalization disambiguates homonymous towns without changing their routes',t=>{
  const {root}=fixture(t,{homonyms:true});
  const result=finalizePublicSeo(root);
  const titleSet=new Set(),descriptionSet=new Set();
  for(const province of ['Segovia','Burgos']) {
    const route=`/antenas-${province.toLowerCase()}/villa-comun`;
    const doc=result.documents.find(d=>d.path===route);
    const html=fs.readFileSync(path.join(root,doc.file),'utf8');
    const title=titleOf(html),description=metaOf(html,'description');
    assert.ok(title.includes('Villa Común'));
    assert.ok(title.includes(province));
    assert.ok(description.includes(province));
    assert.ok(description.includes(PHONE));
    titleSet.add(title);descriptionSet.add(description);
  }
  assert.equal(titleSet.size,2);
  assert.equal(descriptionSet.size,2);
  makeIndexable(root,result);
  assert.equal(auditPublicSeo(root).municipalities,5);
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
