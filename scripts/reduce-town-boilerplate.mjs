import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// Consolidate repeated explanations; do not invent municipal faults or hide copy.
const release='20261022';
export const EDITORIAL_CSS='\n.editorial-single-work{grid-template-columns:1fr!important;max-width:900px}.editorial-single-work article{border-left:0!important}.mobile-coverage>.wrap>.section-lead{max-width:920px}\n';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
export function replaceSection(html,id,transform){
 const token=new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
 if(!token)return html;
 const tags=/<\/?section\b[^>]*>/g;tags.lastIndex=token.index;let depth=0,end;
 for(let m;(m=tags.exec(html));){depth+=m[0].startsWith('</')?-1:1;if(depth===0){end=tags.lastIndex;break;}}
 assert(end,`Sección sin cerrar: ${id}`);
 return html.slice(0,token.index)+transform(html.slice(token.index,end))+html.slice(end);
}
const coverage=[
 ['La prueba empieza junto al router','Para distinguir acceso móvil y red interior, se compara una conexión por cable con el uso por wifi. El presupuesto depende del punto donde cae el rendimiento, del equipo y del recorrido de red.'],
 ['Antes de elegir una antena para datos','Se identifica la referencia del router y sus entradas de antena. Después se valora si la recepción exterior compensa las pérdidas del cable y dónde quedaría el terminal para mantenerlo accesible.'],
 ['Qué indicar si las llamadas se cortan','Describe si sucede dentro o fuera de casa y con qué operador. Resolver el acceso de un router y mejorar las llamadas requiere soluciones distintas; un repetidor solo se plantea verificando autorización y condiciones del operador.'],
 ['Del punto de entrada a cada habitación','La revisión separa la velocidad de acceso de la cobertura inalámbrica. Para ampliar la red se concretan ubicación de puntos de acceso, cableado, alimentación y comprobación del enlace hasta el usuario.'],
 ['Comprobar estabilidad antes de fijar el equipo','Se comparan varias ubicaciones sin cambiar a la vez todos los parámetros. Conviene conservar las observaciones de cada prueba para decidir emplazamiento, paso de cable y material compatible.'],
 ['Qué equipo conviene identificar en la consulta','Facilita modelo de router, operador y tipo de conexión. Esos datos permiten estudiar si el equipo admite antena exterior o si hace falta intervenir únicamente en la red de la vivienda.']
];
export function reduceTown(html,page){
 if(html.includes(`data-editorial-consolidation="${release}"`))return html;
 const metadata=html.match(/<title>[\s\S]*?<\/title>|<h1[^>]*>[\s\S]*?<\/h1>|<meta name="description"[^>]*>|<link rel="canonical"[^>]*>/g);
 const images=html.match(/<img\b[^>]*>/g)||[];
 const key=page.municipioId||page.path;
 // The three work types remain reachable; develop one instead of repeating all three twice.
 html=replaceSection(html,'porteros-videoporteros',block=>{
  const work=block.match(/<div class="doorphone-work">([\s\S]*?)<\/div>/);
  if(!work)return block;
  const articles=[...work[1].matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(m=>m[0]);
  if(articles.length<2)return block;
  const selected=articles[hash(key+':access')%articles.length];
  block=block.replace(work[0],`<div class="doorphone-work editorial-single-work">${selected}</div>`);
  block=block.replace(/<p class="doorphone-note">[\s\S]*?<\/p>/,'');
  return block;
 });
 html=replaceSection(html,'cobertura-movil',()=>{
  const [heading,text]=coverage[hash(key+':network')%coverage.length];
  return `<section class="mobile-coverage section" id="cobertura-movil"><div class="wrap"><span class="eyebrow">Conectividad en ${esc(page.name)}</span><h2>${esc(heading)}</h2><p class="section-lead">${esc(text)}</p><a href="#contacto" data-contact-service="cobertura-movil-servicio">Consultar mi instalación →</a></div></section>`;
 });
 html=replaceSection(html,'experiencia',block=>{
  // Retain requested stars and manufacturer names as a concise reference, not a second sales section.
  const brands=[...block.matchAll(/<span>(Televés|Alcad|Ikusi|Fagor|Rover|EK|FTE Maximal|Fringe|Fermax|Tegui|Golmar|Comelit|BTicino|Legrand|Galak)<\/span>/g)].map(m=>m[1]);
  const unique=[...new Set(brands)];const start=hash(key+':brands')%Math.max(1,unique.length);
  const chosen=[...unique.slice(start),...unique.slice(0,start)].slice(0,4);
  const stars=block.match(/<div class="stars"[^>]*>[\s\S]*?<\/div>/)?.[0]||'';
  return `<section class="trust section soft" id="experiencia"><div class="wrap"><h2>Compatibilidad del equipo existente</h2>${stars}<p>Para elegir recambio necesitamos la tecnología de la instalación, además de marca y modelo. ${chosen.length?`Referencias que podemos identificar: ${chosen.map(esc).join(', ')}.`:''}</p></div></section>`;
 });
 // The technical block already covers these generic local-intent summaries. Keep the
 // section and its anchors as a compact navigation aid, rather than duplicate paragraphs.
 html=replaceSection(html,'servicio-local',block=>block.replace(/<article([^>]*)>([\s\S]*?)<\/article>/g,(_,attrs,body)=>{
  const heading=body.match(/<h3>[\s\S]*?<\/h3>/)?.[0]||'';
  return `<article${attrs}>${heading}<a href="#contacto">Consultar este trabajo →</a></article>`;
 }).replace(/<p class="section-lead">[\s\S]*?<\/p>/,'').replace(/<div class="local-faq">[\s\S]*?<\/div>/,''));
 // Keep one useful observation per fault and link to the full guide.
 html=replaceSection(html,'diagnostico-averias',block=>block.replace(/<article([^>]*)>([\s\S]*?)<\/article>/g,(_,attrs,body)=>{
  const details=[...body.matchAll(/<details>[\s\S]*?<\/details>/g)].map(m=>m[0]);
  if(details.length<2)return `<article${attrs}>${body}</article>`;
  const chosen=hash(key+attrs+':symptom')%details.length;let i=0;
  body=body.replace(/<details>[\s\S]*?<\/details>/g,()=>i++===chosen?details[chosen]:'');
  return `<article${attrs}>${body}</article>`;
 }));
 html=replaceSection(html,'soluciones-satelite',block=>block.replace(/<ul>[\s\S]*?<\/ul>/g,'').replace(/<p>(?!<strong)[\s\S]*?<\/p>/g,''));
 html=html.replace(/<aside class="zallatel-intake">[\s\S]*?<\/aside>/,'');
 html=replaceSection(html,'preparar-visita-local',block=>block.replace(/<ul class="local-visit-checklist">[\s\S]*?<\/ul>/,'<p>Antes de aceptar la visita, concreta desplazamiento, diagnóstico, materiales y disponibilidad para tu dirección.</p>'));
 const antennaNotes=[
  ['Dipolo activo o pasivo: decidir con medición','Un sistema activo necesita alimentación compatible y margen frente a señales fuertes. Se compara la recepción con la etapa activa y sin amplificación antes de elegir antena, fuente y nivel de salida.'],
  ['Cuando hay potencia pero la imagen se rompe','Se revisan MER y BER junto al nivel. Una antena con más ganancia o un amplificador mayor puede empeorar una entrada saturada; el ajuste se comprueba también en las tomas.'],
  ['Orientación y señales que llegan por varios caminos','Los rebotes y las señales de otros centros requieren comparar orientación y calidad. Se valoran directividad y emplazamiento con mediciones, sin dar por hecho que basta cambiar el modelo de antena.'],
  ['La bajada de cable forma parte de la recepción','Cubierta de exterior, conectores protegidos y sujeciones evitan deterioros prematuros. Si entra agua en el coaxial se revisa el tramo afectado y su conexión; orientar la antena no repara ese recorrido.'],
  ['La señal puede perder calidad dentro de la cabecera','Se comparan entrada y salida de fuente, central o módulos antes de sustituir la antena. El equilibrio de los múltiplex y las pérdidas posteriores deben quedar dentro del margen de trabajo.'],
  ['Elegir filtro después de identificar la interferencia','Una pixelación no demuestra interferencia móvil. Se mide la entrada y se estudia filtrado solo cuando corresponde, considerando dónde colocarlo y las frecuencias que debe conservar la instalación.'],
  ['Comparar la primera y la última toma','Una recepción correcta en cubierta puede degradarse por repartidores, derivadores o conexiones interiores. Las mediciones en distintos puntos permiten localizar el tramo y evitar cambiar una antena que funciona.'],
  ['Soporte, fijación y acceso para montar la antena','El montaje incluye valorar mástil, anclajes, recorrido del coaxial y acceso seguro. La elección de una antena no sustituye comprobar que el conjunto pueda quedar fijado y mantenerse después.']
 ];
 const [antennaTitle,antennaText]=antennaNotes[hash(key+':antenna-check')%antennaNotes.length];
 html=html.replace(/(<div class="town-antenna-copy">)([\s\S]*?)(<\/div><\/div><\/section>)/,(_,open,body,close)=>{
  const note=body.match(/<p class="town-antenna-note">[\s\S]*?<\/p>/)?.[0]||'';
  return open+`<span class="eyebrow">Revisión de la instalación</span><h2>${esc(antennaTitle)}</h2><p>${esc(antennaText)}</p>`+note+close;
 });
 // This preparation panel duplicates the later, more useful local visit checklist.
 html=html.replace('<section class="section soft"><div class="wrap two-col">','<section class="section soft" id="editorial-old-intake"><div class="wrap two-col">');
 html=replaceSection(html,'editorial-old-intake',()=> '');
 html=html.replace('<main id="contenido"',`<main data-editorial-consolidation="${release}" id="contenido"`);
 assert.deepEqual(html.match(/<title>[\s\S]*?<\/title>|<h1[^>]*>[\s\S]*?<\/h1>|<meta name="description"[^>]*>|<link rel="canonical"[^>]*>/g),metadata,`${page.path}: metadatos`);
 assert.deepEqual(html.match(/<img\b[^>]*>/g)||[],images,`${page.path}: fotografías`);
 return html;
}
export function apply(root='dist'){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'local-pages-manifest.json'),'utf8'));
 for(const page of manifest){const file=path.join(root,page.path.slice(1));fs.writeFileSync(file,reduceTown(fs.readFileSync(file,'utf8'),page));}
 fs.appendFileSync(path.join(root,'assets/site.css'),EDITORIAL_CSS);
 console.log(`CONSOLIDACIÓN EDITORIAL OK: ${manifest.length} pueblos; metadatos, fotos, servicios y contacto conservados.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)apply();
