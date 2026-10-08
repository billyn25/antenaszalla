import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DOMAIN, PHONE, publicPath, fileForPublicPath, rewriteUrl, decodeHtml, titleOf, metaOf } from './public-seo.mjs';

export function auditPublicSeo(root = path.resolve(process.env.PRODUCTION_ROOT || 'dist')) {
  root = path.resolve(root);
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'public-seo-manifest.json'),'utf8'));
  const towns = JSON.parse(fs.readFileSync(path.join(root,'local-pages-manifest.json'),'utf8'));
  const records = new Map(manifest.documents.map(doc=>[doc.path,doc]));
  const htmlByPath = new Map(manifest.documents.map(doc=>[doc.path,fs.readFileSync(path.join(root,doc.file),'utf8')]));
  const anchors = new Map([...htmlByPath].map(([route,html])=>[route,new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>decodeHtml(m[1])))]));
  const adjacency = new Map([...records.keys()].map(route=>[route,new Set()]));
  const titles = new Set();
  let internalLinks=0, structuredBlocks=0;
  const fail = message => {throw new Error(`PUBLIC SEO: ${message}`);};
  if (records.size !== manifest.documents.length) fail('duplicate document URLs');
  if (towns.length !== manifest.towns) fail('municipality count changed');
  const townByPath = new Map(towns.map(t=>[t.publicPath,t]));
  if (townByPath.size !== towns.length) fail('duplicate municipalities');
  for (const [route,doc] of records) {
    const html = htmlByPath.get(route);
    if (publicPath(route)!==route || fileForPublicPath(route)!==doc.file) fail(`${route}: inconsistent storage/public path`);
    const canonicalTags = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/gi)];
    if (doc.type!=='error' && (canonicalTags.length!==1 || decodeHtml(canonicalTags[0][1])!==DOMAIN+route)) fail(`${route}: canonical is not self-referencing`);
    if ((html.match(/<h1\b/gi)||[]).length!==1) fail(`${route}: must have exactly one H1`);
    const title = titleOf(html), description=metaOf(html,'description');
    if (doc.indexable) {
      if (metaOf(html,'robots')!=='index,follow') fail(`${route}: not indexable`);
      if (!title || !description || titles.has(title)) fail(`${route}: missing or duplicate title/description`);
      titles.add(title);
      if (metaOf(html,'og:url')!==DOMAIN+route || metaOf(html,'og:title')!==title || metaOf(html,'og:description')!==description) fail(`${route}: inconsistent Open Graph data`);
    } else if (!metaOf(html,'robots').includes('noindex')) fail(`${route}: excluded document lost noindex`);
    const town=townByPath.get(route);
    if (town && ![town.name,town.province,PHONE].every(part=>title.includes(part)&&description.includes(part))) fail(`${route}: municipality, province or phone missing from metadata`);
    const h1=decodeHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
    if (town && ![town.name,town.province].every(part=>h1.includes(part))) fail(`${route}: wrong local H1`);
    const checkData=value=>{
      if (typeof value==='string' && /^(?:https?:\/\/|\/)/.test(value) && rewriteUrl(value)!==value) fail(`${route}: obsolete structured URL ${value}`);
      if (value && typeof value==='object') Object.values(value).forEach(checkData);
    };
    for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      structuredBlocks++;
      const data=JSON.parse(match[1]);
      checkData(data);
      for (const entity of data['@graph']||[data]) {
        if (['WebPage','CollectionPage'].includes(entity['@type']) && (entity.url!==DOMAIN+route || entity.name!==title || entity.description!==description)) fail(`${route}: schema metadata disagrees with HTML`);
        if (entity['@type']==='AggregateRating' || entity.aggregateRating) fail(`${route}: rating without verified review source`);
      }
    }
    for (const [,attr,raw] of html.matchAll(/\b(href|src)="([^"]*)"/gi)) {
      const value=decodeHtml(raw);
      if (!value || /^(?:tel:|mailto:|data:|javascript:)/i.test(value)) continue;
      const url=new URL(value,DOMAIN+route);
      if (url.origin!==DOMAIN) {
        if (url.hostname==='www.antenaszalla.com' || (url.hostname==='antenaszalla.com'&&url.protocol==='http:')) fail(`${route}: noncanonical host`);
        continue;
      }
      internalLinks++;
      if (rewriteUrl(value,route)!==value) fail(`${route}: internal link still redirects: ${value}`);
      if (records.has(url.pathname)) {
        adjacency.get(route).add(url.pathname);
        if (url.hash && !anchors.get(url.pathname).has(decodeURIComponent(url.hash.slice(1)))) fail(`${route}: broken fragment ${value}`);
      } else {
        const file=path.join(root,decodeURIComponent(url.pathname).replace(/^\//,''));
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`${route}: missing ${attr} resource ${value}`);
      }
    }
  }
  const index=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  const children=[...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decodeHtml(m[1]));
  if (!children.length) fail('empty sitemap index');
  const sitemapUrls=children.flatMap(url=>{
    if (!url.startsWith(DOMAIN+'/sitemaps/')) fail(`invalid sitemap child ${url}`);
    const xml=fs.readFileSync(path.join(root,new URL(url).pathname.slice(1)),'utf8');
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decodeHtml(m[1]));
  });
  const expected=new Set([...records.values()].filter(d=>d.indexable).map(d=>DOMAIN+d.path));
  if (sitemapUrls.length!==expected.size || new Set(sitemapUrls).size!==expected.size || sitemapUrls.some(url=>!expected.has(url))) fail('sitemaps do not exactly match indexable canonical documents');
  const redirects=new Map(manifest.redirects.map(r=>[r.from,r.to]));
  const redirectText=fs.readFileSync(path.join(root,'_redirects'),'utf8');
  for (const [from,to] of redirects) {
    if (from===to || redirects.has(to) || !records.has(to) || records.has(from)) fail(`redirect chain, canonical redirect or missing destination: ${from} -> ${to}`);
    if (!redirectText.includes(`${from} ${DOMAIN}${to} 301!\n`)) fail(`redirect not deployed: ${from}`);
  }
  for (const town of towns) {
    if (!records.has(town.publicPath) || redirects.get(town.legacyPath)!==town.publicPath) fail(`lost historic municipality URL: ${town.legacyPath}`);
  }
  const reachable=new Set(['/']), pending=['/'];
  while(pending.length) for(const next of adjacency.get(pending.pop())||[]) if(!reachable.has(next)){reachable.add(next);pending.push(next);}
  for(const url of expected) if(!reachable.has(new URL(url).pathname)) fail(`orphan document ${url}`);
  const report={indexable:expected.size,municipalities:towns.length,provinces:manifest.documents.filter(d=>d.type==='province').length,sitemaps:children.length,internalLinks,structuredBlocks,redirects:redirects.size,orphans:0};
  console.log('PUBLIC SEO AUDIT OK: '+JSON.stringify(report));
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) auditPublicSeo();
