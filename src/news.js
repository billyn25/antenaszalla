import { satCescCategories, mundoCategories, fetchSatCescPosts, fetchMundoPosts, selectNews, pageSize } from './news-sources.mjs?v=2';

(async () => {
  const list = document.querySelector('#news-items');
  const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });

  async function getJson(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(22000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  const [news, towns] = await Promise.allSettled([
    getJson('/.netlify/functions/novedades-tdt'),
    getJson('/assets/news-towns.json')
  ]);

  const townPool = towns.status === 'fulfilled' ? towns.value : [];
  const featured = new Set();
  function townLinksFor(url) {
    const score = route => {
      let hash = 2166136261;
      for (const char of url + '|' + route) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
      return hash >>> 0;
    };
    const pair = townPool.filter(town => !featured.has(town.route))
      .map(town => ({ town, score: score(town.route) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);
    if (pair.length < 2) return null;
    const footer = document.createElement('footer');
    footer.className = 'news-town-links';
    const links = pair.map(({ town }) => {
      featured.add(town.route);
      const link = document.createElement('a');
      link.href = town.route;
      link.textContent = `Antenista en ${town.name}`;
      return link;
    });
    footer.append(...links);
    return footer;
  }

  const data = news.status === 'fulfilled' ? news.value : {};
  if (Array.isArray(data.satelliteChanges)) {
    const changes = document.querySelector('#satellite-changes');
    const empty = document.querySelector('#satellite-changes-empty');
    const eventText = {
      'Cambio de frecuencia': 'cambió de frecuencia en',
      'Nuevo canal': 'se incorporó a las emisiones de',
      'Fin de emisión': 'dejó de emitir en'
    };
    changes.replaceChildren(...data.satelliteChanges.map(item => {
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = 'Consultar el listado en KingOfSat';
      const date = document.createElement('time');
      date.dateTime = item.date;
      date.textContent = dateFormat.format(new Date(item.date));
      const heading = document.createElement('strong');
      heading.textContent = item.channel + ' · ' + item.change;
      const summary = document.createElement('p');
      const event = eventText[item.change];
      summary.textContent = event
        ? 'KingOfSat registró que ' + item.channel + ' ' + event + ' ' + item.position + '.'
        : 'Aviso de KingOfSat para ' + item.channel + ' en ' + item.position + '.';
      row.append(heading, ' · ', date, summary, link);
      return row;
    }));
    changes.hidden = !data.satelliteChanges.length;
    empty.hidden = Boolean(data.satelliteChanges.length);
  }

  const satMissing = news.status === 'fulfilled' ? data.satCescMissing || [] : Object.keys(satCescCategories);
  const mundoMissing = news.status === 'fulfilled' ? data.mundoMissing || [] : Object.keys(mundoCategories);
  let items = data.items || [];
  if (satMissing.length || mundoMissing.length) {
    const now = Date.now();
    const results = await Promise.allSettled([
      ...satMissing.map(section => fetchSatCescPosts(section, now)),
      ...mundoMissing.map(section => fetchMundoPosts(section, now))
    ]);
    const recovered = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    if (recovered.length) items = selectNews([...items, ...recovered]);
  }
  if (items.length) {
    const pageCount = Math.ceil(items.length / pageSize);
    const pagination = document.querySelector('#news-pagination');
    const previous = document.querySelector('#news-previous');
    const next = document.querySelector('#news-next');
    const status = document.querySelector('#news-page-status');
    const heading = document.querySelector('#noticias-tdt');
    let page = 0;
    function renderPage() {
      featured.clear();
      const start = page * pageSize;
      const pageItems = items.slice(start, start + pageSize);
      list.replaceChildren(...pageItems.map(item => {
        const row = document.createElement('li');
        const content = document.createElement('div');
        const date = document.createElement('time');
        date.dateTime = item.date;
        date.textContent = `${item.type} · ${dateFormat.format(new Date(item.date))}`;
        const link = document.createElement('a');
        link.href = item.url;
        link.textContent = item.label + ' · ' + (item.publisher || 'Mundoplus');
        content.append(date, document.createElement('br'), link);
        if (item.paragraphs?.length) {
          const context = document.createElement('small');
          context.textContent = item.excerptType + (item.modified ? ' · Actualizado el ' + item.modified : '');
          content.append(document.createElement('br'), context);
          for (const text of item.paragraphs) {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            content.append(paragraph);
          }
        }
        const footer = townLinksFor(item.url);
        if (footer) content.append(footer);
        row.append(content);
        return row;
      }));
      list.hidden = false;
      previous.disabled = page === 0;
      next.disabled = page === pageCount - 1;
      status.textContent = `Página ${page + 1} de ${pageCount} · ${items.length} noticias`;
    }
    function changePage(step) {
      const target = page + step;
      if (target < 0 || target >= pageCount) return;
      page = target;
      renderPage();
      heading.focus();
    }
    previous.addEventListener('click', () => changePage(-1));
    next.addEventListener('click', () => changePage(1));
    pagination.hidden = pageCount < 2;
    renderPage();
  }

})();
