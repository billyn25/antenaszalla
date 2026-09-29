import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pages,site,routeFile } from './build.mjs';
const root=path.resolve('dist'), titles=new Set();let links=0;
for(const page of pages){
 const h=fs.readFileSync(path.join(root,routeFile(page.path)),'utf8');
 assert.equal((h.match(/<h1\b/g)||[]).length,1,page.path+': H1');
 assert.equal((h.match(/<title>/g)||[]).length,1,page.path+': title');
 assert.match(h,/<meta name="robots" content="noindex,nofollow">/);
 assert.ok(h.includes(`href="${new URL(page.path,site.domain).href}"`),page.path+': canonical');
 const title=h.match(/<title>(.*?)<\/title>/)[1];assert.ok(!titles.has(title),'Título duplicado');titles.add(title);
 assert.ok(h.includes('tel:'+site.tel)&&h.includes('https://wa.me/'+site.whatsapp),'Contactos');
 assert.ok(!/antenistacerca|G-W8L23NJLP6|googletagmanager|google-analytics|\{\{/i.test(h),'Identidad o script ajeno');
 for(const raw of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(raw[1]);
 const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'ID duplicado');
 for(const m of h.matchAll(/\bhref="([^"\s]+)"/g)){
  if(!m[1].startsWith('/')&&!m[1].startsWith('#'))continue;
  const u=new URL(m[1],'https://preview.local'+page.path), pathname=decodeURIComponent(u.pathname);
  const target=path.join(root,pathname.startsWith('/assets/')?pathname.slice(1):routeFile(pathname));
  assert.ok(fs.existsSync(target),`${page.path}: enlace roto ${m[1]}`);
  if(u.hash){const targetHTML=fs.readFileSync(target,'utf8');assert.ok(targetHTML.includes(`id="${decodeURIComponent(u.hash.slice(1))}"`),'Ancla no encontrada '+m[1]);}
  links++;
 }
}
const runtime=fs.readFileSync(path.join(root,'assets/site.js'),'utf8');
assert.ok(!/sessionStorage|document\.cookie|fetch\(|gtag\(|googletagmanager|google-analytics|clarity\(|fbq\(/i.test(runtime),'Vista previa sin seguimiento');
assert.ok(runtime.includes("const privacyKey = 'antenaszalla-cookie-info-v1'"),'Aviso de privacidad sin clave técnica');
assert.equal((runtime.match(/localStorage/g)||[]).length,2,'Solo se permite localStorage para recordar el cierre del aviso');
assert.match(fs.readFileSync(path.join(root,'_headers'),'utf8'),/X-Robots-Tag: noindex/);
assert.ok(!/Disallow:\s*\//.test(fs.readFileSync(path.join(root,'robots.txt'),'utf8')),'Permitir lectura de noindex');
assert.ok(!fs.existsSync(path.join(root,'_redirects')),'Sin reescritura SPA que oculte 404');
console.log(`AUDITORÍA OK: ${pages.length} páginas, ${links} enlaces internos/anclas; títulos, H1, rutas, JSON-LD, noindex y contactos.`);
