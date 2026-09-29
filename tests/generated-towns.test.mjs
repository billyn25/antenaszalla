import test from 'node:test';
import assert from 'node:assert/strict';
import { pages, site } from '../scripts/build.mjs';
import { buildTownPages, slugifyTown } from '../scripts/generate-town-pages.mjs';

test('genera una página SEO por cada localidad declarada en las provincias', () => {
  const provinces = pages.filter(p => p.type === 'province');
  const expected = provinces.reduce((sum, p) => sum + (p.towns || []).length, 0);
  const locals = buildTownPages();
  assert.equal(locals.length, expected);
  assert.equal(new Set(locals.map(p => p.path)).size, expected);
  assert.equal(new Set(locals.map(p => p.seoDescription)).size, expected);
});

test('conserva las rutas especiales ya existentes y genera el resto automáticamente', () => {
  const locals = buildTownPages();
  assert.ok(locals.some(p => p.path === '/Antenas-Bizkaia/bilbao.html' && !p.generated));
  assert.ok(locals.some(p => p.path === '/Antenas-Burgos/lerma.html' && !p.generated));
  const zalla = locals.find(p => p.name === 'Zalla');
  assert.equal(zalla.path, '/Antenas-Bizkaia/zalla.html');
  assert.equal(zalla.generated, true);
});

test('cada página generada lleva pueblo, provincia, teléfono y contenido diferenciado', () => {
  for (const p of buildTownPages()) {
    assert.ok(p.seoDescription.includes(p.name));
    assert.ok(p.seoDescription.includes(site.phone));
    assert.ok(p.lead || !p.generated);
    assert.ok(p.intro || !p.generated);
    assert.ok(p.focus || !p.generated);
    assert.ok(p.advice || !p.generated);
  }
});

test('slugifica nombres compuestos de forma estable', () => {
  assert.equal(slugifyTown('Agurain / Salvatierra'), 'agurain-salvatierra');
  assert.equal(slugifyTown('Alegría-Dulantzi'), 'alegria-dulantzi');
  assert.equal(slugifyTown('Oñati'), 'onati');
});
