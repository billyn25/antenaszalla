import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import guide from '../content/tdt-update-guide.json' with {type:'json'};
import {DOMAIN,PHONE,TEL,BRAND,escapeHtml as esc,organizationSchema} from './public-seo.mjs';
import {displayPlaceName} from './seo-metadata.mjs';

export {guide};
export const TDT_GUIDE_ROUTE=guide.route;
export const TDT_GUIDE_RELEASE=createHash('sha256').update(JSON.stringify(guide)).update(fs.readFileSync(new URL(import.meta.url))).digest('hex').slice(0,12);
const bySource=new Map(guide.sources.map(source=>[source.id,source]));
const sourceLinks=ids=>`<p class="tdt-guide-references">Fuentes: ${ids.map(id=>{const source=bySource.get(id);if(!source)throw new Error('Fuente TDT desconocida: '+id);return `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a>`;}).join(' · ')}.</p>`;
const contact=`<a class="btn call" href="tel:${TEL}">Llamar al ${PHONE}</a>`;

// The same short guide reference is deliberately shared. It is not presented as
// evidence of municipal transmitters, reception measurements or completed work.
export function tdtGuideTeaser(townName) {
  const heading=townName?`La Séptima y UHD en ${displayPlaceName(townName)}`:'La Séptima y los nuevos canales UHD';
  return `<section class="section soft tdt-guide-teaser" id="guia-septima-uhd" data-tdt-guide-release="${TDT_GUIDE_RELEASE}"><div class="wrap"><span class="eyebrow">Guía de televisión</span><h2>${esc(heading)}</h2><p>¿No aparece La Séptima o faltan los canales UHD? Comprueba la búsqueda de canales y la compatibilidad del televisor antes de cambiar la antena.</p><a href="${TDT_GUIDE_ROUTE}">Ver guía de resintonización y compatibilidad →</a></div></section>`;
}

export function addTdtGuideTeaser(html,townName) {
  if(html.includes('id="guia-septima-uhd"'))return html;
  const teaser=tdtGuideTeaser(townName);
  // This shell content remains outside the server-rendered news markers.
  if(html.includes('<!-- BLOG_CONTENT_START -->'))return html.replace('<!-- BLOG_CONTENT_START -->',()=>teaser+'<!-- BLOG_CONTENT_START -->');
  const service=/<section\b[^>]*\bid="servicios"[^>]*>/;
  if(service.test(html))return html.replace(service,opening=>teaser+opening);
  if(!html.includes('</main>'))throw new Error('Falta main para enlazar la guía de TDT');
  return html.replace('</main>',()=>teaser+'</main>');
}

export function renderTdtGuide({header,footer,towns=[],provinces=[]}) {
  const url=DOMAIN+TDT_GUIDE_ROUTE;
  const named=['Getaria','Lekeitio','Zalla'].map(name=>towns.find(t=>t.name===name)).filter(Boolean);
  const localLinks=named.map(t=>`<a href="${esc(t.path)}">Antenista en ${esc(displayPlaceName(t.name))} →</a>`).join('');
  const provinceLinks=provinces.filter(p=>['Bizkaia','Gipuzkoa','Álava'].includes(p.name)).map(p=>`<a href="${esc(p.path)}">Todos los municipios de ${esc(p.name)} →</a>`).join('');
  const graph=[
    {'@type':'WebSite','@id':DOMAIN+'/#website',name:BRAND,url:DOMAIN+'/',publisher:{'@id':DOMAIN+'/#organizacion'}},
    organizationSchema(),
    {'@type':'WebPage','@id':url+'#page',url,name:guide.title,description:guide.description,inLanguage:'es',dateModified:guide.reviewed,isPartOf:{'@id':DOMAIN+'/#website'},publisher:{'@id':DOMAIN+'/#organizacion'},citation:guide.sources.map(source=>source.url)},
    {'@type':'BreadcrumbList',itemListElement:[['Inicio','/'],['Guía de La Séptima y TDT UHD',TDT_GUIDE_ROUTE]].map(([name,route],index)=>({'@type':'ListItem',position:index+1,name,item:DOMAIN+route}))}
  ];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(guide.title)}</title><meta name="description" content="${esc(guide.description)}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${url}"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/service-guides.css"><link rel="stylesheet" href="/assets/tdt-update-guide.css?v=${TDT_GUIDE_RELEASE}"><script src="/assets/site.js" defer></script><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script></head><body class="service-page tdt-guide-page"><a class="skip" href="#contenido">Saltar al contenido</a>${header}<main id="contenido" data-tdt-guide-release="${TDT_GUIDE_RELEASE}"><nav class="wrap breadcrumb" aria-label="Ruta de navegación"><a href="/">Inicio</a><span>/</span><span aria-current="page">La Séptima y TDT UHD</span></nav>
<section class="service-hero"><div class="wrap"><span class="eyebrow">Guía de Antenas Zalla</span><h1>${esc(guide.heading)}</h1><p>Si faltan canales después de los cambios de noviembre de 2026, empieza por la sintonización y el equipo receptor. Aquí puedes distinguir la emisión de La Séptima en HD de los canales UHD y preparar una consulta si la señal sigue fallando.</p><p class="tdt-guide-updated">Revisado el <time datetime="${guide.reviewed}">${guide.reviewedLabel}</time>.</p></div></section>
<nav class="wrap tdt-guide-index" aria-label="En esta guía"><a href="#cambios-tdt">Qué ha cambiado</a><a href="#sintonizar-septima">Buscar La Séptima</a><a href="#compatibilidad-uhd">Comprobar UHD</a><a href="#si-faltan-canales">Si siguen faltando canales</a></nav>
<article class="wrap tdt-guide-article">
<section id="cambios-tdt"><h2>Qué ha cambiado en noviembre de 2026</h2><p>La reorganización oficial se fijó para los días 3 y 5 de noviembre. La Séptima se incorpora en <strong>HD al múltiple MPE5</strong>. El bloque RGE2 utiliza DVB-T2 para las versiones UHD. Un múltiple agrupa varios canales en una misma señal; su nombre no indica la posición del mando.</p>
<div class="tdt-guide-table"><table><caption>Distribución de los principales canales afectados en la primera fase</caption><thead><tr><th scope="col">Canal</th><th scope="col">Formato</th><th scope="col">Bloque de emisión</th></tr></thead><tbody><tr><th scope="row">La Séptima y DKISS</th><td>HD</td><td>MPE5</td></tr><tr><th scope="row">Clan</th><td>HD</td><td>RGE1</td></tr><tr><th scope="row">Atreseries</th><td>HD</td><td>MPE2</td></tr><tr><th scope="row">Be Mad</th><td>HD</td><td>MPE3</td></tr><tr><th scope="row">La 1 UHD, La 2 UHD, Antena 3 UHD y Telecinco UHD</th><td>UHD</td><td>RGE2 / DVB-T2</td></tr></tbody></table></div>
<p>Esta fase conserva las versiones HD de los contenidos que se emiten también en UHD. No supone que todos los canales estatales, autonómicos y locales hayan pasado a UHD. La frecuencia radioeléctrica depende de la zona y del centro emisor.</p>${sourceLinks(['calendario','cnmc','rtve'])}</section>
<section id="sintonizar-septima"><h2>Cómo encontrar La Séptima</h2><ol class="tdt-guide-steps"><li><strong>Comprueba la entrada.</strong> Estas instrucciones son para TDT recibida por antena. Si usas un receptor externo, realiza la búsqueda en ese aparato; una aplicación o la televisión de un operador tiene su propia lista.</li><li><strong>Abre los ajustes de canales.</strong> Busca una opción como «Sintonización automática» o «Búsqueda de canales». Selecciona televisión digital por antena. El nombre del menú depende del modelo.</li><li><strong>Espera a que termine y guarda.</strong> Recorre la nueva lista para encontrar La Séptima y los demás canales. La búsqueda puede alterar el orden de tus favoritos; anótalo antes si lo necesitas.</li><li><strong>Ordena a tu gusto.</strong> Puedes colocar La Séptima en el número 7, pero esa posición es una elección de la lista, no una frecuencia universal que haya que introducir.</li></ol><p>Resintonizar actualiza los canales guardados. No repara una señal defectuosa ni añade al televisor una función de recepción que no tenga.</p>${sourceLinks(['septima','ministerio'])}</section>
<section id="compatibilidad-uhd"><h2>Qué comprobar para ver TDT en UHD</h2><div class="tdt-guide-checks"><div><h3>DVB-T2</h3><p>Es la tecnología de recepción de la señal. Busca esta compatibilidad en las especificaciones del sintonizador de tu televisor o receptor externo.</p></div><div><h3>HEVC / H.265</h3><p>Es el sistema de compresión de vídeo utilizado en las emisiones UHD. El receptor debe poder descodificarlo para mostrar la imagen.</p></div><div><h3>Pantalla y salida UHD</h3><p>Para mostrar la resolución UHD necesitas una pantalla adecuada. Si utilizas un receptor externo, comprueba también su salida y la entrada compatible del televisor.</p></div></div><p><strong>Que una pantalla anuncie 4K no confirma por sí solo que su sintonizador reciba DVB-T2 y HEVC.</strong> Consulta la referencia exacta del equipo y su manual. La Séptima se distribuye en HD en esta fase: encontrarla y recibir los canales UHD son comprobaciones diferentes.</p><p>Si tu equipo sigue recibiendo las versiones HD, el cambio de esta primera fase no obliga por sí solo a sustituirlo. Valora un receptor compatible o una renovación cuando quieras acceder a UHD y hayas comprobado las conexiones.</p>${sourceLinks(['tecnologia','calendario'])}</section>
<section id="si-faltan-canales"><h2>Qué hacer si siguen faltando canales</h2><dl class="tdt-guide-diagnosis"><dt>No aparece La Séptima tras la búsqueda</dt><dd>Anota si recibes DKISS y otros canales del bloque MPE5. Compara con otro televisor conectado a la misma instalación. Esa información ayuda a separar la lista del receptor de un problema de recepción o distribución.</dd><dt>Se ven los canales HD, pero no los UHD</dt><dd>Revisa primero DVB-T2 y HEVC en el modelo exacto. Si es compatible, conviene comprobar la recepción del bloque RGE2 en esa dirección antes de elegir recambios.</dd><dt>El canal aparece, pero no tiene imagen o sonido</dt><dd>Guarda el mensaje de pantalla y el nombre completo del canal, incluido HD o UHD. Revisa el manual del equipo; una entrada guardada no demuestra que el receptor pueda reproducirla.</dd><dt>El fallo afecta a varios vecinos o a varias tomas</dt><dd>Comunícalo al responsable de la comunidad y reúne los canales afectados. La revisión puede comparar señal de entrada, cabecera y tomas para localizar dónde se degrada.</dd></dl><p>No elijas una antena o un amplificador solo porque falte un canal. La decisión debe partir del equipo, la cobertura de esa dirección y, cuando proceda, de mediciones. La guía de <a href="/servicios/reparacion-antenas-tdt/">averías de TDT</a> explica qué se comprueba; la de <a href="/servicios/amplificadores-antena/">amplificación y distribución</a> desarrolla la instalación interior.</p></section>
<section id="consulta-por-localidad"><h2>Consulta por tu pueblo y tu instalación</h2><p>En una consulta desde Getaria, Lekeitio o cualquier otra localidad, indica la dirección o el núcleo, el modelo del televisor, los canales que faltan y si el problema empezó antes o después de resintonizar. Un mismo municipio puede tener situaciones de recepción diferentes.</p><div class="tdt-guide-local-links">${localLinks}${provinceLinks}<a href="/#zonas">Buscar otras provincias y municipios →</a></div><p>Si necesitas una revisión, acuerda antes disponibilidad, desplazamiento y alcance del diagnóstico.</p><div class="actions">${contact}<a class="btn" href="/servicios/reparacion-antenas-tdt/">Consultar revisión de TDT</a></div></section>
<section class="tdt-guide-sources" id="fuentes"><h2>Fuentes y fecha de revisión</h2><p>Información contrastada el ${guide.reviewedLabel}. Consulta los avisos de cada cadena y las fuentes oficiales para cambios posteriores.</p><ul>${guide.sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)} ↗</a> <time datetime="${source.date}">(${source.date.split('-').reverse().join('/')})</time></li>`).join('')}</ul></section>
</article></main>${footer}</body></html>`;
}

export function buildTdtUpdateGuide(root=process.env.PRODUCTION_ROOT||'dist') {
  root=path.resolve(root);
  const towns=JSON.parse(fs.readFileSync(path.join(root,'local-pages-manifest.json'),'utf8'));
  const provinces=[...new Map(towns.map(t=>[t.province,{name:t.province,path:t.path.slice(0,t.path.lastIndexOf('/')+1)}])).values()];
  const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const header=home.match(/<header\b[\s\S]*?<\/header>/)?.[0]?.replace(/href="#/g,'href="/#');
  const footer=home.match(/<footer\b[\s\S]*?<\/footer>/)?.[0]?.replace(/href="#/g,'href="/#');
  if(!header||!footer)throw new Error('No se pudo reutilizar la identidad para la guía TDT');
  const file=path.join(root,TDT_GUIDE_ROUTE.slice(1),'index.html');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,renderTdtGuide({header,footer,towns,provinces}));
  const pages=[{file:'index.html'},...towns.map(t=>({file:t.path.slice(1),name:t.name})),...provinces.map(p=>({file:p.path.slice(1)+'index.html'})),{file:'servicios/index.html'},{file:'servicios/reparacion-antenas-tdt/index.html'},{file:'servicios/amplificadores-antena/index.html'},{file:'blog/index.html'}];
  for(const page of pages){
    const local=path.join(root,page.file);
    let html=addTdtGuideTeaser(fs.readFileSync(local,'utf8'),page.name);
    if(!html.includes('/assets/tdt-update-guide.css'))html=html.replace('</head>',`<link rel="stylesheet" href="/assets/tdt-update-guide.css?v=${TDT_GUIDE_RELEASE}"></head>`);
    fs.writeFileSync(local,html);
  }
  fs.writeFileSync(path.join(root,'assets/tdt-update-guide.css'),TDT_GUIDE_CSS);
  console.log(`GUÍA TDT OK: La Séptima y UHD con fuentes oficiales, ${towns.length} accesos locales y enlaces desde provincias, portada, servicios y blog.`);
}

export const TDT_GUIDE_CSS=`
.tdt-guide-teaser{padding-block:28px}.tdt-guide-teaser h2{font-size:clamp(22px,2.6vw,30px);margin-bottom:10px}.tdt-guide-teaser p{max-width:85ch;line-height:1.7;margin:0 0 10px}.tdt-guide-teaser a{display:inline-block;min-height:44px;padding-block:10px;font-weight:750;overflow-wrap:anywhere}
.tdt-guide-updated{font-size:14px!important}.tdt-guide-index{display:flex;flex-wrap:wrap;gap:8px 16px;padding-block:20px;border-bottom:1px solid var(--line)}.tdt-guide-index a{display:flex;align-items:center;min-height:44px;font-weight:700;overflow-wrap:anywhere}.tdt-guide-article{max-width:1000px;padding-block:32px}.tdt-guide-article>section{margin-bottom:40px;scroll-margin-top:110px}.tdt-guide-article p,.tdt-guide-article li,.tdt-guide-article dd{line-height:1.8}.tdt-guide-article h2{max-width:30ch}.tdt-guide-references{font-size:13px;color:var(--muted);overflow-wrap:anywhere}.tdt-guide-references a{text-decoration:underline;text-underline-offset:3px}.tdt-guide-table{width:100%;margin:22px 0}.tdt-guide-table table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:15px}.tdt-guide-table caption{text-align:left;font-weight:700;margin-bottom:12px}.tdt-guide-table th,.tdt-guide-table td{padding:13px 12px;border:1px solid var(--line);text-align:left;vertical-align:top;overflow-wrap:anywhere;line-height:1.6}.tdt-guide-table thead th{background:var(--soft)}.tdt-guide-table th:first-child{width:48%}.tdt-guide-table th:nth-child(2){width:20%}.tdt-guide-steps{padding-left:25px}.tdt-guide-steps li{padding:0 0 14px 5px}.tdt-guide-checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.tdt-guide-checks>div{padding:20px;border:1px solid var(--line);border-radius:10px;background:var(--soft);min-width:0}.tdt-guide-checks h3{margin:0 0 10px}.tdt-guide-checks p{font-size:15px;margin:0}.tdt-guide-diagnosis{margin:20px 0}.tdt-guide-diagnosis dt{font-weight:750;margin-top:18px}.tdt-guide-diagnosis dd{margin:5px 0 0;color:var(--muted)}.tdt-guide-local-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 20px}.tdt-guide-local-links a{display:flex;align-items:center;min-height:44px;padding-block:8px;overflow-wrap:anywhere;font-weight:700}.tdt-guide-sources{border-top:1px solid var(--line);padding-top:28px}.tdt-guide-sources li{margin-bottom:12px;font-size:14px;overflow-wrap:anywhere}.tdt-guide-sources time{color:var(--muted);white-space:nowrap}
@media(max-width:760px){.tdt-guide-checks{grid-template-columns:1fr}.tdt-guide-local-links{grid-template-columns:1fr}.tdt-guide-table table{font-size:13px}.tdt-guide-table th,.tdt-guide-table td{padding:10px 8px}.tdt-guide-index{gap:3px 15px}.tdt-guide-article{padding-block:26px}}
`;

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)buildTdtUpdateGuide();
