import {escapeHtml as esc} from './public-seo.mjs';

export const BURGOS_CONTENT_RELEASE='20261113';
const town=(name,slug)=>({name,route:'/antenas-burgos/'+slug});
export const BURGOS_SERVICE_AREAS=[
 {
  title:'Valle de Mena, Montija y Espinosa',
  text:'Indica el núcleo de población y la dirección, además del municipio. Para una vivienda con antena propia conviene saber si falla toda la televisión, una toma o un receptor de satélite; así se prepara la revisión y el desplazamiento desde Zalla.',
  towns:[town('Valle de Mena','valle-de-mena'),town('Merindad de Montija','merindad-de-montija'),town('Espinosa de los Monteros','espinosa-de-los-monteros')]
 },
 {
  title:'Medina de Pomar, Villarcayo y Valle de Losa',
  text:'En un edificio, el número de viviendas afectadas orienta la revisión de la cabecera y la distribución. En una casa, interesa conocer el recorrido del cable y cuántas tomas se utilizan. Para un portero, concreta si falla llamada, audio o apertura.',
  towns:[town('Medina de Pomar','medina-de-pomar'),town('Villarcayo','villarcayo-de-merindad-de-castilla-la-vieja'),town('Valle de Losa','valle-de-losa')]
 },
 {
  title:'Trespaderne, Frías, Oña y Valle de Tobalina',
  text:'Una lista de canales incompleta y una pérdida de señal requieren comprobaciones diferentes. Anota los canales que faltan, si antes se recibían y si se ven en otra toma. Para trabajos exteriores, prepara también la información sobre acceso y fijaciones.',
  towns:[town('Trespaderne','trespaderne'),town('Frías','frias'),town('Oña','ona'),town('Valle de Tobalina','valle-de-tobalina')]
 },
 {
  title:'Burgos, Miranda de Ebro, Aranda y Lerma',
  text:'Para comunidades, renovaciones y reparaciones, describe la instalación antes de organizar la visita. Un presupuesto de antena colectiva debe delimitar qué incluye: recepción, amplificación, reparto, tomas y comprobación final; en accesos, placa, terminales y apertura.',
  towns:[town('Burgos','burgos'),town('Miranda de Ebro','miranda-de-ebro'),town('Aranda de Duero','aranda_duero'),town('Lerma','lerma')]
 }
];
const links=towns=>towns.map(t=>`<a href="${esc(t.route)}">${esc(t.name)}</a>`).join('');

export function burgosProvinceSection(){
 return `<section class="section soft burgos-service-area" id="burgos-desde-zalla" data-burgos-release="${BURGOS_CONTENT_RELEASE}" aria-labelledby="burgos-desde-zalla-title"><div class="wrap"><span class="eyebrow">Desplazamientos desde Zalla</span><h2 id="burgos-desde-zalla-title">Antenas, porteros y comunidades en Burgos</h2><p class="section-lead">Trabajamos en Burgos desde Zalla, con atención habitual en el norte de la provincia. Preparamos cada aviso según el pueblo, el tipo de inmueble y el alcance de la avería. Indica estos datos para concretar la visita, el desplazamiento y las condiciones del trabajo.</p><div class="burgos-area-grid">${BURGOS_SERVICE_AREAS.map(area=>`<article class="burgos-area-card"><h3>${esc(area.title)}</h3><p>${esc(area.text)}</p><nav class="featured-towns" aria-label="Consultas en ${esc(area.title)}">${links(area.towns)}</nav></article>`).join('')}</div><div class="burgos-visit-note"><h3>Qué preparar antes de la visita</h3><p>Dirección y núcleo de población, fotos del equipo que se pueda ver sin desmontar y una descripción del fallo. Si es una comunidad, añade cuántos vecinos o portales están afectados y quién facilita el acceso a la cabecera o a la placa de calle. Si la vivienda permanece cerrada, acuerda también quién recibirá al técnico.</p><nav class="burgos-help-links" aria-label="Preparar un trabajo en Burgos"><a href="/servicios/mantenimiento-antenas-comunidades/">Mantenimiento de antenas colectivas →</a><a href="/guias/la-septima-tdt-uhd/">Canales nuevos, La Séptima y UHD →</a><a href="#contacto">Preparar la consulta →</a></nav></div></div></section>`;
}

export function burgosHomeTeaser(){
 const highlighted=[BURGOS_SERVICE_AREAS[0].towns[0],BURGOS_SERVICE_AREAS[1].towns[0],BURGOS_SERVICE_AREAS[1].towns[1],BURGOS_SERVICE_AREAS[0].towns[2],BURGOS_SERVICE_AREAS[1].towns[2],BURGOS_SERVICE_AREAS[2].towns[0]];
 return `<section class="section wrap burgos-home-area" id="norte-burgos" data-burgos-release="${BURGOS_CONTENT_RELEASE}" aria-labelledby="norte-burgos-title"><span class="eyebrow">De Zalla al norte de Burgos</span><h2 id="norte-burgos-title">Servicio en Valle de Mena y Las Merindades</h2><p class="section-lead">Nos desplazamos desde Zalla para revisar antenas individuales y colectivas, parabólicas, porteros y videoporteros. Indica el pueblo y si el aviso afecta a una vivienda o a varios vecinos para organizar la atención.</p><nav class="featured-towns" aria-label="Localidades del norte de Burgos">${links(highlighted)}</nav><a class="coverage-consult" href="/antenas-burgos/#burgos-desde-zalla">Ver las zonas de Burgos y preparar la visita →</a></section>`;
}

// Insert before layout organisation so the caller can place these blocks in
// its normal content order. This function is idempotent on an existing build.
export function enhanceBurgosCoverage(html,doc){
 if(doc.path==='/antenas-burgos/'&&!html.includes('id="burgos-desde-zalla"')){
  const marker=/<section\b[^>]*\bid="localidades"[^>]*>/;
  if(!marker.test(html))throw new Error('Falta el directorio provincial para el contenido de Burgos');
  return html.replace(marker,opening=>burgosProvinceSection()+opening);
 }
 if(doc.path==='/'&&!html.includes('id="norte-burgos"')){
  const marker=/<section\b[^>]*\bid="zonas"[^>]*>/;
  if(!marker.test(html))throw new Error('Falta la sección de provincias para el acceso al norte de Burgos');
  return html.replace(marker,opening=>burgosHomeTeaser()+opening);
 }
 return html;
}

export const BURGOS_COVERAGE_CSS=`
.burgos-area-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin:28px 0}.burgos-area-card{padding:26px;background:#fff;border:1px solid #cfdee7;border-radius:14px;min-width:0}.burgos-area-card h3{font-size:23px;line-height:1.3;margin:0 0 14px;color:#12354b}.burgos-area-card p{line-height:1.7;color:#40596a}.burgos-area-card .featured-towns{margin-top:20px}.burgos-visit-note{padding:24px;border-left:3px solid #2d789f;background:#fff}.burgos-visit-note h3{margin-top:0;font-size:22px}.burgos-visit-note p{line-height:1.7;max-width:90ch}.burgos-help-links{display:flex;gap:12px 28px;flex-wrap:wrap}.burgos-help-links a{display:inline-flex;align-items:center;min-height:44px;font-weight:700}.burgos-home-area>.featured-towns{margin-block:22px 8px}@media(max-width:760px){.burgos-area-grid{grid-template-columns:1fr;gap:16px}.burgos-area-card{padding:20px}.burgos-area-card h3{font-size:21px}.burgos-visit-note{padding:20px}.burgos-help-links{gap:4px}.burgos-help-links a{width:100%}}
`;
