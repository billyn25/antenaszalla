import pages from '../content/pages.json' with {type:'json'};
import {escapeHtml as esc} from './public-seo.mjs';
const layout=[
 ['Cantabria','cantabria','Cantábrico'],['Bizkaia','bizkaia','Euskadi'],['Gipuzkoa','gipuzkoa','Euskadi'],['Navarra','navarra','Navarra'],
 ['León','leon','Castilla y León'],['Palencia','palencia','Castilla y León'],['Burgos','burgos','Castilla y León'],['Álava','alava','Euskadi'],['La Rioja','rioja','La Rioja'],
 ['Valladolid','valladolid','Castilla y León'],['Segovia','segovia','Castilla y León']
];
export function coverageMap(){
 const provinces=pages.filter(p=>p.type==='province');
 return `<div class="zalla-coverage-atlas"><div class="coverage-atlas-top"><span>Elige dónde necesitas al técnico</span><span class="coverage-atlas-key"><i aria-hidden="true"></i> Provincias con servicio</span></div><nav class="coverage-tile-map" aria-label="Mapa esquemático de las once provincias de servicio">${layout.map(([name,area,region])=>{const province=provinces.find(p=>p.name===name);if(!province)throw new Error('Provincia del mapa sin ruta: '+name);return `<a class="coverage-tile coverage-tile-${area}" href="${esc(province.path)}" aria-label="Ver municipios de ${esc(name)}"><span class="coverage-tile-region">${esc(region)}</span><strong>${esc(name)}</strong><span class="coverage-tile-action">Ver municipios <b aria-hidden="true">↗</b></span></a>`;}).join('')}</nav><div class="coverage-atlas-bottom"><span>Mapa esquemático de provincias</span><span>Viviendas · Comunidades · Negocios</span></div></div>`;
}
