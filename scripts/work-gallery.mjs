import fs from 'node:fs';
import path from 'node:path';
import gallery from '../content/work-gallery.json' with {type: 'json'};

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));

// Original photographs supplied for the site, retained without recompression.
// Descriptions identify visible elements only; no per-photo place or result is inferred.
export function copyWorkGallery(root) {
  if (gallery.length !== 12 || new Set(gallery.map(item => item.file)).size !== 12) {
    throw new Error('La galería debe contener exactamente 12 fotografías diferentes');
  }
  const target = path.join(root, 'assets', 'galeria');
  fs.mkdirSync(target, {recursive: true});
  for (const item of gallery) {
    if (!/^trabajo-\d{2}\.jpg$/.test(item.file)) throw new Error(`Nombre de fotografía inválido: ${item.file}`);
    const original = new URL(`../src/assets/gallery/${item.file}`, import.meta.url);
    if (fs.statSync(original).size < 2000) throw new Error(`Fotografía vacía o incompleta: ${item.file}`);
    fs.copyFileSync(original, path.join(target, item.file));
  }
  return gallery;
}

export const galleryStyle = `<style id="zalla-gallery-style">
.gallery-section{padding:48px 0;background:#fff;border-top:1px solid var(--line)}
.gallery-head{display:flex;align-items:end;justify-content:space-between;gap:32px;margin-bottom:26px}
.gallery-head h2{margin:8px 0 0}.gallery-head p{max-width:550px;margin:0;color:var(--muted);font-size:15px;line-height:1.7}
.gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.gallery-grid figure{display:flex;flex-direction:column;margin:0;min-width:0;overflow:hidden;border-radius:8px;border:1px solid #d9e5eb;background:#fff}
.gallery-open{position:relative;display:block;width:100%;height:auto;aspect-ratio:4/3;overflow:hidden;padding:0;border:0;background:#edf2f5;cursor:zoom-in}
.gallery-open img{display:block;width:100%;height:100%;object-fit:contain;transition:transform .25s ease}
.gallery-open:hover img,.gallery-open:focus-visible img{transform:scale(1.025)}
.gallery-open:focus-visible{outline:3px solid #2d789f;outline-offset:-4px}
.gallery-zoom-label{position:absolute;bottom:10px;right:10px;padding:5px 9px;border:1px solid rgba(255,255,255,.3);border-radius:4px;background:rgba(15,45,61,.91);color:#fff;font-size:12px;font-weight:700;line-height:1.5;pointer-events:none}
.gallery-grid figcaption{display:flex;flex:1;gap:12px;padding:18px 16px;color:#37596b;font-size:14px;line-height:1.6}
.gallery-number{padding-top:3px;color:#397a98;font-size:12px;font-weight:800;letter-spacing:.06em}
.gallery-caption-content{display:flex;flex:1;flex-direction:column;min-width:0}
.gallery-caption-content h3{margin:0;color:#14394c;font-size:18px;line-height:1.35}
.gallery-caption-content p{margin:9px 0 14px;font-size:14px;line-height:1.65}
.gallery-caption-content a{display:flex;align-items:center;width:fit-content;min-height:44px;margin-top:auto;padding:4px 0;color:#1b6389;font-size:13px;font-weight:750;text-decoration:underline;text-underline-offset:3px}
.gallery-caption-content a:hover{color:#103d56}.gallery-caption-content a:focus-visible{outline:3px solid #2d789f;outline-offset:4px}
.gallery-lightbox{width:min(96vw,1180px);max-width:none;max-height:94vh;max-height:94dvh;padding:0;border:1px solid #3b5260;border-radius:10px;background:#101d25;color:#fff;box-shadow:0 28px 90px rgba(0,0,0,.55)}
.gallery-lightbox[open]{display:flex;flex-direction:column}
.gallery-lightbox::backdrop{background:rgba(8,16,22,.9);backdrop-filter:blur(2px)}
.gallery-lightbox-toolbar{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-shrink:0;padding:12px 16px;border-bottom:1px solid #3b5260;background:#162b38}
.gallery-lightbox-title{margin:0;color:#fff;font-size:18px;line-height:1.35}
.gallery-lightbox-close{display:inline-flex;align-items:center;justify-content:center;gap:10px;flex-shrink:0;min-width:100px;min-height:44px;padding:7px 12px;border:1px solid #b5cad6;border-radius:5px;background:#fff;color:#14394c;font:inherit;font-size:15px;font-weight:750;line-height:1;cursor:pointer}
.gallery-lightbox-close span{font-size:26px;font-weight:400}.gallery-lightbox-close:hover{background:#deedf5}.gallery-lightbox-close:focus-visible{outline:3px solid #8ed3fa;outline-offset:3px}
.gallery-lightbox-inner{display:grid;place-items:center;min-height:0;overflow:auto;background:#101d25}
.gallery-lightbox img{display:block;max-width:100%;max-height:calc(94vh - 160px);max-height:calc(94dvh - 160px);width:auto;height:auto;object-fit:contain}
.gallery-lightbox-description{flex-shrink:0;margin:0;padding:12px 16px;color:#d9e7ee;font-size:14px;line-height:1.5}
@media(max-width:900px){.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gallery-head{align-items:start;flex-direction:column;gap:14px}.gallery-head p{max-width:680px}}
@media(max-width:560px){.gallery-section{padding:34px 0}.gallery-grid{grid-template-columns:minmax(0,1fr);gap:18px}.gallery-head h2{font-size:28px}.gallery-lightbox-toolbar{gap:10px;padding:10px}.gallery-lightbox-title{font-size:15px}.gallery-lightbox-close{min-width:92px}.gallery-lightbox-description{padding:10px;font-size:13px}.gallery-lightbox img{max-height:calc(94vh - 172px);max-height:calc(94dvh - 172px)}}
@media(prefers-reduced-motion:reduce){.gallery-open img{transition:none}.gallery-open:hover img,.gallery-open:focus-visible img{transform:none}}
</style>`;

export function renderWorkGallery(items = gallery) {
  const cards = items.map((item, index) => {
    const number = String(index + 1).padStart(2, '0');
    const src = `/assets/galeria/${item.file}`;
    return `<figure><button class="gallery-open" type="button" data-src="${src}" data-alt="${escapeHtml(item.alt)}" data-title="${escapeHtml(item.title)}" data-description="${escapeHtml(item.description)}" aria-label="Ampliar fotografía ${number}: ${escapeHtml(item.title)}" aria-haspopup="dialog" aria-controls="gallery-lightbox"><img src="${src}" alt="${escapeHtml(item.alt)}" loading="lazy" decoding="async" width="${item.width}" height="${item.height}"><span class="gallery-zoom-label" aria-hidden="true">Ampliar foto ↗</span></button><figcaption><span class="gallery-number" aria-hidden="true">${number}</span><div class="gallery-caption-content"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><a href="${escapeHtml(item.servicePath)}">${escapeHtml(item.serviceLabel)}</a></div></figcaption></figure>`;
  }).join('');
  return `<section class="gallery-section" id="galeria" aria-labelledby="gallery-heading"><div class="wrap"><div class="gallery-head"><div><span class="eyebrow">Trabajos e instalaciones</span><h2 id="gallery-heading">Galería de trabajos reales</h2></div><p>Fotografías de trabajos de Antenas Zalla en pueblos cercanos a Zalla y en el norte de Burgos: antenas, cabeceras de televisión y sistemas de acceso. Amplía cada foto para ver los detalles.</p></div><div class="gallery-grid">${cards}</div></div></section><dialog class="gallery-lightbox" id="gallery-lightbox" aria-labelledby="gallery-lightbox-title" aria-describedby="gallery-lightbox-description"><div class="gallery-lightbox-toolbar"><h2 class="gallery-lightbox-title" id="gallery-lightbox-title">Fotografía de instalación</h2><button class="gallery-lightbox-close" type="button" aria-label="Cerrar imagen ampliada" autofocus>Cerrar <span aria-hidden="true">×</span></button></div><div class="gallery-lightbox-inner"><img alt=""></div><p class="gallery-lightbox-description" id="gallery-lightbox-description"></p></dialog>`;
}

export const galleryScript = `<script id="zalla-gallery-script">
(()=>{
  const dialog=document.getElementById('gallery-lightbox');
  if(!dialog) return;
  const modalImg=dialog.querySelector('img');
  const close=dialog.querySelector('.gallery-lightbox-close');
  const title=document.getElementById('gallery-lightbox-title');
  const description=document.getElementById('gallery-lightbox-description');
  let opener=null;
  let previousOverflow='';
  document.querySelectorAll('.gallery-open').forEach(btn=>btn.addEventListener('click',()=>{
    opener=btn;
    modalImg.src=btn.dataset.src||'';
    modalImg.alt=btn.dataset.alt||'';
    title.textContent=btn.dataset.title||'Fotografía de instalación';
    description.textContent=btn.dataset.description||'';
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    dialog.showModal();
    close.focus({preventScroll:true});
  }));
  const shut=()=>{if(dialog.open) dialog.close();};
  close.addEventListener('click',shut);
  dialog.addEventListener('click',event=>{if(event.target===dialog) shut();});
  dialog.addEventListener('close',()=>{
    modalImg.removeAttribute('src');
    document.body.style.overflow=previousOverflow;
    if(opener) opener.focus({preventScroll:true});
  });
})();
</script>`;
