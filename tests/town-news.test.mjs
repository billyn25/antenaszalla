import test from 'node:test';
import assert from 'node:assert/strict';
import { selectTownNews, insertTownNews } from '../netlify/edge-functions/town-news.mjs';
const blog = '<li><article><h3><a href="https://www.mundoplus.tv/tv-digital/a/">Canal A</a></h3><time datetime="2026-11-18T10:00:00Z">18 noviembre</time><p class="news-source">Fuente: Mundoplus</p></article></li>'.repeat(1) +
  '<li><article><h3><a href="https://www.mundoplus.tv/tv-digital/b/">Canal B</a></h3><time datetime="2026-11-19T10:00:00Z">19 noviembre</time><p class="news-source">Fuente: Mundoplus</p></article></li>';
test('municipal news selection is stable and adds only existing source headlines', () => {
  const a = selectTownNews(blog, '/antenas-bizkaia/zalla');
  assert.deepEqual(a, selectTownNews(blog, '/antenas-bizkaia/zalla'));
  assert.equal(a.length, 2);
  const original = '<html><main><h1>Antenista en Zalla</h1></main></html>';
  const updated = insertTownNews(original, '/antenas-bizkaia/zalla', a);
  assert.match(updated, /Antenista en Zalla/);
  assert.match(updated, /actualidad-television-local/);
  assert.match(updated, /Son novedades generales/);
  assert.equal(insertTownNews(updated, '/antenas-bizkaia/zalla', a), updated);
  assert.equal(insertTownNews(original, '/antenas-bizkaia/otra-localidad', a), original);
});
