import pages from '../content/pages.json' with { type: 'json' };
import {displayPlaceName,townSeoMetadata,provinceSeoMetadata,homeSeoMetadata} from './seo-metadata.mjs';

// Redacción común aprobada. No recortar para encajar un contador de caracteres.
export const SERVICE_STATEMENT = 'Técnico en instalación, reparación y mantenimiento de antenas, porteros automáticos y videoporteros';

export function locationLabel(page) {
  if (page.type !== 'town') return displayPlaceName(page.name);
  const parent = pages.find(p => p.type === 'province' && p.path === page.parent);
  const name=displayPlaceName(page.name);
  return parent&&name!==parent.name ? `${name}, ${parent.name}` : name;
}

export function localMetadata(page, site) {
  const parent=pages.find(p=>p.type==='province'&&p.path===page.parent);
  const metadata=page.type==='home'?homeSeoMetadata():page.type==='province'?provinceSeoMetadata(page.name):townSeoMetadata({...page,province:page.province||parent?.name});
  return {
    ...metadata,
    statement: SERVICE_STATEMENT
  };
}
