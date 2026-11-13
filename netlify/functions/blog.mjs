import fs from 'node:fs';
import path from 'node:path';
import backup from './novedades-tdt-backup.json' with { type: 'json' };
import { getNewsResponse } from './novedades-tdt.mjs';
import { BLOG_DOMAIN, parseBlogPath, normaliseNews, renderBlogHtml } from '../../src/blog-render.mjs';

const RESPONSE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, durable, max-age=300, stale-while-revalidate=3600',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
const ERROR_HTML = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página no disponible | Antenas Zalla</title><meta name="robots" content="noindex,follow"></head><body><main><h1>Esta página de noticias no está disponible</h1><p>Consulta la selección actual de noticias de TDT y satélite.</p><a href="/blog/">Volver al blog de Antenas Zalla</a></main></body></html>';

export function createNewsLoader({ collect = getNewsResponse, now = Date.now, timeoutMs = 6500, cacheMs = 300000, reserve = backup } = {}) {
  let cached;
  let cachedAt = 0;
  let inFlight;
  return async function loadNews() {
    const timestamp = now();
    if (cached && timestamp - cachedAt < cacheMs) return cached;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const response = await collect({ now: timestamp, signal: AbortSignal.timeout(timeoutMs), includeExcerpts: false });
        if (response.statusCode !== 200) throw new Error('Fuentes no disponibles');
        let data = normaliseNews(JSON.parse(response.body), timestamp);
        if (!data.items.length && !data.satelliteChanges.length) throw new Error('Selección sin noticias recientes');
        if (!data.backup) {
          if (data.partial) {
            const previous = normaliseNews(cached || reserve, timestamp);
            const currentUrls = new Set(data.items.map(item => item.url));
            const retained = previous.items.filter(item => !currentUrls.has(item.url));
            const retainSatellite = !data.satelliteChanges.length && previous.satelliteChanges.length > 0;
            data = normaliseNews({ ...data,
              items: [...retained, ...data.items],
              satelliteChanges: retainSatellite ? previous.satelliteChanges : data.satelliteChanges,
              partialBackup: retained.length > 0 || retainSatellite
            }, timestamp);
          }
          cached = data;
          cachedAt = timestamp;
          return data;
        }
      } catch (error) {
        console.warn('Blog: se utiliza la reserva de noticias', error.name || 'Error');
      }
      // Retain the dates and mark a reserve explicitly; do not make old entries fresh.
      const fallback = normaliseNews(cached || reserve, timestamp);
      const result = { ...fallback, backup: true };
      cached = result;
      cachedAt = timestamp;
      return result;
    })();
    try { return await inFlight; } finally { inFlight = null; }
  };
}

function loadTemplate() {
  return fs.readFileSync(path.join(process.cwd(), 'dist/blog/index.html'), 'utf8');
}

function loadTowns() {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'dist/assets/news-towns.json'), 'utf8')); }
  catch { return []; }
}

export function createBlogHandler({ template = loadTemplate, towns = loadTowns, news = createNewsLoader(), now = Date.now } = {}) {
  return async function handleBlog(request) {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {
      status: 405, headers: { ...RESPONSE_HEADERS, Allow: 'GET, HEAD', 'Netlify-CDN-Cache-Control': 'no-store' }
    });
    const route = parseBlogPath(new URL(request.url).pathname);
    if (!route) return new Response(request.method === 'HEAD' ? null : ERROR_HTML, {
      status: 404, headers: { ...RESPONSE_HEADERS, 'Netlify-CDN-Cache-Control': 'public, durable, max-age=60', 'X-Robots-Tag': 'noindex, follow' }
    });
    if (new URL(request.url).pathname !== route.canonicalPath) return new Response(null, {
      status: 301, headers: { Location: BLOG_DOMAIN + route.canonicalPath, 'Cache-Control': 'public, max-age=3600' }
    });
    try {
      const [shell, townPool, data] = await Promise.all([template(), towns(), news()]);
      const html = renderBlogHtml(shell, data, { page: route.page, towns: townPool, now: now() });
      if (html === null) return new Response(request.method === 'HEAD' ? null : ERROR_HTML, {
        status: 404, headers: { ...RESPONSE_HEADERS, 'Netlify-CDN-Cache-Control': 'public, durable, max-age=60', 'X-Robots-Tag': 'noindex, follow' }
      });
      return new Response(request.method === 'HEAD' ? null : html, {
        headers: { ...RESPONSE_HEADERS, 'X-Antenas-Zalla-News': data.backup ? 'reserva' : data.partialBackup ? 'mixta' : 'actual' }
      });
    } catch (error) {
      console.error('Blog: no se pudo preparar el documento', error.message);
      return new Response(request.method === 'HEAD' ? null : ERROR_HTML, {
        status: 503, headers: { ...RESPONSE_HEADERS, 'Netlify-CDN-Cache-Control': 'no-store', 'Retry-After': '300', 'X-Robots-Tag': 'noindex, follow' }
      });
    }
  };
}

export default createBlogHandler();
export const config = {
  path: ['/blog', '/blog/', '/blog/pagina/*'],
  preferStatic: false
};
