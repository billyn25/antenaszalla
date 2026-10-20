import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPage,pages} from '../scripts/build.mjs';
import {enhanceTown,guides,guideRoute,selectedGuidesForTown} from '../scripts/service-guides.mjs';
import {publicPath,decodeHtml} from '../scripts/public-seo.mjs';
test('service routes normalize index aliases without changing municipality URLs',()=>{
  assert.equal(publicPath('/servicios/porteros-automaticos/index.html'),'/servicios/porteros-automaticos/');
  assert.equal(publicPath('/servicios/index.html'),'/servicios/');
  assert.equal(publicPath('/Antenas-Bizkaia/zalla.html'),'/antenas-bizkaia/zalla');
});
test('local service expansion keeps URLs and contact while making the enquiry specific',()=>{
  const p={...pages.find(p=>p.type==='town'),name:'Pueblo & Valle',province:'Álava',path:'/Antenas-Alava/pueblo-valle.html'};
  const before=renderPage(p),html=enhanceTown(before,p);
  assert.equal(enhanceTown(html,p),html,'Repeated enrichment must not duplicate cards or catalogues');
  assert.equal(html.match(/rel="canonical" href="[^"]+"/)[0],before.match(/rel="canonical" href="[^"]+"/)[0]);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  const selected=selectedGuidesForTown(p);
  assert.equal((html.match(/data-service-guide=/g)||[]).length,4);
  assert.equal((html.match(/class="town-service-detail"/g)||[]).length,4);
  for(const g of guides) assert(html.includes(`href="${guideRoute(g)}"`));
  for(const g of selected) assert(ids.includes(g.id));
  for(const g of guides.filter(g=>!selected.some(s=>s.id===g.id))) assert(!ids.includes(g.id));
  for(const [,raw] of html.matchAll(/class="service-enquiry" href="([^"]+)"/g)) {
    const url=new URL(decodeHtml(raw));assert.equal(url.pathname,'/34670042626');
    assert(url.searchParams.get('text').includes('Pueblo & Valle, Álava'));
  }
  assert(html.includes('Pueblo &amp; Valle'));
  assert(!html.includes('aggregateRating'));
});
