import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectCoverage,distanceKm,BASQUE_COVERAGE_PRIORITIES,BURGOS_COVERAGE_PRIORITIES,GETARIA_ALIASES,GETARIA_CANONICAL_PATH} from '../scripts/municipal-coverage.mjs';
test('retains populous municipalities, covers remote areas and never assigns across a province border',()=>{
 const towns=Array.from({length:10},(_,i)=>({code:String(i).padStart(5,'0'),name:'A'+i,province:'A',population:i===0?100000:100-i,lat:43,lon:-3+i*.01}));
 towns.push({code:'99998',name:'Remoto',province:'A',population:10,lat:43,lon:-5});
 towns.push({code:'99999',name:'Otra provincia',province:'B',population:100,lat:43,lon:-3.081});
 const {retained,assignments}=selectCoverage(towns);
 assert(retained.some(t=>t.code==='00000'));assert(retained.some(t=>t.name==='Remoto'));
 assert.equal(assignments.length,towns.length);
 for(const {town,hub} of assignments){assert.equal(town.province,hub.province);assert(distanceKm(town,hub)<=25);}
});
test('missing geography fails instead of inventing a coverage destination',()=>{
 assert.throws(()=>selectCoverage([{code:'00001',name:'Sin datos',province:'A',population:100}]),/Geografía incompleta/);
});
test('an editorial addition cannot displace an already retained remote municipality',()=>{
 const towns=Array.from({length:8},(_,i)=>({code:String(i).padStart(5,'0'),name:'Base '+i,province:'A',population:1000-i,lat:43,lon:-3+i*.001}));
 towns.push({code:'99998',name:'Existing remote page',province:'A',population:100,lat:43,lon:-3.7});
 towns.push({code:'99999',name:'New nearby priority',province:'A',population:10,lat:43,lon:-3.5});
 const before=selectCoverage(towns,{priorityCodes:[]});
 const after=selectCoverage(towns,{priorityCodes:['99999']});
 const retained=new Set(after.retained.map(t=>t.code));
 assert.equal(before.retained.length,9);
 assert.equal(after.retained.length,10);
 for(const town of before.retained)assert(retained.has(town.code),town.name);
 assert.equal(after.assignments.find(a=>a.town.code==='99999').hub.code,'99999');
});
test('Basque expansion restores 26 pages and preserves all 228 existing municipality pages',()=>{
 const geography=JSON.parse(fs.readFileSync(new URL('../content/municipal-geography.json',import.meta.url),'utf8'));
 const towns=geography.municipalities.map(t=>({...t,province:t.code.slice(0,2),protected:t.code==='48096'}));
 const baseline=selectCoverage(towns,{priorityCodes:[]});
 const expanded=selectCoverage(towns,{priorityCodes:BASQUE_COVERAGE_PRIORITIES.map(t=>t.code)});
 const existing=new Set(baseline.retained.map(t=>t.code));
 const retained=new Set(expanded.retained.map(t=>t.code));
 assert.equal(existing.size,228);
 assert.equal(retained.size,254);
 for(const code of existing)assert(retained.has(code),`Published page lost: ${code}`);
 assert.equal(new Set(BASQUE_COVERAGE_PRIORITIES.map(t=>t.code)).size,26);
 for(const priority of BASQUE_COVERAGE_PRIORITIES){
  assert(!existing.has(priority.code),`Priority is not a recovered page: ${priority.name}`);
  assert(retained.has(priority.code),priority.name);
  const assignment=expanded.assignments.find(a=>a.town.code===priority.code);
  assert.equal(assignment.hub.code,priority.code,priority.name);
 }
 for(const [province,count] of [['48',47],['20',41],['01',16]])assert.equal(expanded.retained.filter(t=>t.province===province).length,count);
 assert(retained.has('48057'),'Lekeitio must remain a separate page');
 for(const town of expanded.retained.filter(t=>!['01','20','48'].includes(t.province)))assert(existing.has(town.code),'Expansion must not change other provinces');
});
test('Burgos restores seven northern pages without removing any of the 254 published local pages',()=>{
 const geography=JSON.parse(fs.readFileSync(new URL('../content/municipal-geography.json',import.meta.url),'utf8'));
 const towns=geography.municipalities.map(t=>({...t,province:t.code.slice(0,2),protected:t.code==='48096'}));
 const before=selectCoverage(towns,{priorityCodes:BASQUE_COVERAGE_PRIORITIES.map(t=>t.code)});
 const after=selectCoverage(towns);
 const priorCodes=new Set(before.retained.map(t=>t.code));
 const retained=new Set(after.retained.map(t=>t.code));
 assert.equal(priorCodes.size,254);
 assert.equal(retained.size,261);
 for(const town of before.retained)assert(retained.has(town.code),`Published page lost: ${town.name}`);
 assert.equal(before.retained.filter(t=>t.province==='09').length,20);
 assert.equal(after.retained.filter(t=>t.province==='09').length,27);
 for(const town of BURGOS_COVERAGE_PRIORITIES){
  assert(!priorCodes.has(town.code),`Expected a recovered page: ${town.name}`);
  assert.equal(after.assignments.find(a=>a.town.code===town.code)?.hub.code,town.code);
 }
 for(const town of after.retained.filter(t=>t.province!=='09'))assert(priorCodes.has(town.code),'Burgos expansion must not change other provinces');
});
test('Getaria aliases preserve one canonical destination for both spellings',()=>{
 assert.equal(new Set(GETARIA_ALIASES).size,GETARIA_ALIASES.length);
 assert.equal(GETARIA_ALIASES.length,23);
 assert(!GETARIA_ALIASES.includes(GETARIA_CANONICAL_PATH));
 for(const route of ['/antenas-guipuzcoa/guetaria','/Antenas-Guipuzcoa/getaria.html','/antenas-gipuzkoa/getaria'])assert(GETARIA_ALIASES.includes(route));
});
test('Getaria cannot match its own forced redirect after Netlify trailing-slash normalization',()=>{
 // Netlify ignores a trailing slash during rule matching, but preserves case.
 const routeKey=route=>route.replace(/\/+$/,'')||'/';
 const rules=new Map(GETARIA_ALIASES.map(alias=>[routeKey(alias),GETARIA_CANONICAL_PATH]));
 for(const canonical of [GETARIA_CANONICAL_PATH,GETARIA_CANONICAL_PATH+'/']){
  assert(!rules.has(routeKey(canonical)),`Canonical URL would loop: ${canonical}`);
 }
 for(const alias of GETARIA_ALIASES){
  assert(!alias.endsWith('/'),'A trailing-slash variant duplicates a Netlify rule');
  assert.notEqual(routeKey(alias),routeKey(GETARIA_CANONICAL_PATH));
  assert.equal(rules.get(routeKey(alias+'/')),GETARIA_CANONICAL_PATH,'Native slash matching must preserve aliases');
 }
 assert(rules.has('/Antenas-Guipuzcoa/getaria'),'Case-sensitive historical path must remain supported');
});
