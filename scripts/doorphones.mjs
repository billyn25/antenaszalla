// Sección de servicio real, compartida por plantilla; no se inventan obras ni sedes.
const antennaBrands = ['Televés','Alcad','Ikusi','Fagor','Rover','EK','FTE Maximal','Fringe'];
const doorBrands = ['Fermax','Tegui','Golmar','Comelit','BTicino','Legrand','Fringe','Galak'];

function brandPills(items) {
  return `<div class="brand-pills">${items.map(name=>`<span>${name}</span>`).join('')}</div>`;
}

function trustAndBrands(page, esc) {
  const local = page.type === 'town' ? ` en ${esc(page.name)}` : '';
  return `<section class="trust section soft" id="experiencia"><div class="wrap"><div class="trust-grid"><div><span class="eyebrow">Criterios de trabajo</span><h2>Atención profesional para averías e instalaciones${local}</h2><div class="stars" aria-label="Cinco estrellas decorativas">★★★★★</div><p class="section-lead">Servicio orientado a viviendas, comunidades y negocios. Revisamos la instalación antes de proponer sustituciones y trabajamos tanto con equipos antiguos como con soluciones actuales.</p></div><div class="trust-points"><article><strong>Rapidez de atención</strong><p>Consulta por teléfono o WhatsApp indicando tu localidad.</p></article><article><strong>Experiencia real</strong><p>Instalaciones antiguas, renovaciones y equipos actuales.</p></article><article><strong>Diagnóstico antes de sustituir</strong><p>Primero localizamos el problema; después valoramos el cambio necesario.</p></article></div></div><div class="brands-block"><div><span class="eyebrow">Experiencia con equipos antiguos y actuales</span><h2>Marcas con las que trabajamos</h2><p class="section-lead">Equipos habituales en instalaciones de antena, amplificación, porteros automáticos y videoporteros.</p></div><div class="brand-group"><h3>Antenas y amplificación</h3>${brandPills(antennaBrands)}</div><div class="brand-group"><h3>Porteros automáticos y videoporteros</h3>${brandPills(doorBrands)}</div></div></div></section>`;
}

function mobileCoverage(page, phone, tel, esc) {
  const local = page.type === 'home' ? '' : ` en ${esc(page.name)}`;
  return `<section class="mobile-coverage section" id="cobertura-movil"><div class="wrap two-col"><div><span class="eyebrow">Vivienda individual</span><h2>Cobertura móvil 4G/5G${local}</h2><p class="section-lead">Estudio y mejora de cobertura para casas y viviendas individuales con mala recepción móvil o conexión de datos. Podemos valorar antenas exteriores para router 4G/5G y la distribución interior adecuada según la señal disponible.</p><p class="town-intro">Los repetidores de señal móvil para llamadas no se instalan de forma indiscriminada: su uso debe ajustarse a la normativa y a las condiciones del operador. Primero comprobamos qué solución encaja en la vivienda.</p></div><aside class="help-box"><h3>Consulta la cobertura de tu vivienda</h3><p>Indica localidad, operador, si el problema es de llamadas, datos o ambos y en qué zonas de la casa ocurre.</p><a class="text-call" href="${esc(tel)}">${esc(phone)}<span>Consultar cobertura móvil</span></a></aside></div></section>`;
}

export function doorphones(page, phone, tel, esc) {
  const heading = 'Porteros automáticos y videoporteros' + (page.type === 'home' ? '' : ` en ${page.name}`);
  const serviceLabel = page.type === 'home' ? 'Servicio técnico' : `Servicio en ${page.name} · ${phone}`;
  const base = `<section class="doorphones section" id="porteros-videoporteros"><div class="wrap"><div class="section-heading"><div><span class="eyebrow">${esc(serviceLabel)}</span><h2>${esc(heading)}</h2></div><a class="text-call" href="${esc(tel)}">${esc(phone)}<span>Consultar una reparación</span></a></div><p class="section-lead">Instalación, reparación, renovación y mantenimiento para viviendas y comunidades. Telefonillos, monitores y placas de calle: revisamos qué falla antes de proponer el cambio de un equipo.</p><div class="doorphone-work"><article><span class="work-number" aria-hidden="true">01</span><h3>Reparar una avería</h3><p>¿No llama, no se escucha o no abre la puerta? Indica si ocurre en una vivienda o en toda la comunidad. Revisamos llamada, audio, imagen y apertura según el sistema instalado.</p></article><article><span class="work-number" aria-hidden="true">02</span><h3>Instalar o renovar</h3><p>Instalación de porteros automáticos y videoporteros, cambio de telefonillos, monitores y placas. Antes de elegir un recambio, comprobamos la compatibilidad del cableado y del equipo existente.</p></article><article><span class="work-number" aria-hidden="true">03</span><h3>Mantener la instalación</h3><p>Consulta la revisión del acceso de tu comunidad: pulsadores, fuente de alimentación, conexiones y elementos de apertura. El alcance del mantenimiento se acuerda según la instalación.</p></article></div><p class="doorphone-note"><strong>Para preparar tu aviso:</strong> localidad, marca o modelo visible y qué función ha dejado de funcionar. No necesitas abrir ni desmontar el equipo.</p></div></section>`;
  const styles = `<style>
.stars{font-size:31px;letter-spacing:4px;color:#d89a00;margin:10px 0 15px;text-shadow:0 2px 8px rgba(216,154,0,.16)}
.trust{background:linear-gradient(180deg,#fbfaf8 0%,#f4f1ed 100%)!important;border-top:1px solid #e7e1dd;border-bottom:1px solid #e7e1dd}
.trust-grid{display:grid;grid-template-columns:1.05fr 1.4fr;gap:42px;align-items:start}
.trust-grid>div:first-child{padding:8px 0}
.trust-grid h2,.brands-block h2{color:#242529!important}
.trust-grid .section-lead,.brands-block .section-lead{color:#55575c!important}
.trust-points{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border:0;background:transparent;align-items:start;align-content:start;grid-auto-rows:max-content;height:auto;min-height:0}
.trust-points article{padding:20px 18px;background:#fff;border:1px solid #ded8d3!important;border-radius:14px;box-shadow:0 10px 24px rgba(29,31,35,.065);height:auto;min-height:0;align-self:start}
.trust-points article+article{border-left:1px solid #ded8d3!important}
.trust-points strong{display:block;font-size:16px;color:#25262a;line-height:1.3}
.trust-points p{margin:7px 0 0;color:#5d5f64;font-size:13px;line-height:1.5}
.brands-block{margin-top:38px;padding:30px;border:1px solid #ded8d3;border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(29,31,35,.07)}
.brand-group{margin-top:22px}
.brand-group h3{font-size:15px;margin:0 0 11px;color:#2b2c30}
.brand-pills{display:flex;flex-wrap:wrap;gap:9px}
.brand-pills span{display:inline-flex;align-items:center;min-height:38px;padding:7px 13px;background:#f7f4f2;border:1px solid #ddd6d1;font-weight:800;font-size:14px;border-radius:999px;color:#36373b;box-shadow:0 3px 9px rgba(29,31,35,.035)}
.mobile-coverage{border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.mobile-coverage .text-call{display:block;margin-top:20px;color:var(--brand)}
@media(max-width:760px){.trust-grid{grid-template-columns:1fr;gap:22px}.trust-points{grid-template-columns:1fr}.trust-points article+article{border-left:1px solid #ded8d3!important}.brands-block{padding:22px;margin-top:28px}.brand-pills span{font-size:13px}}
</style>`;
  return base + mobileCoverage(page, phone, tel, esc) + trustAndBrands(page, esc) + styles;
}
