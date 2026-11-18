import test from 'node:test';
import assert from 'node:assert/strict';
import { priorities, editorialSection } from '../scripts/local-technical-editorial.mjs';
test('priority local pages have distinct, technical, non-promotional content', () => {
  assert.equal(priorities.length, 6);
  assert.equal(new Set(priorities.map(p => p.name)).size, 6);
  assert.equal(new Set(priorities.map(p => p.title)).size, 6);
  for (const p of priorities) {
    const html = editorialSection(p);
    assert.match(html, /comprobaciones-tdt-locales/);
    assert.match(html, /mantenimiento-antenas-comunidades/);
    assert.match(html, /la-septima-tdt-uhd/);
    assert.equal((html.match(/<li>/g) || []).length, 3);
    assert.doesNotMatch(html, /trabajo realizado|instalamos en|reseñas|opiniones de clientes/i);
  }
});
