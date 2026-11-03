export const policy={minimumPopulation:5000,minimumPerProvince:8,maxDistanceKm:25};
export function distanceKm(a,b){
 const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;
 const n=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(n),Math.sqrt(1-n));
}
const order=(a,b)=>b.population-a.population||a.code.localeCompare(b.code);
export function selectCoverage(towns){
 const retained=[],assignments=[];
 for(const province of new Set(towns.map(t=>t.province))){
  const members=towns.filter(t=>t.province===province).sort(order);
  for(const t of members)if(!t.code||![t.lat,t.lon,t.population].every(Number.isFinite))throw new Error(`Geografía incompleta: ${t.name}`);
  const hubs=members.filter((t,i)=>t.population>=policy.minimumPopulation||i<policy.minimumPerProvince||t.protected);
  for(const t of members)if(!hubs.includes(t)&&hubs.every(h=>distanceKm(t,h)>policy.maxDistanceKm))hubs.push(t);
  retained.push(...hubs);
  for(const town of members){
   const hub=hubs.includes(town)?town:[...hubs].sort((a,b)=>distanceKm(town,a)-distanceKm(town,b)||order(a,b))[0];
   assignments.push({town,hub,distanceKm:distanceKm(town,hub)});
  }
 }
 return {retained,assignments};
}

export const COVERAGE_RELEASE='20261103';
export const COVERAGE_CSS='\n.municipal-coverage-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px 24px;padding-left:20px;margin:24px 0}.municipal-coverage-list li{padding:4px 0;scroll-margin-top:100px;overflow-wrap:anywhere}.municipal-coverage-list li:target{font-weight:800;background:#edf2d9}.municipal-coverage p{max-width:85ch}.coverage-consult{display:inline-block;min-height:44px;padding:12px 0;font-weight:700}\n';
