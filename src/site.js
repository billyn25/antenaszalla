(() => {
  // Interacción de interfaz y aviso informativo de privacidad. Sin analítica ni publicidad.
  const normalize = value => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const block of document.querySelectorAll('[data-locality-search]')) {
    const input = block.querySelector('input');
    const groups = [...block.querySelectorAll('[data-letter-group]')];
    const count = block.querySelector('[role="status"]');
    const filter = () => {
      const term = normalize(input.value.trim());
      let visible = 0;
      for (const group of groups) {
        let matches = 0;
        for (const item of group.querySelectorAll('[data-town]')) {
          item.hidden = !normalize(item.dataset.town).includes(term);
          if (!item.hidden) {
            matches++;
            visible++;
          }
        }
        group.hidden = matches === 0;
      }
      count.textContent = visible
        ? `${visible} localidades en esta selección`
        : 'Sin coincidencias en esta selección. Consulta por teléfono tu localidad.';
    };
    input.addEventListener('input', filter);
    block.querySelectorAll('.alphabet a').forEach(a => a.addEventListener('click', () => {
      input.value = '';
      filter();
    }));
    filter();
  }

  const privacyKey = 'antenaszalla-cookie-info-v1';
  const notice = document.querySelector('[data-cookie-notice]');
  if (notice) {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(privacyKey) === 'hidden';
    } catch {}
    if (!dismissed) notice.hidden = false;

    const dismiss = notice.querySelector('[data-cookie-dismiss]');
    if (dismiss) {
      dismiss.addEventListener('click', () => {
        notice.hidden = true;
        try {
          localStorage.setItem(privacyKey, 'hidden');
        } catch {}
      });
    }
  }
})();
