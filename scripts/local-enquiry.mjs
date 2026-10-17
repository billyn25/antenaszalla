import {escapeHtml as esc,publicPath} from './public-seo.mjs';
export const localProblems=[
 ['La TDT no tiene señal','Indica si fallan todos los televisores y si también les ocurre a otros vecinos.'],
 ['La TDT se pixela o faltan canales','Anota qué canales fallan y si sucede siempre o solo a ciertas horas.'],
 ['El portero no llama o no se escucha','Cuenta si falla la llamada, el audio o ambas cosas, y si afecta a una vivienda o a todo el portal.'],
 ['El portero no abre la puerta','Indica si otros vecinos pueden abrir y si la conversación sigue funcionando.'],
 ['El videoportero no muestra imagen','Comenta si hay audio y si el problema ocurre desde todos los accesos al edificio.'],
 ['Necesito instalar o renovar equipos','Indica si es una vivienda o una comunidad y qué instalación existe actualmente.'],
 ['Quiero consultar TDT por satélite HD','Explica la mala recepción terrestre y si ya tienes parabólica o un receptor SAT-TDT.'],
 ['Necesito montaje de una antena Starlink','Indica el modelo del kit, si ya lo tienes y dónde se podría montar.']
];
export function localEnquiry(towns){
 if(!towns.length)return '';
 const first=towns.find(t=>t.name==='Zalla'&&t.province==='Bizkaia')||towns[0];
 const province=first.province||'Bizkaia';
 const provinces=[...new Set(towns.map(t=>t.province||'Bizkaia'))].sort((a,b)=>a.localeCompare(b,'es'));
 const data=towns.map(t=>({name:t.name,province:t.province||'Bizkaia',route:publicPath(t.path)}));
 const initial=data.filter(t=>t.province===province).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const payload=JSON.stringify(data).replace(/</g,'\\u003c');
 return `<div class="local-enquiry" data-local-enquiry hidden><div class="local-enquiry-fields"><script type="application/json" data-enquiry-towns>${payload}</script><label for="enquiry-province">1. Elige provincia y pueblo</label><select id="enquiry-province" data-enquiry-province>${provinces.map(p=>`<option${p===province?' selected':''}>${esc(p)}</option>`).join('')}</select><label class="local-enquiry-search-label" for="enquiry-search">Buscar dentro de la provincia</label><input id="enquiry-search" data-enquiry-search type="search" placeholder="Escribe el nombre de tu pueblo" autocomplete="off"><label class="local-enquiry-search-label" for="enquiry-town">Municipio</label><select id="enquiry-town" data-enquiry-town>${initial.map(t=>`<option value="${esc(t.name)}" data-route="${esc(t.route)}"${t.name===first.name?' selected':''}>${esc(t.name)}</option>`).join('')}</select><p class="local-enquiry-count" data-enquiry-count role="status">${initial.length} municipios disponibles en ${esc(province)}</p><label for="enquiry-problem">2. ¿Qué necesitas resolver?</label><select id="enquiry-problem" data-enquiry-problem>${localProblems.map(([name,hint])=>`<option value="${esc(name)}" data-hint="${esc(hint)}">${esc(name)}</option>`).join('')}</select><label for="enquiry-detail">3. Añade algún detalle <span>(opcional)</span></label><textarea id="enquiry-detail" data-enquiry-detail rows="3" maxlength="600" placeholder="Por ejemplo: falla en dos televisores o afecta a varios vecinos."></textarea></div><div class="local-enquiry-help"><span class="eyebrow">Para preparar el aviso</span><h3>Cuéntanos el síntoma, sin desmontar equipos.</h3><p data-enquiry-hint aria-live="polite">${esc(localProblems[0][1])}</p><p>No hace falta subir al tejado ni abrir el telefonillo. Una foto del equipo visible puede ayudar después, si la necesitas para explicar el caso.</p><a class="btn wa" data-enquiry-wa href="https://wa.me/34670042626" target="_blank" rel="noopener">Preparar consulta por WhatsApp →</a><a class="local-enquiry-route" data-enquiry-route href="${esc(publicPath(first.path))}">Ver servicio en ${esc(first.name)} →</a><p class="local-enquiry-note">El mensaje se abre en WhatsApp para que lo revises y decidas si enviarlo. La disponibilidad, el desplazamiento y el presupuesto se confirman con el técnico.</p></div></div>`;
}
