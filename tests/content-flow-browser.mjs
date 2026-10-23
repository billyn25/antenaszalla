import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4178'},stdio:'pipe'});
const browser=await chromium.launch();
const base='http://127.0.0.1:4178';
fs.mkdirSync('qa/content-flow',{recursive:true});
try {
  for(let i=0;i<50;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const manifest=JSON.parse(fs.readFileSync('dist/public-seo-manifest.json'));
  const cases=[['home','/'],['province','/antenas-burgos/'],['town','/antenas-burgos/lerma'],['guide','/servicios/reparacion-antenas-tdt/'],['directory','/servicios/']];
  for(const [name,url] of cases)for(const width of [320,390,768,1440]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    const doc=manifest.documents.find(d=>d.path===url);assert.ok(doc,url);
    const response=await page.goto(base+'/'+doc.file,{waitUntil:'networkidle'});assert.equal(response.status(),200);
    const privacy=page.getByRole('button',{name:'Entendido',exact:true});if(await privacy.isVisible())await privacy.click();
    assert.equal(await page.locator('main[data-zallatel-flow="20261023"]').count(),1);
    const problems=await page.evaluate(()=>{
      const errors=[];
      if(document.documentElement.scrollWidth>innerWidth+2)errors.push('horizontal overflow');
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
    if(['home','province','town'].includes(name))assert.equal(await page.locator('.zallatel-service-family .service-card').count(),10);
    if(name==='town')assert.equal(await page.locator('.town-service-detail').count(),3);
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
    const target=page.locator('.zallatel-family-heading,.zallatel-directory-family>h2,.service-layout h2').first();
    await target.scrollIntoViewIfNeeded();
    await page.screenshot({path:`qa/content-flow/${name}-${width}.png`});
    await page.close();
  }
  console.log('CONTENT FLOW BROWSER OK: 5 page types × 4 viewports; complete services, anchors, search, gallery and no overflow.');
}finally{await browser.close();server.kill();}
