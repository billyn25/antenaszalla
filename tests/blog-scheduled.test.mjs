import test from 'node:test';
import assert from 'node:assert/strict';
import { runScheduledNewsRefresh, config } from '../netlify/functions/refresh-blog.mjs';

test('blog refresh runs without visitor traffic and awaits its loader', async () => {
  let finished = false;
  const result = await runScheduledNewsRefresh(async () => {
    await Promise.resolve();
    finished = true;
    return { items: [{ date: '2026-11-14T12:00:00.000Z' }], fetchedAt: Date.parse('2026-11-15T12:00:00Z'), backup: false };
  });
  assert.equal(finished, true);
  assert.equal(result.articles, 1);
  assert.equal(result.newestArticle, '2026-11-14T12:00:00.000Z');
  assert.equal(result.fallback, false);
  assert.match(config.schedule, /^17 \*\/4 \* \* \*$/);
});

test('blog refresh reports old reserve content without pretending it is fresh', async () => {
  const original = console.warn;
  console.warn = () => {};
  try {
    const result = await runScheduledNewsRefresh(async () => ({ items: [], backup: true, fetchedAt: null }));
    assert.equal(result.fallback, true);
    assert.equal(result.fetchedAt, null);
    assert.equal(result.newestArticle, null);
  } finally { console.warn = original; }
});
