import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPage,pages} from '../scripts/build.mjs';
import {guides,enhanceTown,selectedGuidesForTown} from '../scripts/service-guides.mjs';
import {decodeHtml} from '../scripts/public-seo.mjs';
test('entrada por averías y dos servicios satelitales distintos, con foto y tarjeta clara',()=>{
 for(const page of [pages.find(p=>p.type==='home'),pages.find(p=>p.name==='Lerma')]){
  const h=renderPage(page);
  assert(h.includes('data-zalla-focus="averias-satelite-starlink-20261017-foto"'));
  assert(h.includes('class="hero-photo"'));
  assert(!h.includes('fault-selector'));
  assert(!h.includes('¿Sin señal? Antenas,'));
  for(const id of ['averias-tdt','averias-portero','averias-videoportero','soluciones-satelite']){
   assert(h.includes(`id="${id}"`));
  }
  assert(h.includes('data-guide-target="montaje-antenas-starlink"'));
  assert(h.includes('data-guide-target="tdt-por-satelite-hd"'));
  assert(h.includes('distribuidores autorizados'));
  assert(h.includes('no incluye automáticamente el suministro ni la cuota'));
 }
});
test('Starlink sigue en catálogo y tiene consulta local cuando resulta seleccionado',()=>{
 const base=pages.find(p=>p.type==='town');
 let p;
 for(let i=0;i<200;i++){
  const candidate={...base,name:`Pueblo Starlink ${i}`,province:'Burgos',path:`/Antenas-Burgos/pueblo-starlink-${i}.html`};
  if(selectedGuidesForTown(candidate).some(g=>g.id==='starlink')){p=candidate;break;}
 }
 assert(p,'Debe existir una combinación local que seleccione Starlink');
 const h=enhanceTown(renderPage(p),p);
 assert.equal(guides.length,10);
 assert(h.includes('/servicios/montaje-antenas-starlink/'));
 const card=h.match(/<article class="service-card" id="starlink"[^>]*>[\s\S]*?<\/article>/)?.[0];
 assert(card);
 const u=new URL(decodeHtml(card.match(/class="service-enquiry" href="([^"]+)"/)[1]));
 assert(u.searchParams.get('text').includes(`${p.name}, Burgos`));
 assert(u.searchParams.get('text').includes('starlink'));
});
