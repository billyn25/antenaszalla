import { getStore } from '@netlify/blobs';
import backup from '../functions/novedades-tdt-backup.json' with { type: 'json' };
import { getNewsResponse, NEWS_COLLECTION_TIMEOUT_MS } from '../functions/novedades-tdt.mjs';
import { normaliseNews } from '../../src/blog-render.mjs';

const STORE_NAME = 'antenas-zalla-news';
const STORE_KEY = 'latest-v1';
const usable = data => data.items.length > 0 || data.satelliteChanges.length > 0;

async function boundedStoreRequest(operation, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new DOMException('News storage deadline exceeded', 'TimeoutError');
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try { return await Promise.race([operation(controller.signal), deadline]); }
  finally { clearTimeout(timer); }
}

export function createDurableNewsStore() {
  // Resolve the automatic Netlify credentials inside the invocation, not at import.
  const open = signal => getStore({
    name: STORE_NAME,
    consistency: 'strong',
    fetch: (url, options = {}) => fetch(url, {
      ...options,
      signal: options.signal ? AbortSignal.any([signal, options.signal]) : signal
    })
  });
  return {
    read: () => boundedStoreRequest(signal => open(signal).get(STORE_KEY, { type: 'json' }), 1800),
    write: snapshot => boundedStoreRequest(signal => open(signal).setJSON(STORE_KEY, snapshot), 3000)
  };
}

function validSnapshot(value, timestamp) {
  if (value?.version !== 1 || !Number.isFinite(value.fetchedAt) || value.fetchedAt <= 0 ||
      value.fetchedAt > timestamp || value.data?.backup === true) return null;
  const data = normaliseNews(value.data, timestamp);
  return usable(data) ? { version: 1, fetchedAt: value.fetchedAt, data } : null;
}

export function createNewsLoader({
  collect = getNewsResponse, now = Date.now, timeoutMs = NEWS_COLLECTION_TIMEOUT_MS,
  cacheMs = 300000, retryMs = 30000, reserve = backup, store = createDurableNewsStore()
} = {}) {
  let snapshot;
  let inFlight;
  let reading;
  let nextReadAt = 0;
  let retryAt = 0;

  const fresh = () => snapshot && now() - snapshot.fetchedAt < cacheMs;

  async function readLatest() {
    if (reading) return reading;
    if (!store || inFlight || fresh() || now() < nextReadAt) return;
    if (!reading) {
      reading = (async () => {
        nextReadAt = now() + retryMs;
        try {
          const candidate = validSnapshot(await store.read(), now());
          if (candidate && (!snapshot || candidate.fetchedAt > snapshot.fetchedAt)) snapshot = candidate;
        } catch (error) {
          console.warn('Blog: no se pudo leer la colección guardada', error.name || 'Error');
        }
      })().finally(() => { reading = null; });
    }
    await reading;
  }

  function current() {
    const timestamp = now();
    const data = normaliseNews(snapshot?.data || reserve, timestamp);
    const stale = !snapshot || timestamp - snapshot.fetchedAt >= cacheMs;
    return { ...data, backup: data.backup || stale, stale,
      refreshing: Boolean(inFlight), fetchedAt: snapshot?.fetchedAt ?? null };
  }

  function refresh() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const timestamp = now();
        const response = await collect({ now: timestamp, timeoutMs,
          signal: AbortSignal.timeout(timeoutMs), includeExcerpts: false });
        if (response.statusCode !== 200) throw new Error('Fuentes no disponibles');
        let data = normaliseNews(JSON.parse(response.body), now());
        if (data.backup || !usable(data)) throw new Error('No se obtuvo una colección nueva');
        if (data.partial) {
          const previous = normaliseNews(snapshot?.data || reserve, now());
          const urls = new Set(data.items.map(item => item.url));
          const retained = previous.items.filter(item => !urls.has(item.url));
          const retainSatellite = !data.satelliteChanges.length && previous.satelliteChanges.length > 0;
          data = normaliseNews({ ...data, items: [...retained, ...data.items],
            satelliteChanges: retainSatellite ? previous.satelliteChanges : data.satelliteChanges,
            partialBackup: retained.length > 0 || retainSatellite }, now());
        }
        // fetchedAt means a successful collection, never a new publication date.
        snapshot = { version: 1, fetchedAt: now(), data };
        retryAt = 0;
        if (store) {
          try { await store.write(snapshot); }
          catch (error) {
            // A persistence error must not throw away successfully collected news.
            console.warn('Blog: no se pudo guardar la nueva colección', error.name || 'Error');
          }
        }
      } catch (error) {
        // Preserve both the previous data and its real collection timestamp.
        retryAt = now() + retryMs;
        console.warn('Blog: se conserva la colección anterior', error.name || 'Error');
      }
    })().finally(() => { inFlight = null; });
    return inFlight;
  }

  return async function loadNews(context = {}) {
    await readLatest();
    if (fresh()) return current();
    if (!inFlight && now() >= retryAt) refresh();
    if (inFlight) {
      if (typeof context.waitUntil === 'function') {
        // Every request returns immediately, including concurrent requests.
        // Keep collection AND persistence alive after the HTML response is sent.
        context.waitUntil(inFlight);
      } else {
        // Direct/local callers have no lifecycle extension: await the result.
        await inFlight;
      }
    }
    return current();
  };
}
