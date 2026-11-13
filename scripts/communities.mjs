import {escapeHtml as esc} from './public-seo.mjs';

export const COMMUNITIES_GUIDE = '/servicios/mantenimiento-antenas-comunidades/';

// Brief entry points share one detailed guide; they do not invent local jobs,
// offices, service commitments or a separate community page for every town.
export function communitiesSection(page) {
  const town=page.type==='town';
  const name=esc(page.name || '');
  const heading=town
    ? `Antenas y porteros para comunidades en ${name}`
    : page.type==='province'
      ? `Servicio para comunidades de vecinos en ${name}`
      : 'Un servicio pensado también para comunidades de vecinos';
  const content=town
    ? `<p>Si el fallo afecta a varios vecinos, indica las viviendas o portales afectados y si falla la televisión, la llamada, el audio, la imagen o la apertura. Un presidente o administrador puede reunir los avisos y coordinar el acceso a las zonas comunes.</p><p>La revisión distingue los elementos comunes y los de cada vivienda antes de plantear una reparación o una renovación.</p>`
    : `<p>Antenas colectivas, porteros automáticos y videoporteros: coordinamos la consulta con el presidente o administrador para conocer el alcance del fallo y preparar la intervención.</p><div class="community-service-points"><div><h3>Televisión del edificio</h3><p>Comparar viviendas afectadas y revisar recepción, cabecera y reparto.</p></div><div><h3>Accesos de la comunidad</h3><p>Separar llamada, audio, imagen y apertura desde los portales incluidos.</p></div><div><h3>Reparar o renovar</h3><p>Concretar material aprovechable, equipos compatibles y pruebas al terminar.</p></div></div>`;
  return `<section class="section community-overview${town?' community-overview-compact':''}" id="comunidades"><div class="wrap"><span class="eyebrow">Presidentes y administradores de fincas</span><h2>${heading}</h2>${content}<a class="community-guide-link" href="${COMMUNITIES_GUIDE}">Guía para comunidades: averías, coordinación y presupuesto <span aria-hidden="true">→</span></a></div></section>`;
}

export const COMMUNITIES_CSS=`
.community-overview{background:#f1f6f8;border-block:1px solid var(--line);scroll-margin-top:110px}
.community-overview h2{max-width:920px}
.community-overview .wrap>p{max-width:900px;line-height:1.7;color:var(--muted)}
.community-service-points{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:24px 0}
.community-service-points>div{padding-left:18px;border-left:3px solid #4f9bc3;min-width:0}
.community-service-points h3{font-size:19px;line-height:1.35;margin:0 0 8px}
.community-service-points p{font-size:15px;line-height:1.6;margin:0;color:var(--muted)}
.community-guide-link{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:10px 0;font-weight:750;line-height:1.5;overflow-wrap:anywhere}
.community-overview-compact{padding-block:28px}
.community-overview-compact h2{font-size:clamp(23px,2.5vw,30px)}
@media(max-width:760px){.community-service-points{grid-template-columns:1fr;gap:17px}.community-guide-link{align-items:flex-start}.community-guide-link span{flex:none}}
`;
