// Local pages keep their opening/final actions; reading guides have one final
// consultation and the persistent site contact. Service cards link to guides.
export function simplifyContacts(html) {
  if (!html.includes('id="contacto"')) return html;
  const readingGuide=/<body\b[^>]*class="[^"]*\bservice-page\b/.test(html);
  html=html.replace(/ · Consulta disponibilidad en el <a href="tel:[^"]+">[^<]+<\/a>\./g,' · Consulta disponibilidad antes de la visita.');
  html=html.replace(/Seguimos en antenaszalla.com, con contacto en el <a href="tel:[^"]+">[^<]+<\/a>\./g,'Seguimos en antenaszalla.com.');
  html=html.replace(/Contacto: <a href="tel:[^"]+">[^<]+<\/a>\./g,'');
  const saved=[];
  const protect=block=>`<!--contact-policy-${saved.push(block)-1}-->`;
  if(readingGuide) html=html.replace(/<header\b[\s\S]*?<\/header>/,protect);
  html=html.replace(/<section\b[^>]*(?:class="[^"]*\bhero\b[^"]*"|id="contacto")[^>]*>[\s\S]*?<\/section>/g,block=>readingGuide&&!/\bid="contacto"/.test(block)?block:protect(block));
  html=html.replace(/<div class="mobilebar">[\s\S]*?<\/div>/g,protect);
  html=html.replace(/<a\b[^>]*data-enquiry-wa[^>]*>[\s\S]*?<\/a>/g,protect);
  html=html.replace(/<a\b[^>]*href="(?:tel:|https:\/\/(?:wa.me|api.whatsapp.com)\/)[^"]*"[^>]*>[\s\S]*?<\/a>/g,'');
  // Remove now empty contact wrappers and phone repetitions in local eyebrows.
  html=html.replace(/<div class="(?:actions|local-contact|desk-contact)">\s*(?:<[^>]+>\s*<\/[^>]+>\s*)*<\/div>/g,'');
  html=html.replace(/(<span class="eyebrow">Servicio en [^<]*?) · (?:\+34\s*)?\d[\d ]{7,}<\/span>/g,'$1</span>');
  html=html.replace('<strong>Contacto</strong><p><br></p>', '<strong>Contacto</strong><p><a href="#contacto">Consultar la instalación →</a></p>');
  html=html.replace(/<!--contact-policy-(\d+)-->/g,(_,i)=>saved[Number(i)]);
  return html;
}
