import postalData from '../content/local-postal-references.json' with {type:'json'};
import basqueData from '../content/local-area-basque.json' with {type:'json'};
import burgosData from '../content/local-area-burgos.json' with {type:'json'};
import {escapeHtml as esc} from './public-seo.mjs';
import {displayPlaceName} from './seo-metadata.mjs';
import {replaceSection} from './reduce-town-boilerplate.mjs';

export const LOCAL_AREA_RELEASE='20261113-local-1';
export const LOCAL_AREA_SOURCE=postalData.source;
const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]/g,'');
const postalByCode=new Map(postalData.profiles.map(profile=>[profile.code,profile]));
const editorialProfiles=[...basqueData.profiles,...burgosData.profiles];
const editorialByCode=new Map(editorialProfiles.map(profile=>[profile.code,profile]));
if(editorialByCode.size!==editorialProfiles.length)throw new Error('Referencias locales duplicadas por código municipal');

function unique(items,identity){
  const seen=new Set();
  return items.filter(item=>{const id=identity(item);if(seen.has(id))return false;seen.add(id);return true;});
}
function sourceUrl(value){
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol))throw new Error('Fuente local no válida');
  return url.href;
}
// Postal codes describe a cited address or locality, never a municipality-wide
// postal boundary. These examples must not become Organization addresses.
export function localAreaFor(town){
  const code=String(town.code||town.municipioId||'');
  const postal=postalByCode.get(code),editorial=editorialByCode.get(code);
  const name=displayPlaceName(town.name);
  const reference=postal?.reference||null;
  // A named, precisely cited address is more useful than a generic diseminado
  // record when the municipality has several postal areas (Valle de Losa).
  const usePostalReference=!!postal&&(postal.streets.length>0||!editorial?.postalCodes?.length);
  const postalCodes=unique([
    ...(editorial?.postalCodes||[]),
    ...(usePostalReference?postal.postalCodes:[])
  ],entry=>entry.code).slice(0,4);
  const areas=unique(editorial?.areas||[],entry=>key(entry.name)).slice(0,6);
  // A locality returned by reverse geocoding can add useful detail, but a
  // municipality repeated as its own "neighbourhood" cannot.
  if(!areas.length&&reference?.population&&key(reference.population)!==key(name)){
    const local=postal.areas?.find(entry=>key(entry.name)===key(reference.population));
    if(local)areas.push(local);
  }
  const streets=unique(editorial?.streets?.length?editorial.streets:(postal?.streets||[]),entry=>key(entry.name)).slice(0,3);
  const sources=unique([
    ...(editorial?.sources||[]),
    ...(usePostalReference?postal.sources:[])
  ],entry=>sourceUrl(entry.url));
  return {code,name,province:town.province,areas,streets,postalCodes,sources,reference,hasEditorial:!!editorial,hasPostal:!!postal,reviewed:editorial?.reviewed||postal?.reviewed||postalData.reviewed};
}

export function routeFromZalla(town){
  const destination=Number.isFinite(town.lat)&&Number.isFinite(town.lon)
    ? `${town.lat},${town.lon}`
    : `${displayPlaceName(town.name)}, ${town.province}, España`;
  const params=new URLSearchParams({api:'1',origin:'Zalla, Bizkaia, España',destination,travelmode:'driving'});
  return `https://www.google.com/maps/dir/?${params}`;
}

export function localAreaSection(town){
  const area=localAreaFor(town),name=esc(area.name);
  const areas=area.areas.length?`<article class="local-area-card"><h3>Barrios, núcleos y zonas de referencia</h3><p>Si la instalación está en alguno de estos lugares, añade su nombre al aviso:</p><ul class="local-area-places">${area.areas.map(place=>`<li>${esc(place.name)}</li>`).join('')}</ul></article>`:'';
  const postal=area.postalCodes.length?`<h3>Códigos postales de referencia</h3><dl class="local-area-postcodes">${area.postalCodes.map(entry=>`<div><dt>${esc(entry.code)}</dt><dd>${esc(entry.scope)}</dd></div>`).join('')}</dl><p class="local-area-note">Cada código corresponde a la referencia indicada. Confirma el de tu calle y número al preparar la visita.</p>`:`<h3>Ubicar la instalación</h3><p>Indica el código postal de la dirección, junto con la calle y el número. Si es una vivienda aislada, añade el núcleo o una ubicación en el mapa.</p>`;
  const additionalStreets=area.streets.filter(street=>!area.postalCodes.some(entry=>entry.scope.includes(street.name)));
  const streets=additionalStreets.length?`<div class="local-area-streets"><h4>Otras referencias del callejero</h4><ul>${additionalStreets.map(street=>`<li><strong>${esc(street.name)}</strong>${street.context?`<span>${esc(street.context)}</span>`:''}</li>`).join('')}</ul></div>`:'';
  const sourceDetails=area.sources.length?`<details class="local-area-sources"><summary>Consultar las fuentes geográficas</summary><p>Referencias locales consultadas el ${esc(area.reviewed.split('-').reverse().join('/'))}.</p><ul>${area.sources.map(source=>`<li><a href="${esc(sourceUrl(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.label)} ↗</a></li>`).join('')}</ul></details>`:'';
  const isZalla=area.code==='48096';
  const route=isZalla
    ? `<h3>Visitas dentro de Zalla</h3><p>Indica el barrio y la dirección completa para concretar el desplazamiento. En una comunidad, añade quién facilitará el acceso al portal y a los equipos comunes.</p>`
    : `<h3>Desplazamiento desde Zalla a ${name}</h3><p>Consulta el recorrido hasta el municipio y añade la dirección de la instalación para ver los kilómetros por carretera. Al preparar el aviso concretamos desplazamiento, disponibilidad y acceso al inmueble.</p><a class="local-area-route" href="${esc(routeFromZalla(town))}" target="_blank" rel="noopener noreferrer">Ver ruta y kilómetros desde Zalla <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10"/></svg></a>`;
  return `<section class="section soft local-area-coverage" id="preparar-visita-local" data-local-area-release="${LOCAL_AREA_RELEASE}" data-local-area-code="${esc(area.code)}"><div class="wrap"><span class="eyebrow">Ubicar la visita</span><h2>${area.areas.length?'Barrios, calles y códigos postales':'Calles y códigos postales'} en ${name}</h2><p class="section-lead">Para consultar una instalación o avería en ${name}, facilita calle, portal y código postal. En viviendas fuera del casco, indica también el barrio o núcleo.</p><div class="local-area-grid${areas?' has-areas':''}">${areas}<article class="local-area-card">${postal}${streets}</article></div><div class="local-area-travel">${route}<p class="local-area-note">El diagnóstico y los materiales se concretan según la instalación y el trabajo que necesites.</p></div>${sourceDetails}</div></section>`;
}

export function enhanceLocalArea(html,town){
  if(html.includes(`data-local-area-release="${LOCAL_AREA_RELEASE}"`))return html;
  if(!/<section\b[^>]*\bid="preparar-visita-local"/.test(html))throw new Error('Falta la preparación de visita en '+town.name);
  const updated=replaceSection(html,'preparar-visita-local',()=>localAreaSection(town))
    .replace(/<div class="wrap local-area-shortcut">[\s\S]*?<\/div>/g,'');
  // One shortcut near the start keeps the useful address information reachable
  // without making the mobile hero taller or duplicating the section.
  return updated.replace(/(<section\b[^>]*\bid="diagnostico-averias"[^>]*>)/,
    `<div class="wrap local-area-shortcut"><a href="#preparar-visita-local">Calles, barrios y desplazamiento en ${esc(displayPlaceName(town.name))} →</a></div>$1`);
}

export const LOCAL_AREA_CSS=`
.local-area-shortcut{padding-top:12px;padding-bottom:4px}.local-area-shortcut a{display:inline-block;min-height:44px;padding:10px 0;font-size:15px;font-weight:700;line-height:1.5;color:#17577b;overflow-wrap:anywhere}.local-area-coverage h2{max-width:30ch}.local-area-coverage .section-lead{max-width:77ch}.local-area-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;margin:26px 0}.local-area-grid.has-areas{grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr)}.local-area-card{min-width:0;padding:25px;background:#fff;border:1px solid #d5e2e9;border-radius:12px}.local-area-card h3,.local-area-travel h3{font-size:21px;line-height:1.3;margin:0 0 13px}.local-area-card p{line-height:1.6}.local-area-places{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:18px 0 0}.local-area-places li{padding:7px 11px;border-radius:5px;background:#edf5f8;color:#173e52;line-height:1.45;font-weight:600;overflow-wrap:anywhere}.local-area-postcodes{margin:0}.local-area-postcodes>div{display:grid;grid-template-columns:65px minmax(0,1fr);gap:15px;padding:12px 0;border-bottom:1px solid #e4ebef}.local-area-postcodes dt{font-weight:800;color:#17577b;font-variant-numeric:tabular-nums}.local-area-postcodes dd{margin:0;line-height:1.5;overflow-wrap:anywhere}.local-area-note{font-size:14px;line-height:1.55;color:#526875}.local-area-streets{margin-top:20px}.local-area-streets h4{font-size:16px;margin:0 0 10px}.local-area-streets ul{padding-left:20px;margin:0}.local-area-streets li{padding:5px 0;line-height:1.5;overflow-wrap:anywhere}.local-area-streets li span{display:block;font-size:14px;color:#526875}.local-area-travel{padding:23px 26px;border-left:4px solid #2d789f;background:#e8f1f6;border-radius:0 10px 10px 0}.local-area-travel p{max-width:85ch;line-height:1.6}.local-area-route{display:inline-flex;gap:10px;align-items:center;min-height:44px;padding:10px 0;color:#17577b;font-weight:750;line-height:1.5}.local-area-sources{margin-top:20px;border-top:1px solid #cfdee6;padding-top:10px}.local-area-sources summary{cursor:pointer;min-height:44px;padding:10px 0;font-size:14px;font-weight:650;color:#365b70}.local-area-sources p,.local-area-sources li{font-size:14px;line-height:1.6}.local-area-sources ul{padding-left:20px}.local-area-sources a{overflow-wrap:anywhere}.local-area-coverage a:focus-visible,.local-area-shortcut a:focus-visible,.local-area-sources summary:focus-visible{outline:3px solid #2d789f;outline-offset:4px}@media(max-width:760px){.local-area-grid.has-areas{grid-template-columns:minmax(0,1fr)}.local-area-card{padding:20px}.local-area-travel{padding:20px}.local-area-coverage h2{font-size:clamp(25px,7vw,34px)}.local-area-postcodes>div{grid-template-columns:58px minmax(0,1fr);gap:12px}.local-area-shortcut a{font-size:14px}}
`;
