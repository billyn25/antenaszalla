import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPage,pages} from '../scripts/build.mjs';
import {guides,enhanceTown} from '../scripts/service-guides.mjs';
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
test('Starlink está en catálogo local, consulta con localidad y guía específica',()=>{
 const p={...pages.find(p=>p.type==='town'),name:'Pueblo & Valle',province:'Burgos'};
 const h=enhanceTown(renderPage(p),p);
 assert.equal(guides.length,10);
 const card=h.match(/<article class="service-card" id="starlink"[^>]*>[\s\S]*?<\/article>/)?.[0];
 assert(card);
 const u=new URL(decodeHtml(card.match(/class="service-enquiry" href="([^"]+)"/)[1]));
 assert(u.searchParams.get('text').includes('Pueblo & Valle, Burgos'));
 assert(u.searchParams.get('text').includes('starlink'));
 assert(card.includes('/servicios/montaje-antenas-starlink/'));
});
