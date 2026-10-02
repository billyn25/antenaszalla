import fs from 'node:fs';
import path from 'node:path';
import pages from '../content/pages.json' with { type: 'json' };

const root = path.resolve('dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'local-pages-manifest.json'), 'utf8'));
const cache = JSON.parse(fs.readFileSync(path.resolve('.cache/municipios-selected.json'), 'utf8'));

const checks = pages.filter(p => p.type === 'province').map(p => ({ name: p.name, route: p.path }));

let expectedTotal = 0;
for (const check of checks) {
  const expected = cache.provinces?.[check.route] || [];
  if (!expected.length) throw new Error(`${check.name}: el dataset no contiene municipios para ${check.route}`);
  expectedTotal += expected.length;

  const provinceFile = path.join(root, check.route.slice(1), 'index.html');
  if (!fs.existsSync(provinceFile)) throw new Error(`Falta la página provincial de ${check.name}`);

  const locals = manifest.filter(p => p.province === check.name);
  if (locals.length !== expected.length) {
    throw new Error(`${check.name}: generados ${locals.length} de ${expected.length} municipios del dataset`);
  }

  const generatedNames = new Set(locals.map(p => p.name));
  const missing = expected.filter(m => !generatedNames.has(m.name));
  if (missing.length) {
    throw new Error(`${check.name}: faltan municipios: ${missing.slice(0, 10).map(m => m.name).join(', ')}`);
  }

  for (const page of locals) {
    const file = path.join(root, page.path.slice(1));
    if (!fs.existsSync(file)) throw new Error(`${check.name}: falta HTML local ${page.path}`);
  }
}

if (manifest.length !== expectedTotal) {
  throw new Error(`Total local incorrecto: generados ${manifest.length}, dataset ${expectedTotal}`);
}

console.log(`COBERTURA MUNICIPAL OK: ${checks.map(c => `${c.name}=${manifest.filter(p => p.province === c.name).length}`).join(', ')} · total=${manifest.length}. Ningún municipio del dataset queda fuera.`);
