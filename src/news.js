(async () => {
  const list = document.querySelector('#news-items');
  const status = document.querySelector('#news-status');
  const townLinks = document.querySelector('#news-towns');
  const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });

  async function getJson(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(16000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  status.textContent = 'Cargando novedades…';
  status.hidden = false;
  const [news, towns] = await Promise.allSettled([
    getJson('/.netlify/functions/novedades-tdt'),
    getJson('/assets/news-towns.json')
  ]);

  const items = news.status === 'fulfilled' ? news.value.items : [];
  if (items.length) {
    list.replaceChildren(...items.map(item => {
      const row = document.createElement('li');
      const content = document.createElement('div');
      const date = document.createElement('time');
      date.dateTime = item.date;
      date.textContent = `${item.type} · ${dateFormat.format(new Date(item.date))}`;
      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.label + ' · Mundoplus';
      content.append(date, document.createElement('br'), link);
      row.append(content);
      return row;
    }));
    list.hidden = false;
    const backup = news.value.backup;
    status.textContent = backup ? 'Última selección disponible. La fuente está temporalmente inaccesible.' : '';
    status.hidden = !backup;
  } else {
    status.textContent = news.status === 'fulfilled'
      ? 'No hay novedades recientes de TDT o satélite en este momento.'
      : 'Las novedades no están disponibles ahora. Puedes consultar Mundoplus en el enlace de arriba.';
  }

  if (towns.status === 'fulfilled' && towns.value.length >= 3) {
    // Keep the same selection between visits until the visible news changes.
    const seed = items.map(item => item.url).join('|') || new Date().toISOString().slice(0, 10);
    let hash = 2166136261;
    for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    const start = (hash >>> 0) % towns.value.length;
    const step = Math.floor(towns.value.length / 3);
    townLinks.prepend(...[0, 1, 2].map(index => {
      const town = towns.value[(start + index * step) % towns.value.length];
      const link = document.createElement('a');
      link.href = town.route;
      link.textContent = `Antenista en ${town.name}`;
      return link;
    }));
  }
})();
