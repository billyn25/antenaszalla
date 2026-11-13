import test from 'node:test';
import assert from 'node:assert/strict';
import { pages, site, renderPage } from '../scripts/build.mjs';
import { localMetadata } from '../scripts/identity.mjs';
import { displayPlaceName } from '../scripts/seo-metadata.mjs';
import { titleOf, metaOf, decodeHtml } from '../scripts/public-seo.mjs';

test('portada de marca: sin Bizkaia en título, H1, descripción o encabezados', () => {
 const p = pages.find(p => p.type === 'home'), h = renderPage(p), m = localMetadata(p, site);
 assert.ok(!/Bizkaia/i.test([m.title,m.heading,m.description].join(' ')));
 for (const match of h.matchAll(/<h[12]\b[^>]*>(.*?)<\/h[12]>/g)) assert.ok(!/Bizkaia/.test(match[1]));
 assert.ok(h.includes('href="/Antenas-Bizkaia/"'));
});
test('Lerma conserva localidad, contacto y urgencias autorizadas sin prometer tiempos de llegada', () => {
 const p=pages.find(p=>p.name==='Lerma'), m=localMetadata(p,site), h=renderPage(p);
 assert.equal(m.title,'Antenista en Lerma | Antenas Zalla');
 assert.equal(m.heading,'Antenista en Lerma');
 assert.ok(m.description.includes('Lerma, Burgos'));
 assert.ok(m.description.includes(site.phone));
 assert.match(m.description,/Urgencias 24\s*h/);
 assert.ok(m.description.includes('viviendas y comunidades'));
 assert.ok(h.includes('<strong>Urgencias 24h</strong>'));
 assert.ok(!/\b(?:30|45) minutos\b|llegada garantizada|respuesta inmediata/iu.test(h));
});
test('las localidades sin urgencias declaradas mantienen consulta de disponibilidad', () => {
 for (const p of pages.filter(p=>p.type==='town'&&!p.urgentLabel)) {
  const m=localMetadata(p,site);
  assert.ok(!/24\s*h/iu.test(m.description));
  assert.ok(m.description.includes('Consulta disponibilidad'));
 }
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
test('marca local Antenas Zalla, con identidad local Zalla', () => {
 for (const p of pages) {
  const h=renderPage(p);
  assert.equal((h.match(/class="zalla-brand-logo-base zalla-brand-logo"/g)||[]).length,1);
  assert.ok(h.includes('aria-label="Antenas Zalla"'));
  assert.ok(h.includes('aria-label="Antenas Zalla, inicio"'));
  assert.ok(!h.includes('logo-antenaszalla'));
  assert.ok(!/<img[^>]+src="https?:\/\//i.test(h));
 }
});
test('prioridad a pueblos en portada y navegación, sin destacar capitales', () => {
 const p=pages.find(p=>p.type==='home'), h=renderPage(p), m=localMetadata(p,site);
 assert.equal(m.heading,'Antenas, porteros y videoporteros desde Zalla');
 assert.equal(m.title,'Antenas Zalla | Antenas, porteros y videoporteros');
 assert.ok(m.description.startsWith('Antenas Zalla: instalación y reparación'));
 assert.ok(m.description.includes(site.phone));
 assert.ok(h.includes('<h2>Encuentra un antenista en tu pueblo</h2>'));
 assert.ok(h.includes('>Pueblos</a>'));
 assert.ok(!h.includes('<h2>Servicio por provincias</h2>'));
});

test('el HTML usa una H1 y los metadatos vigentes sin recortar los nombres locales', () => {
 for(const p of pages) {
  const h=renderPage(p), metadata=localMetadata(p,site);
  assert.equal((h.match(/<h1\b/gi)||[]).length,1,p.path);
  assert.equal(titleOf(h),metadata.title,p.path);
  assert.equal(metaOf(h,'description'),metadata.description,p.path);
  const heading=decodeHtml(h.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
  assert.equal(heading,metadata.heading,p.path);
  if(p.type==='town') {
   assert.ok(metadata.title.includes(displayPlaceName(p.name)),p.path);
   assert.ok(metadata.description.includes(displayPlaceName(p.name)),p.path);
  }
 }
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
