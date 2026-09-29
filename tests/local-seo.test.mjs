import test from 'node:test';
import assert from 'node:assert/strict';
import { pages, site, renderPage } from '../scripts/build.mjs';
import { localMetadata } from '../scripts/identity.mjs';

test('portada de marca: sin Bizkaia en título, H1, descripción o encabezados', () => {
 const p = pages.find(p => p.type === 'home'), h = renderPage(p), m = localMetadata(p, site);
 assert.ok(!/Bizkaia/i.test([m.title,m.heading,m.description].join(' ')));
 for (const match of h.matchAll(/<h[12]\b[^>]*>(.*?)<\/h[12]>/g)) assert.ok(!/Bizkaia/.test(match[1]));
 assert.ok(h.includes('href="/Antenas-Bizkaia/"'));
});
test('Lerma conserva Burgos, teléfono y reclamo proporcionado; no inventa tiempos de llegada', () => {
 const p=pages.find(p=>p.name==='Lerma'), m=localMetadata(p,site), h=renderPage(p);
 assert.equal(m.title,'Antenista en Lerma, Burgos | 946 390 339');
 assert.ok(m.description.startsWith('Antenista en Lerma, Burgos. Urgencias 24h. ☎ 946 390 339.'));
 assert.ok(m.description.includes('Antenas colectivas e individuales'));
 assert.ok(h.includes('<strong>Urgencias 24h</strong>'));
 assert.ok(!/\b(?:30|45) minutos\b/.test(h));
});
test('no propaga 24h a páginas sin ese dato', () => {
 for (const p of pages.filter(p=>!p.urgentLabel)) assert.ok(!localMetadata(p,site).description.includes('24h'));
});
test('antenas y porteros tienen encabezados propios de cada localidad', () => {
 for (const p of pages.filter(p=>p.type==='town')) {
  const h=renderPage(p);
  assert.ok(h.includes(`<h2>Instalación y reparación de antenas en ${p.name}</h2>`));
  assert.ok(h.includes(`Porteros automáticos y videoporteros en ${p.name}</h2>`));
  assert.ok(h.includes(`Cobertura móvil 4G/5G en ${p.name}</h2>`));
  assert.ok(h.includes(`Servicio en ${p.name} · ${site.phone}`));
 }
});
test('logotipo oficial local en la marca, sin imagen remota', () => {
 for (const p of pages) {
  const h=renderPage(p);
  assert.equal((h.match(/class="rapid-brand-logo"/g)||[]).length,1);
  assert.ok(h.includes('src="/assets/logo-antenaszalla.webp"'));
  assert.ok(h.includes('alt="Antenas Zalla"'));
  assert.ok(h.includes('aria-label="Antenas Zalla, inicio"'));
  assert.ok(!/<img[^>]+src="https?:\/\//i.test(h));
 }
});
test('prioridad a pueblos en portada y navegación, sin destacar capitales', () => {
 const p=pages.find(p=>p.type==='home'), h=renderPage(p), m=localMetadata(p,site);
 assert.equal(m.heading,'Antenistas en tu pueblo');
 assert.ok(m.description.startsWith('Antenas Zalla. Antenistas en tu pueblo.'));
 assert.ok(h.includes('<h2>Encuentra un antenista en tu pueblo</h2>'));
 assert.ok(h.includes('>Pueblos</a>'));
 assert.ok(!h.includes('<h2>Servicio por provincias</h2>'));
});
test('el enfoque en pueblos no borra las rutas históricas de ciudades', () => {
 assert.ok(pages.some(p=>p.path==='/Antenas-Bizkaia/bilbao.html'));
 for(const p of pages.filter(p=>p.type==='province')) assert.ok(renderPage(p).includes(`<h2>Busca tu pueblo en ${p.name}</h2>`));
});
test('marcas y confianza están visibles sin inventar reseñas estructuradas', () => {
 for (const p of pages) {
  const h=renderPage(p);
  for (const brand of ['Televés','Alcad','Ikusi','Fagor','Rover','EK','FTE Maximal','Fermax','Tegui','Golmar','Comelit','BTicino','Legrand','Galak']) assert.ok(h.includes(brand));
  assert.ok(h.includes('Atención profesional para averías e instalaciones'));
  assert.ok(h.includes('★★★★★'));
  assert.ok(!/AggregateRating|Review/.test(h));
 }
});
