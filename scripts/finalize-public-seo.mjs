import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { brandMark } from './logo.mjs';
import { DOMAIN, PHONE, TEL, BRAND, LEGAL_FILES, publicPath, fileForPublicPath, rewriteUrl, escapeHtml, decodeHtml, titleOf, metaOf, setMeta, rewriteStructuredData, townMetadata, redirectRules } from './public-seo.mjs';

export function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path.join(dir,entry.name)) : [path.join(dir,entry.name)]);
}

export function finalizePublicSeo(root = path.resolve(process.env.PRODUCTION_ROOT || 'dist')) {
  root = path.resolve(root);
  const manifestFile = path.join(root, 'local-pages-manifest.json');
  const towns = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const townByPath = new Map(towns.map(t => [publicPath(t.path), t]));
  if (townByPath.size !== towns.length) throw new Error('Two municipalities resolve to the same public URL');
  const documents = walk(root).filter(f => f.endsWith('.html')).map(file => {
    const legacyFile = path.relative(root, file).split(path.sep).join('/');
    const route = publicPath('/' + legacyFile);
    return {legacyFile, path:route, file: fileForPublicPath(route), html:fs.readFileSync(file,'utf8')};
  });
  const byPath = new Map();
  // A historic alias is removed only when its equivalent municipality has a real HTML document.
  for (const doc of documents) {
    const old = byPath.get(doc.path);
    if (!old || ('/' + doc.legacyFile).toLowerCase() === '/' + doc.file) byPath.set(doc.path, doc);
  }
  for (const doc of documents) {
    if (doc.file !== doc.legacyFile.toLowerCase() && doc.legacyFile !== 'index.html' && !documents.some(other => other.legacyFile.toLowerCase() === doc.file)) {
      throw new Error(`Missing destination for ${doc.legacyFile}: ${doc.file}`);
    }
  }
  const rules = redirectRules(documents);
  const priorManifest = path.join(root, 'public-seo-manifest.json');
  if (fs.existsSync(priorManifest)) {
    for (const {from,to} of JSON.parse(fs.readFileSync(priorManifest,'utf8')).redirects) {
      if (!byPath.has(to) || (rules.has(from) && rules.get(from)!==to)) throw new Error('Inconsistent previous redirect manifest');
      rules.set(from,to);
    }
  }
  const report = [];
  for (const doc of byPath.values()) {
    let html = doc.html;
    const canonical = DOMAIN + doc.path;
    const legal = LEGAL_FILES.has(doc.file);
    const errorPage = doc.file === '404.html';
    const town = townByPath.get(doc.path);
    html = html.replace(/\b(href|src)=("|')([^"']*)\2/gi, (_,attr,quote,value) => `${attr}=${quote}${escapeHtml(rewriteUrl(decodeHtml(value),doc.path))}${quote}`);
    let title = titleOf(html);
    let description = metaOf(html,'description');
    if (town) {
      const metadata = townMetadata(town);
      title = metadata.title;
      // Keep the existing relevant description and its service focus when it contains the essentials.
      if (![town.name, town.province, PHONE].every(part => description.includes(part))) description = metadata.description;
    } else if (doc.path === '/') {
      title = `Antenas Zallatel: antenas, porteros y videoporteros | ${PHONE}`;
    }
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    if (!errorPage) {
      html = setMeta(html,'description',description);
      for (const [key,value] of Object.entries({'og:title':title,'og:description':description,'og:url':canonical,'og:site_name':BRAND,'og:locale':'es_ES','og:type':'website'})) html = setMeta(html,key,value,true);
      if (fs.existsSync(path.join(root,'assets/hero-zallatel.png')) && !legal) {
        const image = DOMAIN + '/assets/hero-zallatel.png';
        html = setMeta(html,'og:image',image,true);
        html = setMeta(html,'og:image:alt','Antenas Zallatel: servicio técnico de antenas',true);
        for (const [key,value] of Object.entries({'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image})) html = setMeta(html,key,value);
        if (!html.includes('as="image"')) html = html.replace('</head>','<link rel="preload" as="image" href="/assets/hero-zallatel.png" fetchpriority="high"></head>');
      }
    }
    html = html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi, (_,open,raw,close) => {
      const data = rewriteStructuredData(JSON.parse(raw));
      const entities = data['@graph'] || [data];
      for (const entity of entities) {
        if (['WebPage','CollectionPage'].includes(entity['@type'])) Object.assign(entity,{name:title,description,url:canonical,inLanguage:'es'});
        if (entity['@type'] === 'WebSite') Object.assign(entity,{name:BRAND,url:DOMAIN+'/',publisher:{'@id':DOMAIN+'/#organizacion'}});
        if (entity['@type'] === 'Service') {
          entity.description = description;
          if (Array.isArray(entity.serviceType) && !entity.serviceType.includes('TDT por satélite HD')) entity.serviceType.push('TDT por satélite HD');
        }
      }
      if (data['@graph'] && !entities.some(e => e['@id'] === DOMAIN+'/#organizacion')) entities.push({'@type':'Organization','@id':DOMAIN+'/#organizacion',name:BRAND,url:DOMAIN+'/',telephone:TEL});
      return open + JSON.stringify(data).replace(/</g,'\\u003c') + close;
    });
    if (!html.includes('rel="icon"')) html = html.replace('</head>','<link rel="icon" type="image/svg+xml" href="/favicon.svg"></head>');
    if (doc.path === '/') html = html.replace('href="/antenas-leon/">Leon</a>', 'href="/antenas-leon/">León</a>');
    doc.html = html;
    report.push({path:doc.path,file:doc.file,indexable:!legal&&!errorPage,type:town?'town':doc.path==='/'?'home':doc.path.endsWith('/')?'province':legal?'legal':'error',title});
  }
  // All transformations and collision checks finish before the output is replaced.
  for (const doc of documents) fs.rmSync(path.join(root,doc.legacyFile));
  for (const doc of byPath.values()) {
    const file = path.join(root,doc.file);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,doc.html);
  }
  // Remove empty legacy directories, but never assets or nonempty content.
  for (const name of fs.readdirSync(root)) {
    const dir = path.join(root,name);
    if (/^Antenas-/.test(name) && fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length===0) fs.rmdirSync(dir);
  }
  const updated = towns.map(t => ({...t, legacyPath:t.legacyPath||t.path, path:'/'+fileForPublicPath(publicPath(t.path)), publicPath:publicPath(t.path)}));
  fs.writeFileSync(manifestFile,JSON.stringify(updated,null,2)+'\n');
  fs.writeFileSync(path.join(root,'public-seo-manifest.json'),JSON.stringify({version:1,domain:DOMAIN,towns:towns.length,documents:report,redirects:[...rules].map(([from,to])=>({from,to}))},null,2)+'\n');
  fs.writeFileSync(path.join(root,'_redirects'), '# Generated: old document URLs go directly to their canonical equivalent. No wildcard homepage fallback.\n' + [...rules].map(([from,to])=>`${from} ${DOMAIN}${to} 301!`).join('\n') + '\nhttps://www.antenaszalla.com/* https://antenaszalla.com/:splat 301!\nhttp://www.antenaszalla.com/* https://antenaszalla.com/:splat 301!\nhttp://antenaszalla.com/* https://antenaszalla.com/:splat 301!\n');
  const icon = brandMark().match(/<svg[\s\S]*?<\/svg>/)?.[0];
  if (!icon) throw new Error('Missing existing brand icon');
  fs.writeFileSync(path.join(root,'favicon.svg'),icon.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" color="#b6292f" ').replace('viewBox="0 0 96 76"','viewBox="0 0 100 100"'));
  console.log(`PUBLIC SEO READY: ${report.filter(d=>d.indexable).length} canonical documents, ${towns.length} municipalities, ${rules.size} direct legacy redirects. Design, contact details and service content preserved.`);
  return {documents:report,redirects:rules};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) finalizePublicSeo();
