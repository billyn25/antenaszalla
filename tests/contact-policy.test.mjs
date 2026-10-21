import test from 'node:test';
import assert from 'node:assert/strict';
import {simplifyContacts} from '../scripts/contact-policy.mjs';
import {localFaultRows} from '../scripts/local-fault-content.mjs';
const actions='<a href="tel:+34670042626">Llamar</a><a href="https://wa.me/34670042626">WhatsApp</a>';
test('direct contact is kept in the hero, final panel, mobile bar and enquiry form',()=>{
 const input=`<header>${actions}</header><section class="hero zalla-fault-hero">${actions}</section><article><h3>Revisión de señal</h3><p>Comprobar MER y conectores.</p>${actions}<a href="/servicios/">Guía</a></article><section id="contacto">${actions}</section><footer>${actions}</footer><div class="mobilebar">${actions}</div><a data-enquiry-wa href="https://wa.me/34670042626">Preparar consulta</a>`;
 const out=simplifyContacts(input);
 assert.equal((out.match(/href="tel:/g)||[]).length,3);
 assert.equal((out.match(/href="https:\/\/wa.me/g)||[]).length,4);
 assert(out.includes('Comprobar MER y conectores.'));
 assert(out.includes('href="/servicios/"'));
 assert.equal(simplifyContacts(out),out);
});
test('town symptom selections keep three full cases, vary by town and stay stable',()=>{
 const original=[['A','Explicación A'],['B','Explicación B'],['C','Explicación C']];
 const combinations=new Set();
 for(let i=0;i<100;i++){
  const town={type:'town',path:`/antenas-bizkaia/pueblo-${i}`};
  const rows=localFaultRows(original,'tdt',town);
  assert.equal(rows.length,3);assert.equal(new Set(rows.map(r=>r[0])).size,3);
  assert.deepEqual(rows,localFaultRows(original,'tdt',town));
  combinations.add(rows.map(r=>r[0]).join('|'));
 }
 assert(combinations.size>50);
 assert.deepEqual(localFaultRows(original,'tdt',{type:'home'}),original);
});
