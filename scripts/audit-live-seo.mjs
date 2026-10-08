// Public HTTP verification. Does not submit indexing requests or modify Search Console.
import fs from 'node:fs';
import { DOMAIN, publicPath, metaOf } from './public-seo.mjs';

async function request(url) {
  const response = await fetch(url, {redirect:'manual', signal:AbortSignal.timeout(15000), headers:{'user-agent':'AntenasZallatel-SEO-Check/1.0'}});
  return response;
}
async function text200(url) {
  const response = await request(url);
  if (response.status!==200) {await response.body?.cancel(); throw new Error(`${url}: expected direct 200, got ${response.status}`);}
  if (/noindex/i.test(response.headers.get('x-robots-tag')||'')) throw new Error(`${url}: HTTP noindex`);
  return response.text();
}

// A missing manifest means the tested SEO release has not reached the CDN yet.
const manifest = JSON.parse(await text200(DOMAIN+'/public-seo-manifest.json'));
const expected = new Set(manifest.documents.filter(d=>d.indexable).map(d=>DOMAIN+d.path));
const index = await text200(DOMAIN+'/sitemap.xml');
const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const sitemapUrls=[];
for(const child of children) {
  if(!child.startsWith(DOMAIN+'/sitemaps/')) throw new Error('Unexpected sitemap host');
  const xml=await text200(child);
  sitemapUrls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]));
}
if (new Set(sitemapUrls).size!==expected.size || sitemapUrls.length!==expected.size || sitemapUrls.some(url=>!expected.has(url))) throw new Error('Live sitemap differs from canonical manifest');
const robots=await text200(DOMAIN+'/robots.txt');
if (!robots.includes('Sitemap: '+DOMAIN+'/sitemap.xml') || /^Disallow:\s*\/$/mi.test(robots)) throw new Error('Live robots.txt is incorrect');

const reported=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/search-console-20261008.json',import.meta.url),'utf8'));
const extra=manifest.documents.filter(d=>d.type==='province').map(d=>DOMAIN+d.path).concat([
  DOMAIN+'/Antenas-Bizkaia/abanto-zierbena.html', DOMAIN+'/Antenas-Burgos/aranda-de-duero.html'
]);
const queue=[...reported,...extra];
const results=[];
await Promise.all(Array.from({length:4},async()=>{
  while(queue.length) {
    const source=queue.shift();
    const finalExpected=DOMAIN+publicPath(new URL(source).pathname);
    let current=source, hops=0;
    const seen=new Set();
    for(;;) {
      if(seen.has(current) || hops>5) throw new Error(`Redirect loop/chain: ${source}`);
      seen.add(current);
      const response=await request(current);
      if([301,302,303,307,308].includes(response.status)) {
        if(![301,308].includes(response.status)) throw new Error(`Temporary redirect: ${current}`);
        const location=response.headers.get('location');
        await response.body?.cancel();
        if(!location) throw new Error('Redirect without Location');
        const next=new URL(location,current);
        if(!['antenaszalla.com','www.antenaszalla.com'].includes(next.hostname)) throw new Error('Unexpected redirect domain');
        current=next.href; hops++;
        continue;
      }
      const html=await response.text();
      if(response.status!==200 || current!==finalExpected) throw new Error(`${source}: wrong final response ${response.status} ${current}`);
      if (/noindex/i.test(response.headers.get('x-robots-tag')||'') || metaOf(html,'robots')!=='index,follow') throw new Error(`${current}: not indexable`);
      const canonical=html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
      if(canonical!==current) throw new Error(`${current}: canonical mismatch ${canonical}`);
      if(!expected.has(current)) throw new Error(`${current}: not in sitemap`);
      results.push({source,final:current,status:200,hops});
      break;
    }
  }
}));
console.log(JSON.stringify({status:'LIVE SEO OK',reportedUrls:reported.length,totalChecked:results.length,sitemaps:children.length,sitemapUrls:sitemapUrls.length,maxRedirectHops:Math.max(...results.map(r=>r.hops)),results},null,2));
