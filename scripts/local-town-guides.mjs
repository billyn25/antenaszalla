import data from '../content/local-town-guides.json' with {type:'json'};
import {escapeHtml as esc} from './public-seo.mjs';
import {replaceSection} from './reduce-town-boilerplate.mjs';

// Editorial guides describe possible enquiries, never completed jobs or verified
// local faults. Geographic references are linked to their primary source.
export const LOCAL_TOWN_GUIDE_RELEASE=data.reviewed.replaceAll('-','');
export const localTownGuides=data.profiles;
const key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const byCode=new Map(localTownGuides.map(profile=>[profile.code,profile]));
const byName=new Map(localTownGuides.map(profile=>[key(profile.province)+'|'+key(profile.name),profile]));

export function localTownGuideFor(town={}){
  return byCode.get(String(town.code||town.municipioId||''))||byName.get(key(town.province)+'|'+key(town.name))||null;
}

export function localTownGuide(town){
  const profile=localTownGuideFor(town);
  if(!profile)return '';
  const cards=profile.checks.map(([heading,text,action],index)=>`<article class="reception-card"><span class="reception-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><h3>${esc(heading)}</h3><p>${esc(text)}</p><div class="reception-check"><strong>Qué se comprueba</strong><p>${esc(action)}</p></div></article>`);
  cards.push(`<article class="reception-card"><span class="reception-number" aria-hidden="true">03</span><h3>${esc(profile.preparation[0])}</h3><p>${esc(profile.preparation[1])}</p><div class="reception-check"><a href="#contacto">Preparar mi consulta →</a></div></article>`);
  const sources=profile.sources.length?`<p class="local-guide-sources"><small>Referencias de consulta: ${profile.sources.map(([label,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join(' · ')}.</small></p>`:'';
  return `<section class="section wrap town-reception" id="recepcion-tdt-local" data-local-town-guide="${esc(profile.code)}" data-local-guide-release="${LOCAL_TOWN_GUIDE_RELEASE}"><div class="reception-heading"><span class="eyebrow">Tu consulta en ${esc(profile.name)}</span><h2>${esc(profile.heading)}</h2><p class="section-lead">${esc(profile.intro)}</p></div><div class="reception-grid">${cards.join('')}</div><aside class="reception-reference"><div><h3>Preparar el trabajo con el equipo identificado</h3><p>Consulta las comprobaciones y opciones del servicio antes de elegir material.</p></div><a href="${esc(profile.guide[1])}">${esc(profile.guide[0])} →</a></aside>${sources}</section>`;
}

export function applyLocalTownGuide(html,town){
  const rendered=localTownGuide(town);
  if(!rendered)return html;
  if(!/<section\b[^>]*\bid="recepcion-tdt-local"/.test(html))throw new Error(`Falta el bloque de recepción para la guía local de ${town.name}`);
  return replaceSection(html,'recepcion-tdt-local',()=>rendered);
}
