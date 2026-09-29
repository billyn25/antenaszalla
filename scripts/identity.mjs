import pages from '../content/pages.json' with { type: 'json' };

// Redacción común aprobada. No recortar para encajar un contador de caracteres.
export const SERVICE_STATEMENT = 'Técnico en instalación, reparación y mantenimiento de antenas, porteros automáticos y videoporteros';

export function locationLabel(page) {
  if (page.type !== 'town') return page.name;
  const parent = pages.find(p => p.type === 'province' && p.path === page.parent);
  return parent ? `${page.name}, ${parent.name}` : page.name;
}

export function localMetadata(page, site) {
  const place = locationLabel(page);
  const scope = page.type === 'home' ? `${site.brand}. Antenistas en tu pueblo` : `${page.type === 'town' ? 'Antenista' : 'Antenistas'} en ${place}`;
  const emergency = page.urgentLabel ? `${page.urgentLabel}. ` : '';
  const defaultDescription = `${scope}. ${emergency}☎ ${site.phone}. Antenas colectivas e individuales. ${SERVICE_STATEMENT}.`;
  return {
    title: page.type === 'town' ? `${scope} | ${site.phone}` : page.title,
    description: page.seoDescription || defaultDescription,
    heading: page.type === 'town' ? `Antenista en ${place}` : page.heading,
    statement: SERVICE_STATEMENT
  };
}
