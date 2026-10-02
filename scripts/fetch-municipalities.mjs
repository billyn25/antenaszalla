import fs from 'node:fs';
import path from 'node:path';

const SOURCE = 'https://raw.githubusercontent.com/codeforspain/ds-organizacion-administrativa/1e9c99280ef4d7a12def33cafc3df59d9fc1f688/data/municipios.json';
const PROVINCES = {
'01':{name:'Álava',path:'/Antenas-Alava/'},'48':{name:'Bizkaia',path:'/Antenas-Bizkaia/'},'09':{name:'Burgos',path:'/Antenas-Burgos/'},'39':{name:'Cantabria',path:'/Antenas-Cantabria/'},'20':{name:'Gipuzkoa',path:'/Antenas-Guipuzcoa/'},'31':{name:'Navarra',path:'/Antenas-Navarra/'},'26':{name:'La Rioja',path:'/Antenas-La-Rioja/'},'34':{name:'Palencia',path:'/Antenas-Palencia/'},'47':{name:'Valladolid',path:'/Antenas-Valladolid/'},'24':{name:'León',path:'/Antenas-Leon/'}
};

function municipalityName(item) {
  let name = item.nombre.replaceAll('\\/', '/');
  if (['24','34','47'].includes(item.provincia_id)) {
    name = name.replace(/^(.+),\s*(El|La|Los|Las)$/, '$2 $1').replace(/^(.+)\s+\((El|La|Los|Las)\)$/, '$2 $1');
  }
  return name;
}

const response = await fetch(SOURCE, { headers: { 'user-agent': 'AntenasZalla-build' } });
if (!response.ok) throw new Error(`No se pudo cargar el listado de municipios: HTTP ${response.status}`);
const all = await response.json();
const selected = all.filter(item => PROVINCES[item.provincia_id]);

const grouped = {};
for (const [id, info] of Object.entries(PROVINCES)) {
  const items = selected
    .filter(item => item.provincia_id === id)
    .map(item => ({ id: item.municipio_id, name: municipalityName(item) }))
    .sort((a,b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  if (!items.length) throw new Error(`Dataset municipal sin datos para ${info.name} (${id})`);
  grouped[info.path] = items;
}

const out = path.resolve('.cache/municipios-selected.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ source: SOURCE, provinces: grouped }, null, 2));

const detail = Object.entries(grouped).map(([route, items]) => `${route}=${items.length}`).join(', ');
console.log(`MUNICIPIOS OK: ${selected.length} municipios cargados (${detail}).`);
