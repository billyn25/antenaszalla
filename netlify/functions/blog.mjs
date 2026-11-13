import fs from 'node:fs';
import path from 'node:path';
import { BLOG_DOMAIN, parseBlogPath, renderBlogHtml } from '../../src/blog-render.mjs';
import { createNewsLoader } from '../lib/blog-news-cache.mjs';
export { createNewsLoader } from '../lib/blog-news-cache.mjs';

export const BLOG_RELEASE = 'durable-news-v1';

const RESPONSE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, durable, max-age=300',
  'X-Antenas-Zalla-Blog-Release': BLOG_RELEASE,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
const ERROR_HTML = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página no disponible | Antenas Zalla</title><meta name="robots" content="noindex,follow"></head><body><main><h1>Esta página de noticias no está disponible</h1><p>Consulta la selección actual de noticias de TDT y satélite.</p><a href="/blog/">Volver al blog de Antenas Zalla</a></main></body></html>';

function loadTemplate() {
  return fs.readFileSync(path.join(process.cwd(), 'dist/blog/index.html'), 'utf8');
}

function loadTowns() {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'dist/assets/news-towns.json'), 'utf8')); }
  catch { return []; }
}

export function createBlogHandler({ template = loadTemplate, towns = loadTowns, news = createNewsLoader(), now = Date.now } = {}) {
  return async function handleBlog(request, context = {}) {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {
      status: 405, headers: { ...RESPONSE_HEADERS, Allow: 'GET, HEAD', 'Netlify-CDN-Cache-Control': 'no-store' }
    });
    const route = parseBlogPath(new URL(request.url).pathname);
    if (!route) return new Response(request.method === 'HEAD' ? null : ERROR_HTML, {
      status: 404, headers: { ...RESPONSE_HEADERS, 'Netlify-CDN-Cache-Control': 'public, durable, max-age=60', 'X-Robots-Tag': 'noindex, follow' }
    });
    if (new URL(request.url).pathname !== route.canonicalPath) return new Response(null, {
      status: 301, headers: { Location: BLOG_DOMAIN + route.canonicalPath, 'Cache-Control': 'public, max-age=3600', 'X-Antenas-Zalla-Blog-Release': BLOG_RELEASE }
    });
    try {
      const [shell, townPool, data] = await Promise.all([template(), towns(), news(context)]);
      const html = renderBlogHtml(shell, data, { page: route.page, towns: townPool, now: now() });
      if (html === null) return new Response(request.method === 'HEAD' ? null : ERROR_HTML, {
        status: 404, headers: { ...RESPONSE_HEADERS, 'Netlify-CDN-Cache-Control': 'public, durable, max-age=60', 'X-Robots-Tag': 'noindex, follow' }
      });
      return new Response(request.method === 'HEAD' ? null : html, {
        headers: { ...RESPONSE_HEADERS,
          'Netlify-CDN-Cache-Control': `public, durable, max-age=${data.refreshing || data.stale || data.backup || data.partialBackup ? 30 : 300}`,
          'X-Antenas-Zalla-News': data.backup ? 'reserva' : data.partialBackup ? 'mixta' : 'actual',
          'X-Antenas-Zalla-News-Refreshing': data.refreshing ? '1' : '0',
          ...(Number.isFinite(data.fetchedAt) ? { 'X-Antenas-Zalla-News-Fetched-At': new Date(data.fetchedAt).toISOString() } : {})
        }
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
