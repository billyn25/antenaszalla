import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { brandMark, brandLogoSvg } from '../scripts/logo.mjs';
import { renderPage, pages } from '../scripts/build.mjs';
const site=JSON.parse(fs.readFileSync(new URL('../config/site.json',import.meta.url),'utf8'));
test('marca comercial Zalla completa; dominio y contactos conservados',()=>{
  assert.equal(site.brand,'Antenas Zalla');
  assert.equal(site.domain,'https://antenaszalla.com');
  assert.equal(site.phone,'670 042 626');
  assert.equal(site.tel,'+34670042626');
  assert.equal(site.whatsapp,'34670042626');
  assert.match(brandMark(),/<b>ZALLA<\/b>/);
  assert.match(brandMark(),/aria-label="Antenas Zalla"/);
  assert.ok(!brandMark().includes('<b>ZALLATEL</b>'));
  assert.match(brandLogoSvg(),/aria-label="Antenas Zalla"/);
  assert.match(brandLogoSvg(),/>ZALLA<\/text>/);
  assert.ok(renderPage(pages.find(p=>p.type==='home')).includes('Trato directo con el técnico profesional.'));
});
