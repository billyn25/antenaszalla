import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {TDT_GUIDE_ROUTE,TDT_GUIDE_RELEASE} from '../scripts/tdt-update-guide.mjs';

const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4178'},stdio:'pipe'});
const browser=await chromium.launch();
const base='http://127.0.0.1:4178';
fs.mkdirSync('qa/content-flow',{recursive:true});
try {
  for(let i=0;i<50;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const manifest=JSON.parse(fs.readFileSync('dist/public-seo-manifest.json'));
  const cases=[['home','/'],['province','/antenas-burgos/'],['town','/antenas-burgos/lerma'],['sopuerta','/antenas-bizkaia/sopuerta'],['guide','/servicios/reparacion-antenas-tdt/'],['communities','/servicios/mantenimiento-antenas-comunidades/'],['directory','/servicios/'],['getaria','/antenas-guipuzcoa/getaria'],['lekeitio','/antenas-bizkaia/lekeitio'],['tdt-guide',TDT_GUIDE_ROUTE]];
  for(const [name,url] of cases)for(const width of ['guide','communities','tdt-guide'].includes(name)?[320,390,700,768,1440]:name==='home'?[320,390,768,1181,1440]:[320,390,768,1440]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    const doc=manifest.documents.find(d=>d.path===url);assert.ok(doc,url);
    const response=await page.goto(base+'/'+doc.file,{waitUntil:'networkidle'});assert.equal(response.status(),200);
    const privacy=page.getByRole('button',{name:'Entendido',exact:true});if(await privacy.isVisible())await privacy.click();
    assert.equal(await page.locator(name==='tdt-guide'?`main[data-tdt-guide-release="${TDT_GUIDE_RELEASE}"]`:'main[data-zallatel-flow="20261023"]').count(),1);
    const problems=await page.evaluate(()=>{
      const errors=[];
      if(document.documentElement.scrollWidth>innerWidth+2)errors.push('horizontal overflow');
      const brand=document.querySelector('header .zalla-brand-logo');
      const contact=document.querySelector('header .contact-top');
      if(brand&&contact&&brand.getBoundingClientRect().right>contact.getBoundingClientRect().left-3)errors.push('brand overlaps header contact');
      const navigation=document.querySelector('#site-navigation');
      if(innerWidth>1180&&navigation&&contact){
        const lastLink=navigation.querySelector('a:last-child');
        if(lastLink&&lastLink.getBoundingClientRect().right>contact.getBoundingClientRect().left-4)errors.push('navigation overlaps header contact');
      }
      const title=document.querySelector('.hero-copy h1'),statement=document.querySelector('.hero-copy .service-statement');
      if(innerWidth<=760&&title&&statement){
        const range=document.createRange();range.selectNodeContents(title);
        if(statement.getBoundingClientRect().top-range.getBoundingClientRect().bottom>30)errors.push('empty gap below hero title');
      }
      if(innerWidth<=760&&document.querySelector('.mobilebar')&&getComputedStyle(document.querySelector('.mobilebar')).display==='none')errors.push('mobile contact unavailable');
      if(document.querySelector('.service-page .service-layout')||document.querySelector('[data-tdt-guide-release]')){
        if(/670\s*042\s*626/.test(document.querySelector('main').innerText))errors.push('repeated phone in reading guide');
        if(document.querySelectorAll('main a[href^="tel:"]').length!==1)errors.push('guide must have one final call action');
      }
      const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);
      if(new Set(ids).size!==ids.length)errors.push('duplicate ids');
      for(const a of document.querySelectorAll('main a[href^="#"]'))if(!document.getElementById(decodeURIComponent(a.hash.slice(1))))errors.push('missing anchor '+a.hash);
      for(const card of document.querySelectorAll('.zallatel-service-family .service-card')){
        const p=card.querySelector('p'),h=card.querySelector('h4'),a=card.querySelector('a');
        if(!p||!h||!a)errors.push('incomplete service');
        else if(a.getBoundingClientRect().right>innerWidth+1)errors.push('overflowing service link');
      }
      return errors;
    });assert.deepEqual(problems,[],`${name} ${width}`);
    if(['home','province','town'].includes(doc.type))assert.equal(await page.locator('.zallatel-service-family .service-card').count(),10);
    if(['home','province','town'].includes(doc.type))assert.equal(await page.locator('#comunidades').count(),1);
    if(doc.type==='town')assert.equal(await page.locator('.town-service-detail').count(),3);
    if(name!=='tdt-guide'){
      assert.equal(await page.locator('#guia-septima-uhd').count(),1);
      assert.equal(await page.locator(`#guia-septima-uhd a[href="${TDT_GUIDE_ROUTE}"]`).count(),1);
    }
    if(['getaria','lekeitio'].includes(name))assert.equal(await page.locator('[data-local-town-guide]').count(),1);
    if(name==='tdt-guide'){
      assert.equal(await page.getByRole('heading',{level:1}).count(),1);
      await page.locator('nav.tdt-guide-index a[href="#compatibilidad-uhd"]').click();
      assert.equal(new URL(page.url()).hash,'#compatibilidad-uhd');
      assert.equal(await page.locator('#compatibilidad-uhd').count(),1);
    }
    if(name==='province'){
      await page.locator('#town-search').fill('Lerma');
      await page.waitForTimeout(150);
      assert.equal(await page.locator('[data-town]:visible').count(),1);
    }
    if(name==='home'){
      await page.locator('.gallery-open').first().click();
      assert.equal(await page.locator('#gallery-lightbox').evaluate(n=>n.open),true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#gallery-lightbox').evaluate(n=>n.open),false);
    }
    const target=page.locator(name==='tdt-guide'?'.tdt-guide-table':'.zallatel-family-heading,.zallatel-directory-family>h2,.service-layout h2').first();
    await target.scrollIntoViewIfNeeded();
    await page.screenshot({path:`qa/content-flow/${name}-${width}.png`});
    await page.close();
  }
  console.log('CONTENT FLOW BROWSER OK: 10 representative pages; 320, 390, 768, 1440 px, guides at 700 px and desktop header at 1181 px; compact hero, readable brand, community links, single guide contact, search, gallery and no overflow.');
}finally{await browser.close();server.kill();}
