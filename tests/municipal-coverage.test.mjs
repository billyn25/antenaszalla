import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCoverage,distanceKm} from '../scripts/municipal-coverage.mjs';
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
