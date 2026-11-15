import { createNewsLoader } from '../lib/blog-news-cache.mjs';

// Refresh the shared durable collection even when no visitor opens the blog.
// The blog's existing request-triggered refresh remains as a fallback.
export async function runScheduledNewsRefresh(load = createNewsLoader()) {
  // Without waitUntil, the loader awaits both collection and durable storage.
  const result = await load();
  const newest = result.items.reduce((latest, item) =>
    Math.max(latest, Date.parse(item.date) || 0), 0);
  const status = {
    articles: result.items.length,
    newestArticle: newest ? new Date(newest).toISOString() : null,
    fetchedAt: Number.isFinite(result.fetchedAt) ? new Date(result.fetchedAt).toISOString() : null,
    fallback: Boolean(result.backup),
    partial: Boolean(result.partial || result.partialBackup)
  };
  if (status.fallback) console.warn('Scheduled blog refresh used previously saved news', status);
  else console.info('Scheduled blog refresh completed', status);
  return status;
}

export default async function scheduledBlogRefresh() {
  await runScheduledNewsRefresh();
}

// Netlify invokes this independently of traffic to /blog/.
export const config = { schedule: '17 */4 * * *' };
