// The news cards are rendered at the edge: Google and visitors receive the same HTML.
// Only six priority municipal pages are affected; all existing page content is preserved.
const priority = new Map([
  ['zalla', 'Zalla'], ['balmaseda', 'Balmaseda'], ['sopuerta', 'Sopuerta'],
  ['guenes', 'Güeñes'], ['karrantza', 'Karrantza'], ['valle-de-mena', 'Valle de Mena'],
  ['gordexola', 'Gordexola'], ['galdames', 'Galdames'], ['artzentales', 'Artzentales'],
  ['muskiz', 'Muskiz'], ['barakaldo', 'Barakaldo'], ['bilbao', 'Bilbao'],
  ['getxo', 'Getxo'], ['espinosa-de-los-monteros', 'Espinosa de los Monteros'],
  ['medina-de-pomar', 'Medina de Pomar']
]);
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
function hash(value) {
  let n = 2166136261;
  for (const ch of value) n = Math.imul(n ^ ch.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function selectTownNews(blogHtml, pathname, count = 3) {
  const items = [...blogHtml.matchAll(/<li><article>([\s\S]*?)<\/article><\/li>/g)]
    .map(match => {
      const body = match[1];
      const heading = body.match(/<h3><a href="(https:\/\/[^"]+)">([\s\S]*?)<\/a><\/h3>/);
      const date = body.match(/<time datetime="([^"]+)">([^<]+)<\/time>/);
      const source = body.match(/<p class="news-source">([^<]+)<\/p>/);
      if (!heading || !date || !source) return null;
      return { href: heading[1], title: heading[2], iso: date[1], date: date[2], source: source[1] };
    }).filter(Boolean);
  // Stable per town, yet new articles rotate the selection when the blog changes.
  const ordered = items.map((item, index) => ({
    ...item, score: hash(pathname + '|' + item.href) % 1000 + Math.max(0, 20 - index) * 30
  })).sort((a,b) => b.score - a.score || a.href.localeCompare(b.href));
  return ordered.slice(0, count);
}
export function insertTownNews(html, pathname, articles) {
  if (!articles.length || html.includes('id="actualidad-television-local"') || !html.includes('</main>')) return html;
  const slug = pathname.split('/').filter(Boolean).at(-1);
  const name = priority.get(slug);
  if (!name) return html;
  const cards = articles.map(item => `<li><article><h3><a href="${item.href}">${item.title}</a></h3><p><time datetime="${escape(item.iso)}">${item.date}</time> · ${item.source}</p></article></li>`).join('');
  const block = `<section class="section wrap" id="actualidad-television-local"><span class="eyebrow">Actualidad de televisión</span><h2>Noticias de TDT, canales y satélite para consultar desde ${escape(name)}</h2><p>Selección de noticias de televisión con fecha y fuente original. Son novedades generales, no avisos de cambios específicos en ${escape(name)}.</p><ul class="town-news-grid">${cards}</ul><p><a href="/blog/">Todas las noticias de televisión</a> · <a href="/servicios/reparacion-antenas-tdt/">Guía de averías TDT</a></p></section>`;
  return html.replace('</main>', block + '</main>');
}
export default async function townNews(request, context) {
  if (request.method !== 'GET') return context.next();
  const pathname = new URL(request.url).pathname.replace(/\/$/, '');
  if (!priority.has(pathname.split('/').at(-1))) return context.next();
  const response = await context.next();
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response;
  try {
    const origin = new URL(request.url).origin;
    const news = await fetch(origin + '/blog/', { signal: AbortSignal.timeout(4500) });
    if (!news.ok) return response;
    const articles = selectTownNews(await news.text(), pathname);
    if (!articles.length) return response;
    const html = insertTownNews(await response.text(), pathname, articles);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
    headers.set('x-antenas-zalla-town-news', 'server-rendered');
    return new Response(html, { status: response.status, headers });
  } catch {
    // Never make a town page unavailable because the news source is down.
    return response;
  }
}
export const config = { path: ['/antenas-bizkaia/*', '/antenas-burgos/*'] };
