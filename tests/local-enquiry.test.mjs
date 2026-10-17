import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {localEnquiry} from '../scripts/local-enquiry.mjs';
test('consulta de Enkarterri escapa pueblos y conserva sus rutas actuales',()=>{
 const h=localEnquiry([{name:'Pueblo & Valle',path:'/Antenas-Bizkaia/pueblo-valle.html'}]);
 assert(h.includes('Pueblo &amp; Valle'));assert(h.includes('/antenas-bizkaia/pueblo-valle'));
 assert(h.includes('TDT por satélite'));assert(h.includes('Starlink'));assert(h.includes('maxlength="600"'));
});
test('provincia, búsqueda sin tildes y aviso se mantienen coherentes, incluso sin resultados',()=>{
 const events={};const on=()=>({addEventListener:(k,f)=>events[k]=f});
 const town={options:[{value:'Güeñes',dataset:{route:'/antenas-bizkaia/guenes'}}],selectedIndex:0,replaceChildren(){this.options=[];this.selectedIndex=-1;},appendChild(o){this.options.push(o);if(this.selectedIndex<0)this.selectedIndex=0;},get value(){return this.options[this.selectedIndex]?.value||'';},set value(v){this.selectedIndex=this.options.findIndex(o=>o.value===v);}};
 const province={value:'Bizkaia',addEventListener:(k,f)=>events.province=f},search={value:'',addEventListener:(k,f)=>events.search=f};
 const problem={value:'El portero no abre la puerta',selectedIndex:0,options:[{dataset:{hint:'Indica si otros vecinos pueden abrir.'}}]};
 const detail={value:' Falla en el portal & vivienda '},hint={},whatsapp={},route={},count={};
 const data=[{name:'Güeñes',province:'Bizkaia',route:'/antenas-bizkaia/guenes'},{name:'Balmaseda',province:'Bizkaia',route:'/antenas-bizkaia/balmaseda'},{name:'Eibar',province:'Gipuzkoa',route:'/antenas-guipuzcoa/eibar'}];
 const nodes={town,province,search,problem,detail,hint,wa:whatsapp,route,count,towns:{textContent:JSON.stringify(data)}};
 const panel={hidden:true,querySelector:s=>nodes[s.slice(14,-1)],addEventListener:(k,f)=>events[k]=f};
 const code=fs.readFileSync('src/site.js','utf8').split('/* Consulta local:')[1].split('*/')[1];
 vm.runInNewContext(code,{document:{querySelector:()=>panel,createElement:()=>({dataset:{}})}});
 assert.equal(panel.hidden,false);let url=new URL(whatsapp.href);assert(url.searchParams.get('text').includes('Güeñes, Bizkaia'));assert(url.searchParams.get('text').includes('Falla en el portal & vivienda'));
 search.value='guenes';events.search();assert.equal(town.value,'Güeñes');assert.equal(town.options.length,1);
 province.value='Gipuzkoa';events.province();assert.equal(town.value,'Eibar');assert.equal(route.href,'/antenas-guipuzcoa/eibar');assert(new URL(whatsapp.href).searchParams.get('text').includes('Eibar, Gipuzkoa'));
 search.value='noexiste';events.search();assert.equal(whatsapp.hidden,true);assert.equal(route.hidden,true);assert(count.textContent.includes('No encontramos'));
 search.value='';detail.value='';events.search();assert.equal(whatsapp.hidden,false);assert(!new URL(whatsapp.href).searchParams.get('text').includes('Detalles:'));
});
