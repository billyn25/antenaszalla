// One public URL per document. Physical .html files remain an implementation detail.
export const DOMAIN = 'https://antenaszalla.com';
export const PHONE = '670 042 626';
export const TEL = '+34670042626';
export const BRAND = 'Antenas Zallatel';
export const LEGAL_FILES = new Set(['aviso-legal.html', 'privacidad.html', 'cookies.html']);
export const HISTORIC_ALIASES = new Map([
  ['/antenas-bizkaia/abanto-zierbena', '/antenas-bizkaia/abanto-y-ciervana-abanto-zierbena'],
  ['/antenas-burgos/aranda-de-duero', '/antenas-burgos/aranda_duero']
]);

export function publicPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[?#\\]/.test(value) || value.split('/').includes('..')) {
    throw new Error(`Invalid document path: ${value}`);
  }
  let result = value.toLowerCase();
  if (/^\/(?:index(?:\.html?)?)?$/.test(result)) return '/';
  if (result.startsWith('/antenas-')) {
    result = result.replace(/\/index(?:\.html?)?$/, '/').replace(/\.html?$/, '');
    if (/^\/antenas-[^/]+$/.test(result)) result += '/';
    else if (!/^\/antenas-[^/]+\/$/.test(result)) result = result.replace(/\/$/, '');
    return HISTORIC_ALIASES.get(result) || result;
  }
  if (/^\/(aviso-legal|privacidad|cookies)(\.html)?$/.test(result)) return result.replace(/\.html$/, '');
  return value;
}

export function fileForPublicPath(route) {
  if (publicPath(route) !== route) throw new Error(`Not a canonical path: ${route}`);
  if (route === '/') return 'index.html';
  if (route.endsWith('/')) return route.slice(1) + 'index.html';
  return /\.[a-z0-9]+$/i.test(route) ? route.slice(1) : route.slice(1) + '.html';
}

export function rewriteUrl(value, currentPath = '/') {
  if (!value || value.startsWith('#') || /^(?:tel:|mailto:|data:|javascript:)/i.test(value)) return value;
  let url;
  try { url = new URL(value, DOMAIN + currentPath); } catch { return value; }
  if (!['antenaszalla.com', 'www.antenaszalla.com'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol)) return value;
  const pathname = publicPath(url.pathname);
  // Assets, external sources and non-document endpoints are deliberately untouched.
  if (pathname === url.pathname && !/^\/(?:antenas-|aviso-legal$|privacidad$|cookies$|$)/.test(pathname)) return value;
  const suffix = pathname + url.search + url.hash;
  return /^(?:https?:)?\/\//i.test(value) ? DOMAIN + suffix : suffix;
}

export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const decodeHtml = value => String(value).replace(/&(?:amp|lt|gt|quot|apos|#39|#x27);/gi, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&#x27;':"'"}[entity.toLowerCase()]));
export const titleOf = html => decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
export function metaOf(html, key) {
  return decodeHtml([...html.matchAll(/<meta\b[^>]*>/gi)].find(m => new RegExp(`(?:name|property)=["']${key}["']`, 'i').test(m[0]))?.[0].match(/content=["']([^"']*)["']/i)?.[1] || '');
}
export function setMeta(html, key, value, property = false) {
  const attr = property ? 'property' : 'name';
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(value)}">`;
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attr}=["']${key}["'])[^>]*>`, 'gi');
  let found = false;
  const result = html.replace(pattern, () => { if (found) return ''; found = true; return tag; });
  return found ? result : result.replace('</head>', tag + '</head>');
}
export function rewriteStructuredData(value) {
  if (typeof value === 'string') return /^(?:https?:\/\/|\/)/.test(value) ? rewriteUrl(value) : value;
  if (Array.isArray(value)) return value.map(rewriteStructuredData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, rewriteStructuredData(v)]));
  return value;
}

export function townMetadata(town) {
  const title = `Antenista en ${town.name}, ${town.province} | ${PHONE}`;
  const description = `Antenista en ${town.name}, ${town.province}. ${PHONE}. Instalación y reparación de antenas TDT, parabólicas, porteros automáticos y videoporteros.`;
  return {title, description};
}

export function redirectRules(documents) {
  const rules = new Map();
  const add = (from, to) => {
    if (from === to) return;
    if (rules.has(from) && rules.get(from) !== to) throw new Error(`Conflicting redirect: ${from}`);
    rules.set(from, to);
  };
  for (const doc of documents) {
    if (doc.legacyFile === '404.html') continue;
    const original = '/' + doc.legacyFile;
    for (const source of [original, original.replace(/\.html$/, ''), original.replace(/\/index\.html$/, '/')]) { add(source, doc.path); add(source.toLowerCase(), doc.path); }
  }
  for (const [from, to] of HISTORIC_ALIASES) {
    if (!documents.some(doc => doc.path === to)) throw new Error(`Historic destination is missing: ${to}`);
    for (const source of [from, from + '.html', from.replace('/antenas-burgos/', '/Antenas-Burgos/').replace('/antenas-bizkaia/', '/Antenas-Bizkaia/') + '.html']) add(source, to);
  }
  add('/index.htm', '/');
  for (const [from,to] of rules) {
    if (rules.has(to)) throw new Error(`Redirect chain or loop: ${from} -> ${to}`);
  }
  return rules;
}
