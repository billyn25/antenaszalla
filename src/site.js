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

  const menuButton = document.querySelector('.menu-toggle');
  const menuNav = document.querySelector('#site-navigation');
  if (menuButton && menuNav) {
    const header = menuButton.closest('header');
    const setMenu = open => {
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      header.dataset.menuOpen = String(open);
    };
    header.dataset.mobileNav = 'ready';
    setMenu(false);
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    menuNav.addEventListener('click', event => {
      if (event.target.closest('a')) setMenu(false);
    });
    header.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuButton.focus({preventScroll:true});
      }
    });
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

/* Consulta local: prepara el enlace sin enviar datos ni guardar el texto. */
(() => {
 const panel=document.querySelector('[data-local-enquiry]');
 if(!panel)return;
 const get=s=>panel.querySelector('[data-enquiry-'+s+']');
 const province=get('province'),town=get('town'),search=get('search'),problem=get('problem'),detail=get('detail'),hint=get('hint'),whatsapp=get('wa'),route=get('route'),count=get('count');
 const towns=JSON.parse(get('towns').textContent);
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
 const update=()=>{
  const selected=town.options[town.selectedIndex];
  const valid=!!selected;
  whatsapp.hidden=!valid;route.hidden=!valid;
  if(!valid)return;
  const extra=detail.value.trim().slice(0,600);
  const message=`Hola, necesito consultar un servicio en ${town.value}, ${province.value}.\nProblema: ${problem.value}.${extra?'\nDetalles: '+extra:''}\n¿Podéis confirmarme disponibilidad y condiciones de revisión?`;
  whatsapp.href='https://wa.me/34670042626?text='+encodeURIComponent(message);
  route.href=selected.dataset.route;route.textContent='Ver servicio en '+town.value+' →';
  hint.textContent=problem.options[problem.selectedIndex].dataset.hint;
 };
 const filter=()=>{
  const previous=town.value,q=normalize(search.value);
  const matches=towns.filter(t=>t.province===province.value&&normalize(t.name).includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  town.replaceChildren();
  for(const t of matches){const option=document.createElement('option');option.value=t.name;option.textContent=t.name;option.dataset.route=t.route;town.appendChild(option);}
  if(matches.some(t=>t.name===previous))town.value=previous;
  count.textContent=matches.length?matches.length+' municipios en '+province.value:'No encontramos ese nombre en esta provincia. Prueba otra provincia o borra la búsqueda.';
  update();
 };
 province.addEventListener('change',()=>{search.value='';filter();});
 search.addEventListener('input',filter);
 panel.addEventListener('input',update);panel.addEventListener('change',update);
 update();panel.hidden=false;
})();
