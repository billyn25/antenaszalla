(async () => {
  const list = document.querySelector('#news-items');
  const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });

  const receptionNotes = {
    'Cambios en las emisiones de prueba en UHD': 'Una señal de pruebas puede entrar o salir del listado durante los ajustes de emisión. Si siguen funcionando tus canales habituales, comprueba primero el anuncio del cambio antes de volver a sintonizar. Si también han desaparecido otros canales, apunta cuáles y prueba otra toma. Una prueba de emisión y un fallo de antena pueden coincidir, y saber qué señales siguen entrando ayuda a separar las dos situaciones.',
    'Calidad de imagen y sonido en los canales UHD': 'Si un canal UHD se ve pero presenta cortes, prueba el mismo canal en otra toma. Así puedes distinguir un problema de recepción de un ajuste que solo afecta a ese televisor. Si falla únicamente el sonido, comprueba si usas los altavoces de la tele o una barra de sonido. Si la imagen se congela en varios televisores a la vez, anota el canal y la hora para la revisión de señal.',
    'Recepción de laSexta en ultra alta definición': 'Si ves laSexta en HD pero no encuentras su versión UHD, comprueba primero la cobertura en tu zona y que el sintonizador de tu modelo admita DVB‑T2 y HEVC. Si tienes otro televisor compatible conectado a la misma antena, búscalo también ahí. Indicar si falta solo la versión UHD o también la HD ayuda a preparar una revisión.',
    'Novedades de sintonización y canales TDT': 'Tras un cambio de canales, compara la recepción en dos televisores antes de modificar la instalación. En un edificio con antena colectiva, confirma si ocurre también en otras viviendas. Si varias teles pierden el mismo grupo de canales, anota los nombres en lugar de borrar el listado de nuevo. Así se puede comprobar si comparten frecuencia y en qué punto conviene medir.',
    'Cambios de frecuencias en la TDT': 'Si desaparece un grupo de canales a la vez, anota cuáles son. Ese dato ayuda a comprobar si pertenecen a la misma frecuencia y a revisar la señal en la antena o en la cabecera.',
    'Cambios de frecuencia por satélite': 'Comprueba que el cambio se refiere al satélite que recibe tu instalación. Guarda los datos del canal afectado para revisar la sintonización en el receptor.',
    'Novedades de recepción por satélite': 'Si cambia la recepción de varios canales, apunta el mensaje del receptor y qué canales siguen funcionando. Esa comparación ayuda a orientar la revisión de señal.',
    'Novedades de televisión en ultra alta definición': 'Consulta la ficha de tu televisor antes de resintonizar. Una pantalla 4K puede tener un sintonizador con prestaciones distintas de las necesarias para recibir el canal.'
  };

  async function getJson(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(16000) });
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
      const note = document.createElement('p');
      note.textContent = receptionNotes[item.label] || '';
      if (note.textContent) content.append(note);
      const footer = townLinksFor(item.url);
      if (footer) content.append(footer);
      row.append(content);
      return row;
    }));
    list.hidden = false;
  }

})();
