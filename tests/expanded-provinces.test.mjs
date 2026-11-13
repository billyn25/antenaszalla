import test from 'node:test';
import assert from 'node:assert/strict';
import { pages, site, renderPage } from '../scripts/build.mjs';
import { buildTownPages } from '../scripts/generate-town-pages.mjs';
import { localMetadata } from '../scripts/identity.mjs';
import { displayPlaceName } from '../scripts/seo-metadata.mjs';
import { titleOf, metaOf } from '../scripts/public-seo.mjs';
const requested = [['Palencia','/Antenas-Palencia/'],['Valladolid','/Antenas-Valladolid/'],['León','/Antenas-Leon/'],['Segovia','/Antenas-Segovia/']];
test('once provincias activas, incluidas Palencia, Valladolid, León y Segovia',()=>{
  const provinces=pages.filter(p=>p.type==='province');
  assert.equal(provinces.length,11);
  const home=renderPage(pages.find(p=>p.type==='home'));
  for(const [name,route] of requested){
    const p=provinces.find(p=>p.path===route);
    assert.equal(p?.name,name);
    assert.equal(p.towns.length,8);
    assert.ok(home.includes(`href="${route}"`));
  }
  assert.ok(home.includes('Atención por pueblos · 11 provincias'));
  assert.equal(site.brand,'Antenas Zalla');
  assert.equal(site.domain,'https://antenaszalla.com');
  assert.equal(site.phone,'670 042 626');
});
test('nuevas localidades usan los mismos servicios y contactos, incluida TDT por satélite HD',()=>{
  const routes=new Set(requested.map(p=>p[1]));
  const towns=buildTownPages().filter(p=>routes.has(p.parent));
  assert.equal(towns.length,32);
  for(const p of towns){
    const html=renderPage(p);
    for(const id of ["tdt", "porteros", "videoporteros", "parabolicas", "tdt-satelite", "amplificacion", "cobertura-movil-servicio", "tomas", "mantenimiento"]){
      assert.ok(html.includes(`id="${id}"`),`${p.path}: servicio ${id}`);
    }
    assert.ok(html.includes('TDT por satélite HD'));
    assert.ok(html.includes(`tel:${site.tel}`));
    assert.ok(html.includes(`https://wa.me/${site.whatsapp}`));
    const metadata=localMetadata(p,site);
    assert.ok(metadata.title.includes(displayPlaceName(p.name)),p.path);
    assert.ok(metadata.description.includes(displayPlaceName(p.name)),p.path);
    assert.ok(metadata.description.includes(site.phone),p.path);
    assert.equal(titleOf(html),metadata.title,p.path);
    assert.equal(metaOf(html,'description'),metadata.description,p.path);
    assert.equal((html.match(/<h1\b/gi)||[]).length,1,p.path);
  }
});
