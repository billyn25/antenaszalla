import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {pages,renderPage} from '../scripts/build.mjs';
test('mobile menu toggles, closes after navigation and supports Escape',()=>{
 const events={button:{},nav:{},header:{}};
 const header={dataset:{},addEventListener:(k,f)=>events.header[k]=f};
 const attrs=new Map();let focused=false;
 const button={closest:()=>header,setAttribute:(k,v)=>attrs.set(k,v),getAttribute:k=>attrs.get(k),addEventListener:(k,f)=>events.button[k]=f,focus:()=>focused=true};
 const nav={addEventListener:(k,f)=>events.nav[k]=f};
 const document={querySelector:s=>s==='.menu-toggle'?button:s==='#site-navigation'?nav:null,querySelectorAll:()=>[]};
 vm.runInNewContext(fs.readFileSync('src/site.js','utf8'),{document});
 assert.equal(attrs.get('aria-expanded'),'false');assert.equal(header.dataset.mobileNav,'ready');
 events.button.click();assert.equal(attrs.get('aria-expanded'),'true');
 events.nav.click({target:{closest:()=>({})}});assert.equal(attrs.get('aria-expanded'),'false');
 events.button.click();events.header.keydown({key:'Escape'});assert.equal(attrs.get('aria-expanded'),'false');assert(focused);
});
test('province headings and home links use the requested Antenista en label',()=>{
 const home=renderPage(pages.find(p=>p.type==='home'));
 for(const p of pages.filter(p=>p.type==='province')) {
  assert(home.includes(`<strong>Antenista en ${p.name}</strong>`));
  assert(renderPage(p).includes(`<h1>Antenista en ${p.name}</h1>`));
 }
 assert(home.includes('aria-controls="site-navigation"'));
 assert(home.includes('<nav id="site-navigation"'));
});
