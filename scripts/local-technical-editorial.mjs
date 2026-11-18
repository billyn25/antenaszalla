import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Additive editorial work: never remove municipal files, canonical URLs, images or existing paragraphs.
export const LOCAL_EDITORIAL_RELEASE = '20261118-1';
export const priorities = [
  { name: 'Zalla', title: 'Revisión de antenas TDT en Zalla', intro: 'Para preparar una revisión en Zalla conviene indicar si la incidencia afecta a una vivienda, a varias tomas o a toda una comunidad.', checks: ['Si falla un único televisor, comprobar la toma, el latiguillo y la búsqueda de canales antes de intervenir en la antena.', 'Si varios vecinos pierden los mismos canales, revisar primero los elementos comunes: amplificación, alimentación y distribución.', 'Cuando la señal se pixela de forma intermitente, registrar los canales afectados y el momento de la incidencia para medirla en la instalación.'] },
  { name: 'Balmaseda', title: 'Problemas de recepción TDT en Balmaseda', intro: 'En Balmaseda, al solicitar una intervención, es útil diferenciar una pérdida de canales de una avería en la distribución interior o comunitaria.', checks: ['Anotar qué canales fallan y si el problema empezó después de una resintonización o una modificación de la instalación.', 'Comparar una toma que funciona con otra que falla para localizar pérdidas en cables, conectores o derivadores.', 'En comunidades, confirmar si el problema es general antes de modificar amplificadores o la cabecera.'] },
  { name: 'Sopuerta', title: 'Revisión de antenas en Sopuerta y sus barrios', intro: 'En Sopuerta es importante indicar el barrio o núcleo concreto: la dirección de la vivienda permite preparar mejor el acceso y la revisión.', checks: ['Indicar si la antena es individual o compartida y qué canales presentan pixelaciones.', 'Antes de instalar un amplificador, medir la señal disponible: amplificar una señal defectuosa no siempre la corrige.', 'Si el fallo afecta a varias viviendas, comprobar la fuente de alimentación y la distribución comunitaria.'] },
  { name: 'Güeñes', title: 'Diagnóstico de señal de televisión en Güeñes', intro: 'Para una avería en Güeñes o Sodupe, la localidad y el tipo de edificio ayudan a diferenciar el recorrido del cable y los equipos compartidos.', checks: ['Comprobar si el fallo aparece en todas las tomas o solo en una habitación.', 'En edificios comunitarios, revisar primero si otros vecinos tienen la misma incidencia.', 'Si han desaparecido canales tras cambios de emisión, distinguir la resintonización de un problema de nivel o calidad de señal.'] },
  { name: 'Karrantza Harana/Valle de Carranza', title: 'Recepción TDT en Karrantza y sus núcleos', intro: 'En un municipio con distintos núcleos de población como Karrantza, conviene facilitar la ubicación exacta y los canales afectados antes del desplazamiento.', checks: ['Confirmar si la recepción procede de una antena individual o de una instalación comunitaria.', 'Anotar si las pixelaciones dependen del tiempo o se mantienen siempre en los mismos canales.', 'Comprobar el estado de conectores, alimentación de mástil y cable exterior antes de sustituir equipos.'] },
  { name: 'Valle de Mena', title: 'Antenas TDT y satélite en Valle de Mena', intro: 'En Valle de Mena, indicar si el aviso corresponde a Villasana u otra localidad del valle permite preparar la revisión con mayor precisión.', checks: ['Diferenciar averías de TDT terrestre de las que afectan a la recepción de Astra u otro satélite.', 'En una antena parabólica, comprobar orientación, LNB y conexiones antes de cambiar el receptor.', 'Si el problema afecta a varias viviendas, revisar la distribución y los elementos comunes de la instalación.'] }
];
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const esc = s => String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function editorialSection(item) {
  return `<section class="section wrap local-technical-editorial" id="comprobaciones-tdt-locales" data-local-editorial-release="${LOCAL_EDITORIAL_RELEASE}"><span class="eyebrow">Diagnóstico de recepción</span><h2>${esc(item.title)}</h2><p>${esc(item.intro)}</p><h3>Qué comprobar antes de la visita</h3><ul>${item.checks.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p>Para una revisión de una comunidad, consulta también la <a href="/servicios/mantenimiento-antenas-comunidades/">guía de antenas comunitarias</a>. Si faltan canales, revisa la <a href="/guias/la-septima-tdt-uhd/">guía de TDT y UHD</a>.</p></section>`;
}
export function applyLocalEditorial(root = 'dist') {
  const docs = JSON.parse(fs.readFileSync(path.join(root, 'public-seo-manifest.json'), 'utf8')).documents;
  const towns = JSON.parse(fs.readFileSync(path.join(root, 'local-pages-manifest.json'), 'utf8'));
  const byName = new Map(towns.map(t => [norm(t.name), t]));
  const applied = [];
  for (const item of priorities) {
    const town = byName.get(norm(item.name));
    if (!town) throw new Error('No se encuentra la ficha prioritaria: ' + item.name);
    const doc = docs.find(d => d.path === town.publicPath && d.indexable);
    if (!doc) throw new Error('La ficha no es indexable: ' + item.name);
    const file = path.join(root, doc.file);
    const html = fs.readFileSync(file, 'utf8');
    if (html.includes('data-local-editorial-release=')) throw new Error('Bloque editorial duplicado: ' + item.name);
    if (!html.includes('</main>')) throw new Error('Falta main: ' + item.name);
    fs.writeFileSync(file, html.replace('</main>', editorialSection(item) + '</main>'));
    applied.push({name: item.name, route: town.publicPath});
  }
  const homeFile = path.join(root, 'index.html');
  const home = fs.readFileSync(homeFile, 'utf8');
  if (!home.includes('id="mejoras-recepcion-local"')) {
    const links = applied.map(item => `<li><a href="${esc(item.route)}#comprobaciones-tdt-locales">${esc(item.name)}</a></li>`).join('');
    const block = `<section class="section wrap" id="mejoras-recepcion-local"><span class="eyebrow">Información para preparar una reparación</span><h2>Comprobaciones de TDT y antenas en Enkarterri y norte de Burgos</h2><p>Consulta qué datos conviene revisar cuando desaparecen canales, aparecen pixelaciones o falla una instalación comunitaria. Las indicaciones se adaptan al tipo de avería; el diagnóstico definitivo requiere comprobar la señal en la instalación.</p><ul>${links}</ul><p><a href="/servicios/reparacion-antenas-tdt/">Guía de averías TDT</a> · <a href="/servicios/mantenimiento-antenas-comunidades/">Antenas de comunidades</a></p></section>`;
    if (!home.includes('</main>')) throw new Error('Falta main en portada');
    fs.writeFileSync(homeFile, home.replace('</main>', block + '</main>'));
  }
  console.log('CONTENIDO TÉCNICO LOCAL OK:', JSON.stringify(applied));
  return applied;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) applyLocalEditorial(process.env.PRODUCTION_ROOT || 'dist');
