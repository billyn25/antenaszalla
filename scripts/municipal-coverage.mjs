// Editorial additions to the geographical baseline. Codes preserve the existing
// municipality identity even when a bilingual or historical name is displayed.
export const BASQUE_COVERAGE_PRIORITIES=[
 {code:'48086',name:'Sopuerta',province:'Bizkaia',reason:'Entorno de Zalla y Encartaciones'},
 {code:'48022',name:'Karrantza Harana/Valle de Carranza',province:'Bizkaia',reason:'Entorno de Zalla y Encartaciones'},
 {code:'48042',name:'Gordexola',province:'Bizkaia',reason:'Entorno de Zalla y Encartaciones'},
 {code:'48037',name:'Galdames',province:'Bizkaia',reason:'Entorno de Zalla y Encartaciones'},
 {code:'48008',name:'Artzentales',province:'Bizkaia',reason:'Entorno de Zalla y Encartaciones'},
 {code:'48087',name:'Trucios-Turtzioz',province:'Bizkaia',reason:'Entorno de Zalla y Encartaciones'},
 {code:'48051',name:'Lanestosa',province:'Bizkaia',reason:'Entorno de Zalla y Encartaciones'},
 {code:'48074',name:'Urduña/Orduña',province:'Bizkaia',reason:'Consulta propia en lugar de agrupar con Güeñes'},
 {code:'48094',name:'Igorre',province:'Bizkaia',reason:'Ampliación de la atención por localidades del interior'},
 {code:'48077',name:'Plentzia',province:'Bizkaia',reason:'Ampliación de la atención por localidades de la costa'},
 {code:'48012',name:'Bakio',province:'Bizkaia',reason:'Ampliación de la atención por localidades de la costa'},
 {code:'48068',name:'Mundaka',province:'Bizkaia',reason:'Ampliación de la atención por localidades de la costa'},
 {code:'20039',name:'Getaria',province:'Gipuzkoa',reason:'Recuperación de la ficha solicitada por el propietario'},
 {code:'20034',name:'Eskoriatza',province:'Gipuzkoa',reason:'Ampliación de la atención por localidades del interior'},
 {code:'20027',name:'Zestoa',province:'Gipuzkoa',reason:'Ampliación de la atención por localidades del interior'},
 {code:'20065',name:'Soraluze-Placencia de las Armas',province:'Gipuzkoa',reason:'Ampliación de la atención por localidades del interior'},
 {code:'20043',name:'Idiazabal',province:'Gipuzkoa',reason:'Ampliación de la atención por localidades del interior'},
 {code:'20016',name:'Aia',province:'Gipuzkoa',reason:'Ampliación de la atención por localidades del interior'},
 {code:'20901',name:'Mendaro',province:'Gipuzkoa',reason:'Ampliación de la atención por localidades del interior'},
 {code:'01004',name:'Artziniega',province:'Álava',reason:'Ampliación del entorno de atención desde Zalla'},
 {code:'01063',name:'Zuia',province:'Álava',reason:'Ampliación de la atención por localidades de Álava'},
 {code:'01058',name:'Legutio',province:'Álava',reason:'Ampliación de la atención por localidades de Álava'},
 {code:'01003',name:'Aramaio',province:'Álava',reason:'Consulta propia en lugar de agrupar con Alegría-Dulantzi'},
 {code:'01031',name:'Laguardia',province:'Álava',reason:'Ampliación de la atención por localidades de Álava'},
 {code:'01055',name:'Valdegovía/Gaubea',province:'Álava',reason:'Consulta propia en lugar de agrupar con Iruña Oka'},
 {code:'01017',name:'Campezo/Kanpezu',province:'Álava',reason:'Ampliación de la atención por localidades de Álava'}
];
export const PRIORITY_MUNICIPALITY_CODES=BASQUE_COVERAGE_PRIORITIES.map(t=>t.code);
export const policy={minimumPopulation:5000,minimumPerProvince:8,maxDistanceKm:25,additionalMunicipalityCodes:PRIORITY_MUNICIPALITY_CODES};
export const GETARIA_CANONICAL_PATH='/antenas-guipuzcoa/getaria';
// Netlify matches both trailing-slash forms before applying redirect rules.
// A forced /getaria/ -> /getaria redirect would also match the canonical path
// and loop. Keep case-sensitive spelling/file aliases, without slash variants.
// https://docs.netlify.com/manage/routing/redirects/redirect-options/#trailing-slash
export const GETARIA_ALIASES=['antenas-guipuzcoa','Antenas-Guipuzcoa','antenas-gipuzkoa','Antenas-Gipuzkoa']
 .flatMap(province=>['getaria','guetaria'].flatMap(town=>['','.html','.htm'].map(suffix=>`/${province}/${town}${suffix}`)))
 .filter(route=>route!==GETARIA_CANONICAL_PATH);
export function distanceKm(a,b){
 const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;
 const n=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(n),Math.sqrt(1-n));
}
const order=(a,b)=>b.population-a.population||a.code.localeCompare(b.code);
export function selectCoverage(towns,{priorityCodes=PRIORITY_MUNICIPALITY_CODES}={}){
 const priorities=new Set(priorityCodes);
 const retained=[],assignments=[];
 for(const province of new Set(towns.map(t=>t.province))){
  const members=towns.filter(t=>t.province===province).sort(order);
  for(const t of members)if(!t.code||![t.lat,t.lon,t.population].every(Number.isFinite))throw new Error(`Geografía incompleta: ${t.name}`);
  const hubs=members.filter((t,i)=>t.population>=policy.minimumPopulation||i<policy.minimumPerProvince||t.protected);
  for(const t of members)if(!hubs.includes(t)&&hubs.every(h=>distanceKm(t,h)>policy.maxDistanceKm))hubs.push(t);
  // Add editorial priorities only after the baseline is complete. Adding one
  // must never suppress an existing remote hub or retire a published page.
  for(const t of members)if(priorities.has(t.code)&&!hubs.includes(t))hubs.push(t);
  retained.push(...hubs);
  for(const town of members){
   const hub=hubs.includes(town)?town:[...hubs].sort((a,b)=>distanceKm(town,a)-distanceKm(town,b)||order(a,b))[0];
   assignments.push({town,hub,distanceKm:distanceKm(town,hub)});
  }
 }
 return {retained,assignments};
}

export const COVERAGE_RELEASE='20261113-2';
export const COVERAGE_CSS='\n.municipal-coverage-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px 24px;padding-left:20px;margin:24px 0}.municipal-coverage-list li{padding:4px 0;scroll-margin-top:100px;overflow-wrap:anywhere}.municipal-coverage-list li:target{font-weight:800;background:#edf2d9}.municipal-coverage p{max-width:85ch}.coverage-consult{display:inline-block;min-height:44px;padding:12px 0;font-weight:700}.basque-coverage{margin:28px 0 36px}.basque-coverage-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.basque-coverage h3{font-size:clamp(23px,3vw,30px);margin:0 0 12px}.basque-coverage h4{font-size:23px;margin:0 0 14px}.basque-coverage .featured-towns{margin-bottom:16px}.basque-coverage .featured-province>a{display:inline-block;min-height:44px;padding:12px 0;font-weight:700}.other-provinces-title{font-size:23px;margin:24px 0 16px}@media(max-width:760px){.basque-coverage-grid{grid-template-columns:1fr}}\n';
