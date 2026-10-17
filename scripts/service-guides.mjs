import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import guides from '../content/service-guides.json' with {type:'json'};
import services from '../content/services.json' with {type:'json'};
import {DOMAIN,PHONE,TEL,BRAND,escapeHtml as esc,publicPath} from './public-seo.mjs';
export {guides};
export const guideRoute = g => `/servicios/${g.slug}/`;
export const SERVICE_RELEASE = createHash('sha256').update(JSON.stringify(guides)).update(fs.readFileSync(new URL(import.meta.url))).digest('hex').slice(0,12);
const byId = new Map(guides.map(g=>[g.id,g]));
const wa = (g,town) => 'https://wa.me/34670042626?text='+encodeURIComponent(`Hola, necesito consultar ${g.label.toLowerCase()}${town?` en ${town.name}, ${town.province}`:''}. Tipo de inmueble: . El problema es: .`);
const actions = (g,town) => `<div class="actions"><a class="btn call" href="tel:${TEL}">Llamar ${PHONE}</a><a class="btn wa" href="${esc(wa(g,town))}">Consultar por WhatsApp</a></div>`;
const paragraphs = rows => rows.map(([heading,text])=>`<section><h2>${esc(heading)}</h2><p>${esc(text)}</p></section>`).join('');
const schema = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script>`;

export function enhanceServiceCards(html,town) {
  const counts = new Map();
  html=html.replace(/<article class="service-card" id="([^"]+)"(?:\s[^>]*)?>([\s\S]*?)<\/article>/g,(block,id,body)=>{
    const g=byId.get(id);
    if(!g) return block;
    counts.set(id,(counts.get(id)||0)+1);
    if(block.includes('data-service-guide=')) return block;
    if(town) {
      body=body.replace(/<h3>[\s\S]*?<\/h3>/,`<h3>${esc(g.label)} en ${esc(town.name)}</h3>`);
      // Three observations that help the technician delimit the job, rather than a location-name rewrite.
      const details=`<details class="town-service-detail"><summary>Qué revisar y cómo preparar el aviso</summary><dl>${g.symptoms.map(([symptom,advice])=>`<dt>${esc(symptom)}</dt><dd>${esc(advice)}</dd>`).join('')}</dl><p><strong>Para consultar:</strong> ${g.intake.map(esc).join(' ')}</p></details>`;
      body=body.replace(/<a href="https:\/\/wa\.me\/[^\"]*">Consultar este servicio →<\/a>/,`${details}<a class="service-enquiry" href="${esc(wa(g,town))}">Consultar en ${esc(town.name)} →</a>`);
    }
    return `<article class="service-card" id="${id}" data-service-guide="${g.id}">${body}<a class="service-detail-link" href="${guideRoute(g)}">Ver diagnóstico y opciones de ${esc(g.label.toLowerCase())} →</a></article>`;
  });
  for(const g of guides) if(counts.get(g.id)!==1) throw new Error(`Se esperaba una ficha de ${g.id}${town?' en '+town.name:''}`);
  if(!html.includes('id="service-catalogue-link"')) html=html.replace('<div class="service-grid">','<p id="service-catalogue-link"><a href="/servicios/">Información completa de los nueve servicios →</a></p><div class="service-grid">');
  return html;
}

export function enhanceTown(html,town) {
  html=html.replace(/<main id="contenido"(?: data-service-release="[^"]*")?>/,`<main id="contenido" data-service-release="${SERVICE_RELEASE}">`);
  html=enhanceServiceCards(html,town);
  if(!html.includes('id="servicios-en-tu-pueblo"')) {
    const menu=`<nav class="town-service-menu wrap" id="servicios-en-tu-pueblo" aria-label="Servicios en ${esc(town.name)}"><strong>¿Qué necesitas en ${esc(town.name)}?</strong><div>${guides.map(g=>`<a href="#${g.id}">${esc(g.label)}</a>`).join('')}</div></nav>`;
    const marker='</section><div class="strip">';
    if(!html.includes(marker)) throw new Error(`${town.path}: falta posición del selector de servicio`);
    html=html.replace(marker,'</section>'+menu+'<div class="strip">');
  }
  if(!html.includes('id="preparar-visita-local"')) {
    const budget=`<section class="section soft" id="preparar-visita-local"><div class="wrap"><span class="eyebrow">Tu aviso en ${esc(town.province)}</span><h2>Antes de organizar la visita a ${esc(town.name)}</h2><div class="local-visit-grid"><div><h3>Ubicación y acceso</h3><p>Indica la dirección o el núcleo concreto dentro de ${esc(town.name)} y si se trata de una vivienda, una comunidad o un negocio. Para zonas comunes, confirma quién puede facilitar el acceso y coordinar las comprobaciones.</p></div><div><h3>Condiciones del presupuesto</h3><p>Consulta desplazamiento, diagnóstico, materiales e impuestos. Si hacen falta trabajos de acceso o recorridos especiales, deben concretarse antes de aceptar. La propuesta distingue reparar el fallo de renovar o ampliar la instalación.</p></div><div><h3>Comprobación del trabajo</h3><p>Acuerda qué tomas, equipos o funciones se probarán después: recepción de TV, llamada, conversación, imagen o apertura, según el servicio. La revisión se adapta al tipo de inmueble y a los equipos existentes.</p></div></div><p>Disponibilidad y condiciones de atención en ${esc(town.name)}: <a href="tel:${TEL}">${PHONE}</a>.</p></div></section>`;
    const marker='<section class="section wrap faq" id="preguntas">';
    if(!html.includes(marker)) throw new Error(`${town.path}: falta sección de preguntas`);
    html=html.replace(marker,budget+marker);
  }
  // The catalogue points to real service information, without fictitious branches, prices or ratings.
  html=html.replace(/(<script[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,(_,open,raw,close)=>{
    const data=JSON.parse(raw);
    for(const entity of data['@graph']||[data]) if(entity['@type']==='Service') {
      entity.serviceType=guides.map(g=>g.name);
      entity.hasOfferCatalog={'@type':'OfferCatalog',name:`Servicios en ${town.name}, ${town.province}`,itemListElement:guides.map(g=>({'@type':'Offer',itemOffered:{'@type':'Service','@id':DOMAIN+guideRoute(g)+'#servicio',name:g.name,url:DOMAIN+guideRoute(g)}}))};
    }
    return open+JSON.stringify(data).replace(/</g,'\\u003c')+close;
  });
  return html;
}

function related(g) {
  return `<section class="service-related"><h2>Otros servicios relacionados</h2><div>${g.related.map(id=>{const r=byId.get(id);return `<a href="${guideRoute(r)}">${esc(r.label)} →</a>`;}).join('')}<a href="/servicios/">Todos los servicios →</a></div></section>`;
}
function coverage(provinces) {
  return `<section class="service-coverage"><h2>Consulta el servicio en tu pueblo</h2><p>Selecciona la provincia y tu localidad para preparar el aviso. Confirma disponibilidad, desplazamiento y alcance de la intervención antes de concertar la visita.</p><div>${provinces.map(p=>`<a href="${publicPath(p.path)}">${esc(p.name)} →</a>`).join('')}</div></section>`;
}

export function buildServiceGuides(root='dist') {
  root=path.resolve(root);
  if(guides.length!==services.length || guides.some(g=>!services.some(s=>s.id===g.id))) throw new Error('El catálogo no coincide con los servicios existentes');
  const towns=JSON.parse(fs.readFileSync(path.join(root,'local-pages-manifest.json'),'utf8'));
  const provinces=[...new Map(towns.map(t=>[t.province,{name:t.province,path:t.path.slice(0,t.path.lastIndexOf('/')+1)}])).values()];
  const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const header=home.match(/<header\b[\s\S]*?<\/header>/)?.[0]?.replace(/href="#/g,'href="/#');
  const footer=home.slice(home.indexOf('<footer')).replace(/<script id="zalla-gallery-script">[\s\S]*?<\/script>/,'');
  if(!header||!footer.includes('</html>')) throw new Error('No se pudo reutilizar la identidad de la web');
  const wrap=(route,title,description,content,g)=>{
    const url=DOMAIN+route;
    const graph=[{'@type':'WebSite','@id':DOMAIN+'/#website',name:BRAND,alternateName:'Antenas Zalla',url:DOMAIN+'/'},{'@type':'Organization','@id':DOMAIN+'/#organizacion',name:BRAND,alternateName:'Antenas Zalla',url:DOMAIN+'/',telephone:TEL},{'@type':g?'WebPage':'CollectionPage','@id':url+'#page',name:title,description,url,isPartOf:{'@id':DOMAIN+'/#website'},...(g?{mainEntity:{'@id':url+'#servicio'}}:{})},{'@type':'BreadcrumbList',itemListElement:[['Inicio','/'],['Servicios','/servicios/'],...(g?[[g.label,route]]:[])].map(([name,p],i)=>({'@type':'ListItem',position:i+1,name,item:DOMAIN+p}))}];
    if(g) graph.push({'@type':'Service','@id':url+'#servicio',name:g.name,serviceType:g.name,url,description,provider:{'@id':DOMAIN+'/#organizacion'},areaServed:provinces.map(p=>({'@type':'AdministrativeArea',name:p.name}))});
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${url}"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/service-guides.css?v=${SERVICE_RELEASE}"><script src="/assets/site.js" defer></script>${schema({'@context':'https://schema.org','@graph':graph})}</head><body class="service-page"><a class="skip" href="#contenido">Saltar al contenido</a>${header}<main id="contenido" data-service-release="${SERVICE_RELEASE}"><nav class="wrap breadcrumb" aria-label="Ruta de navegación"><a href="/">Inicio</a><span>/</span>${g?'<a href="/servicios/">Servicios</a><span>/</span>':'<span aria-current="page">Servicios</span>'}${g?`<span aria-current="page">${esc(g.label)}</span>`:''}</nav>${content}</main>${footer}`;
  };
  const write=(route,html)=>{const file=path.join(root,route.slice(1),'index.html');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);};
  for(const g of guides) {
    const title=`${g.name} | ${PHONE}`;
    const description=`${g.label}: averías, revisión, opciones de instalación y qué concretar en el presupuesto. Viviendas y comunidades. Antenas Zallatel: ${PHONE}.`;
    const content=`<section class="service-hero"><div class="wrap"><span class="eyebrow">Instalación, diagnóstico y reparación</span><h1>${esc(g.name)}</h1><p>${esc(g.intro)}</p>${actions(g)}</div></section><div class="wrap service-layout"><article><section><h2>Qué ocurre y qué información ayuda</h2><div class="service-symptoms">${g.symptoms.map(([symptom,advice])=>`<div><h3>${esc(symptom)}</h3><p>${esc(advice)}</p></div>`).join('')}</div></section>${paragraphs(g.checks)}<section class="service-budget" id="presupuesto"><h2>Qué concretar en el presupuesto</h2><p>${esc(g.budget)}</p></section><section class="service-faq"><h2>Preguntas sobre ${esc(g.label.toLowerCase())}</h2>${g.faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>${related(g)}${g.sources.length?`<section class="service-sources"><h2>Información técnica para ampliar la consulta</h2><p>Referencias de fabricantes y organismos sobre los equipos o sistemas descritos.</p>${g.sources.map(([label,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join('')}</section>`:''}</article><aside><div class="service-intake"><h2>Prepara tu consulta</h2><p>Indica el pueblo y estos datos:</p><ul>${g.intake.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${actions(g)}</div></aside></div><div class="wrap">${coverage(provinces)}<section class="service-contact" id="contacto"><h2>Consulta tu instalación</h2><p>Cuéntanos el servicio que necesitas y tu localidad. El alcance y las condiciones se acuerdan para cada instalación.</p>${actions(g)}</section></div>`;
    write(guideRoute(g),wrap(guideRoute(g),title,description,content,g));
  }
  write('/servicios/',wrap('/servicios/',`Antenas, porteros y videoporteros: servicios | ${PHONE}`,`Servicios de Antenas Zallatel: TDT, parabólicas, amplificación, porteros, videoporteros y cobertura móvil. Consulta diagnóstico y presupuesto. ${PHONE}.`,`<section class="service-hero"><div class="wrap"><span class="eyebrow">Servicios de Antenas Zallatel</span><h1>¿Qué necesitas resolver en tu instalación?</h1><p>Elige el servicio para conocer qué se revisa, cómo preparar el aviso y qué conviene acordar antes del trabajo.</p></div></section><div class="wrap service-catalogue">${guides.map(g=>`<article><h2><a href="${guideRoute(g)}">${esc(g.name)}</a></h2><p>${esc(g.intro)}</p><a href="${guideRoute(g)}">Ver diagnóstico, instalación y presupuesto →</a></article>`).join('')}</div><div class="wrap">${coverage(provinces)}</div>`));
  let townCount=0;
  for(const town of towns) {
    const file=path.join(root,town.path.slice(1));
    fs.writeFileSync(file,enhanceTown(fs.readFileSync(file,'utf8'),town));townCount++;
  }
  // The province and home cards also link to the same detailed service, without duplicating service URLs by town.
  for(const route of ['/',...provinces.map(p=>p.path)]) {
    const file=path.join(root,route==='/'?'index.html':route.slice(1)+'index.html');
    fs.writeFileSync(file,enhanceServiceCards(fs.readFileSync(file,'utf8')));
  }
  const files=['index.html',...towns.map(t=>t.path.slice(1)),...provinces.map(p=>p.path.slice(1)+'index.html')];
  for(const rel of files) {
    const file=path.join(root,rel);let html=fs.readFileSync(file,'utf8');
    if(!html.includes('/assets/service-guides.css')) html=html.replace('</head>',`<link rel="stylesheet" href="/assets/service-guides.css?v=${SERVICE_RELEASE}"></head>`);
    fs.writeFileSync(file,html);
  }
  fs.writeFileSync(path.join(root,'assets/service-guides.css'),SERVICE_CSS);
  console.log(`SERVICIOS LOCALES OK: ${townCount} pueblos con nueve fichas ampliadas, consultas contextualizadas y presupuesto; nueve guías e índice de servicios.`);
}

export const SERVICE_CSS=`
.service-detail-link{display:block!important;margin-top:14px;padding:12px 0 0;border-top:1px solid var(--line);font-size:14px;line-height:1.5;overflow-wrap:anywhere}
.town-service-detail{margin-top:15px;border-top:1px solid var(--line);padding-top:12px;font-size:14px}
.town-service-detail summary{font-weight:750;cursor:pointer;min-height:44px;line-height:1.45}
.town-service-detail dl{margin:10px 0}.town-service-detail dt{font-weight:750;margin:12px 0 3px}.town-service-detail dd{margin:0;color:var(--muted);line-height:1.65}.town-service-detail p{font-size:14px!important}
.town-service-menu{padding-block:23px}.town-service-menu strong{display:block;font-size:20px;margin-bottom:12px}.town-service-menu>div{display:flex;flex-wrap:wrap;gap:8px}.town-service-menu a{display:flex;align-items:center;min-height:44px;padding:9px 13px;border:1px solid var(--line);border-radius:7px;color:var(--ink);font-size:13px;font-weight:750;max-width:100%;overflow-wrap:anywhere}
.local-visit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}.local-visit-grid h3{font-size:19px;line-height:1.35}.local-visit-grid p{font-size:15px;color:var(--muted);line-height:1.75}
.service-hero{padding:40px 0;background:var(--soft);border-bottom:1px solid var(--line)}.service-hero h1{max-width:1000px;font-size:clamp(30px,4vw,50px);line-height:1.12}.service-hero p{max-width:850px;line-height:1.8;color:#4d4e52}.service-hero .actions{margin-top:24px}
.service-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(240px,1fr);gap:44px;padding-block:36px}.service-layout>article,.service-layout>aside{min-width:0}.service-page h2{font-size:clamp(23px,2.7vw,30px);line-height:1.25;margin:0 0 18px}.service-page h3{font-size:18px;line-height:1.4}.service-layout article>section{margin-bottom:36px;scroll-margin-top:110px}.service-page p{line-height:1.8}.service-symptoms{border:1px solid var(--line);border-radius:10px;overflow:hidden}.service-symptoms>div{padding:18px 22px}.service-symptoms>div+div{border-top:1px solid var(--line)}.service-symptoms h3{margin:0 0 5px}.service-symptoms p{margin:0;color:var(--muted)}
.service-budget,.service-intake{padding:24px;background:var(--soft);border:1px solid var(--line);border-radius:10px}.service-budget p{margin-bottom:0}.service-intake h2{font-size:23px}.service-intake li{margin-bottom:14px;line-height:1.7}.service-intake ul{padding-left:20px}.service-intake .btn{width:100%;font-size:14px}
.service-faq details{border-top:1px solid var(--line);padding:15px 0}.service-faq summary{cursor:pointer;font-weight:750;min-height:44px}.service-faq details p{color:var(--muted)}
.service-related>div,.service-coverage>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.service-related a,.service-coverage a{display:flex;align-items:center;min-height:48px;padding:12px 15px;border:1px solid var(--line);border-radius:7px;font-weight:700;overflow-wrap:anywhere}.service-sources a{display:block;min-height:44px;padding:8px 0;overflow-wrap:anywhere;font-size:14px}.service-sources p{font-size:14px;color:var(--muted)}
.service-coverage,.service-contact{padding-block:32px;border-top:1px solid var(--line)}.service-coverage p{max-width:850px;color:var(--muted)}.service-contact .actions{margin-top:20px}.service-catalogue{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;padding-block:32px}.service-catalogue article{padding:25px;border:1px solid var(--line);border-top:3px solid var(--brand);border-radius:10px;min-width:0}.service-catalogue h2{font-size:24px}.service-catalogue p{color:var(--muted)}.service-catalogue article>a{display:block;padding-block:10px;font-weight:750}
@media(max-width:900px){.service-layout{grid-template-columns:minmax(0,1fr);gap:12px}.service-intake{margin-bottom:20px}.local-visit-grid{grid-template-columns:1fr;gap:10px}}
@media(max-width:600px){.service-hero{padding:28px 0}.service-layout{padding-block:26px}.service-catalogue,.service-related>div,.service-coverage>div{grid-template-columns:minmax(0,1fr)}.service-catalogue article{padding:20px}.service-layout .service-budget,.service-intake{padding:20px}.service-page .actions .btn{flex:1 1 170px;min-width:0;padding:13px}.town-service-menu strong{font-size:18px}.town-service-menu a{font-size:12px;padding:9px 10px}}
`;
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) buildServiceGuides();
