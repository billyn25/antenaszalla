import test from 'node:test';
import assert from 'node:assert/strict';
import {guide,TDT_GUIDE_ROUTE,renderTdtGuide,addTdtGuideTeaser} from '../scripts/tdt-update-guide.mjs';

test('La Séptima and UHD have one dated guide with real sources and initial HTML',()=>{
  const html=renderTdtGuide({header:'<header><a href="/">Inicio</a></header>',footer:'<footer></footer>',towns:[{name:'Getaria',path:'/antenas-guipuzcoa/getaria'},{name:'Lekeitio',path:'/antenas-bizkaia/lekeitio'}],provinces:[{name:'Gipuzkoa',path:'/antenas-guipuzcoa/'}]});
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.ok(html.includes(`rel="canonical" href="https://antenaszalla.com${TDT_GUIDE_ROUTE}"`));
  assert.ok(html.includes('<strong>HD al múltiple MPE5</strong>'));
  assert.ok(html.includes('DVB-T2 y HEVC'));
  assert.ok(html.includes(`datetime="${guide.reviewed}"`));
  assert.ok(guide.title.length<=65&&guide.description.length<=160);
  assert.ok(html.includes('href="/antenas-guipuzcoa/getaria"'));
  assert.ok(html.includes('href="/antenas-bizkaia/lekeitio"'));
  assert.ok(guide.sources.every(source=>html.includes(`href="${source.url}"`)));
  assert.equal((html.match(/href="tel:/g)||[]).length,1);
  assert.ok(html.includes('>Llamar para consultar</a>'));
  assert.ok(html.indexOf('id="contacto"')>html.indexOf('id="fuentes"'));
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  assert.equal(ids.size,(html.match(/\bid="/g)||[]).length);
  for(const [,id]of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(id),'missing guide anchor '+id);
  const schema=JSON.parse(html.match(/type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(schema['@graph'].some(entity=>entity['@type']==='WebPage'&&entity.dateModified===guide.reviewed));
  assert.ok(!schema['@graph'].some(entity=>entity['@type']==='Service'));
});

test('guide teaser remains short, escapes names and does not duplicate',()=>{
  const source='<html><head></head><body><main><section id="servicios"></section></main></body></html>';
  const html=addTdtGuideTeaser(source,'Getaria & <test>');
  assert.ok(html.includes('Getaria &amp; &lt;test&gt;'));
  assert.ok(html.indexOf('id="guia-septima-uhd"')<html.indexOf('id="servicios"'));
  assert.equal(addTdtGuideTeaser(html,'Getaria'),html);
  const text=html.match(/<p>(.*?)<\/p>/)[1];
  assert.ok(text.split(/\s+/).length<=30);
});

test('guide link stays outside the dynamically replaced blog news',()=>{
  const source='<main><!-- BLOG_CONTENT_START -->old news<!-- BLOG_CONTENT_END --></main>';
  const html=addTdtGuideTeaser(source);
  const refreshed=html.replace(/<!-- BLOG_CONTENT_START -->[\s\S]*?<!-- BLOG_CONTENT_END -->/,'new news');
  assert.ok(refreshed.includes(`href="${TDT_GUIDE_ROUTE}"`));
  assert.equal((html.match(/id="guia-septima-uhd"/g)||[]).length,1);
});
