import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import services from '../content/services.json' with {type:'json'};
import {guides,guideRoute} from './service-guides.mjs';
import {escapeHtml as esc} from './public-seo.mjs';

export const FLOW_RELEASE='20261023';
const families=[
  {id:'television',name:'Recepción y distribución de televisión',ids:['tdt','amplificacion','tomas','mantenimiento']},
  {id:'accesos',name:'Porteros, vídeo y apertura',ids:['porteros','videoporteros']},
  {id:'satelite',name:'Televisión e internet por satélite',ids:['parabolicas','tdt-satelite','starlink']},
  {id:'conectividad',name:'Conectividad de la vivienda',ids:['cobertura-movil-servicio']}
];
const attrs=node=>node.slice(0,node.indexOf('>')+1);
const idOf=node=>attrs(node).match(/\bid="([^"]+)"/)?.[1];
const hasClass=(node,name)=>new RegExp(`\\bclass="[^"]*\\b${name}\\b`).test(attrs(node));

// Balanced top-level HTML blocks preserve complete nested sections, SVGs,
// forms, styles and dialogs without serializing or rewriting their contents.
export function childBlocks(html) {
  const tags=/<!--[\s\S]*?-->|<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
  const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const stack=[],nodes=[];let start=-1;
  for(const match of html.matchAll(tags)) {
    if(match[0].startsWith('<!--'))continue;
    const tag=match[0].match(/^<\/?([a-z][\w:-]*)/i)?.[1].toLowerCase();if(!tag)continue;
    if(match[0].startsWith('</')) {
      assert.equal(stack.pop(),tag,`Cierre HTML inesperado: ${tag}`);
      if(!stack.length){nodes.push(html.slice(start,match.index+match[0].length));start=-1;}
    } else {
      if(!stack.length)start=match.index;
      if(voids.has(tag)||match[0].endsWith('/>')){if(!stack.length){nodes.push(match[0]);start=-1;}}
      else stack.push(tag);
    }
  }
  assert.equal(stack.length,0,'HTML sin cerrar');
  assert.equal(nodes.join('').replace(/\s/g,''),html.replace(/\s/g,''),'Contenido fuera de los bloques esperados');
  return nodes;
}
function inner(node){return node.slice(node.indexOf('>')+1,node.lastIndexOf('</'));}
function mapChildren(node,transform){return attrs(node)+transform(childBlocks(inner(node))).join('\n')+node.slice(node.lastIndexOf('</'));}
function jumpNav(links,label='Recorre esta página') {
  return `<nav class="zallatel-page-route wrap" aria-label="${label}">${links.map(([id,label],i)=>`<a href="#${id}"><span aria-hidden="true">${String(i+1).padStart(2,'0')}</span>${label}</a>`).join('')}</nav>`;
}
function catalogue(section,town) {
  return mapChildren(section,nodes=>nodes.map(node=>{
    if(!hasClass(node,'service-grid'))return node;
    const cards=new Map(childBlocks(inner(node)).map(card=>[idOf(card),card]));
    assert.ok(cards.size===3||cards.size===10,'Catálogo de servicios inesperado');
    for(const service of services)if(!cards.has(service.id)) {
      const guide=guides.find(g=>g.id===service.id);assert.ok(guide);
      cards.set(service.id,`<article class="service-card" id="${service.id}" data-service-guide="${service.id}"><h3>${esc(guide.label)}${town?' en '+esc(town.name):''}</h3><span class="short">${esc(service.short)}</span><p>${esc(service.text)}</p><a class="service-detail-link" href="${guideRoute(guide)}">Ver diagnóstico y opciones de ${esc(guide.label.toLowerCase())} →</a></article>`);
    }
    let number=0;
    return '<div class="zallatel-service-groups">'+families.map(f=>`<div class="zallatel-service-family" role="group" aria-labelledby="familia-${f.id}"><div class="zallatel-family-heading"><span>${f.ids.length} ${f.ids.length===1?'servicio':'servicios'}</span><h3 id="familia-${f.id}">${f.name}</h3></div><div class="service-grid">${f.ids.map(id=>{
      const card=cards.get(id);assert.ok(card,id);
      return card.replace(/<h3>/g,'<h4>').replace(/<\/h3>/g,'</h4>').replace(/(<article\b[^>]*>)/,opening=>opening+`<span class="zallatel-service-number" aria-hidden="true">${String(++number).padStart(2,'0')}</span>`);
    }).join('')}</div></div>`).join('')+'</div>';
  }));
}
function captionGallery(node) {
  let number=0;
  return node.replace(/<figure>([\s\S]*?)<\/figure>/g,(_,body)=>{
    const alt=body.match(/<img\b[^>]*\balt="([^"]*)"/)?.[1]||'Detalle de instalación';
    return `<figure>${body}<figcaption><span>${String(++number).padStart(2,'0')}</span>${alt}</figcaption></figure>`;
  });
}
function serviceDirectory(node) {
  const cards=childBlocks(inner(node));assert.equal(cards.length,10);
  const byRoute=new Map(cards.map(card=>[card.match(/href="([^"]+)"/)?.[1],card]));
  return attrs(node)+families.map(f=>`<section class="zallatel-directory-family"><h2>${f.name}</h2><div>${f.ids.map(id=>{
    const card=byRoute.get(guideRoute(guides.find(g=>g.id===id)));assert.ok(card,id);
    return card.replace(/<h2>/g,'<h3>').replace(/<\/h2>/g,'</h3>');
  }).join('')}</div></section>`).join('')+node.slice(node.lastIndexOf('</'));
}
function guideLayout(node) {
  let first=true,check=false;
  return node.replace(/<section([^>]*)>/g,(opening,attributes)=>{
    if(first){first=false;assert.ok(!/\bid=/.test(attributes));return '<section id="sintomas-servicio"'+attributes+'>';}
    if(/class="service-faq"/.test(attributes))return '<section id="preguntas-servicio"'+attributes+'>';
    if(!check&&!/\bid=|\bclass=/.test(attributes)){check=true;return '<section id="comprobaciones-servicio"'+attributes+'>';}
    return opening;
  });
}
const signature=(html,re)=>[...html.matchAll(re)].map(m=>m[0]).sort();
function protectedMarkup(html) {
  return signature(html,/<header\b[\s\S]*?<\/header>|<title>[\s\S]*?<\/title>|<meta\b[^>]*>|<h1\b[^>]*>[\s\S]*?<\/h1>|<img\b[^>]*>|<form\b[\s\S]*?<\/form>|<script\b[\s\S]*?<\/script>/g);
}

export function organizeDocument(html,doc,town) {
  if(html.includes(`data-zallatel-flow="${FLOW_RELEASE}"`))return html;
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);assert.ok(main,doc.path);
  const blocks=childBlocks(main[1]);
  const heroes=blocks.filter(n=>hasClass(n,'hero')||hasClass(n,'service-hero'));
  const items=blocks.map((node,index)=>({node,index,rank:500}));
  const ranks=doc.type==='home'
    ? {'diagnostico-averias':20,zonas:30,servicios:40,'soluciones-satelite':50,'porteros-videoporteros':60,'cobertura-movil':70,galeria:80,'gallery-lightbox':81,experiencia:90,'pueblos-destacados':100,'antenas-zalla-enkarterri':110,preguntas:130,contacto:140}
    : doc.type==='province'
      ? {localidades:20,'diagnostico-averias':30,servicios:40,'soluciones-satelite':50,'porteros-videoporteros':60,'cobertura-movil':70,galeria:80,'gallery-lightbox':81,experiencia:90,preguntas:130,contacto:140}
      : {'servicios-en-tu-pueblo':10,'diagnostico-averias':20,'recepcion-tdt-local':30,servicios:40,'porteros-videoporteros':60,'cobertura-movil':70,'soluciones-satelite':80,'diagnostico-local':90,experiencia:100,zonas:110,'preparar-visita-local':120,preguntas:130,contacto:140};
  for(const item of items) {
    let node=item.node;const id=idOf(node);
    if(hasClass(node,'breadcrumb'))item.rank=-10;
    else if(heroes.includes(node))item.rank=0;
    else if(doc.type==='service') {
      if(hasClass(node,'service-layout'))node=guideLayout(node);
      if(hasClass(node,'service-catalogue'))node=serviceDirectory(node);
      item.rank=item.index*10;
    } else if(id&&ranks[id]!==undefined)item.rank=ranks[id];
    else if(/^<style\b/.test(node))item.rank=91;
    else if(hasClass(node,'town-antenna-showcase'))item.rank=50;
    else if(hasClass(node,'related-towns-section'))item.rank=150;
    else if(/^<section\b/.test(node))item.rank=120; // Existing preparation panel.
    else assert.fail(doc.path+': bloque sin ubicación '+attrs(node));
    if(id==='servicios')node=catalogue(node,town);
    if(id==='galeria')node=captionGallery(node);
    if(id==='servicios-en-tu-pueblo')for(const g of guides)node=node.replace(`href="${guideRoute(g)}"`,`href="#${g.id}"`);
    item.node=node;
  }
  const ordered=items.sort((a,b)=>a.rank-b.rank||a.index-b.index).map(x=>x.node);
  const menu=doc.type==='service'
    ? doc.path==='/servicios/'?'':jumpNav([['sintomas-servicio','Síntomas'],['comprobaciones-servicio','Comprobaciones'],['presupuesto','Presupuesto'],['preguntas-servicio','Preguntas']],'En esta guía')
    : doc.type==='town'?'':jumpNav(doc.type==='home'?[['diagnostico-averias','Qué falla'],['zonas','Tu provincia'],['servicios','Servicios'],['contacto','Consulta']]:[['localidades','Busca tu pueblo'],['diagnostico-averias','Qué falla'],['servicios','Servicios'],['contacto','Consulta']]);
  if(menu){const at=ordered.findIndex(n=>hasClass(n,'hero')||hasClass(n,'service-hero'));ordered.splice(at+1,0,menu);}
  const newMain=attrs(main[0]).slice(0,-1)+` data-zallatel-flow="${FLOW_RELEASE}">`+ordered.join('\n')+'</main>';
  let after=html.replace(main[0],()=>newMain);
  after=after.replace('</head>',`<link rel="stylesheet" href="/assets/zallatel-content.css?v=${FLOW_RELEASE}"></head>`);
  assert.deepEqual(protectedMarkup(after),protectedMarkup(html),doc.path+': cabecera, SEO, fotografías o formulario alterados');
  const resultMain=after.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  assert.deepEqual(childBlocks(resultMain).filter(n=>hasClass(n,'hero')||hasClass(n,'service-hero')),heroes,doc.path+': hero modificado');
  for(const paragraph of signature(html,/<p\b[^>]*>[\s\S]*?<\/p>/g))assert.ok(after.includes(paragraph),doc.path+': párrafo eliminado');
  return after;
}

export function organizeSite(root='dist') {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'public-seo-manifest.json'),'utf8'));
  const towns=JSON.parse(fs.readFileSync(path.join(root,'local-pages-manifest.json'),'utf8'));
  const byPath=new Map(towns.map(t=>[t.publicPath,t]));
  let count=0;
  for(const doc of manifest.documents.filter(d=>d.indexable)) {
    const file=path.join(root,doc.file),before=fs.readFileSync(file,'utf8');
    const after=organizeDocument(before,doc,byPath.get(doc.path));
    if(before!==after)fs.writeFileSync(file,after);
    count++;
  }
  fs.copyFileSync(new URL('../src/zallatel-content.css',import.meta.url),path.join(root,'assets/zallatel-content.css'));
  console.log(`ESTRUCTURA ZALLATEL OK: ${count} páginas; cabeceras y heroes intactos; diez servicios por localidad y contenido anterior conservado.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)organizeSite(process.env.PRODUCTION_ROOT||'dist');
