// Marca vectorial compartida por cabecera, logotipo descargable y favicon.
// El símbolo mantiene su lectura en tamaños pequeños y no depende de imágenes.
export function brandMark(){
 return `<span class="zalla-brand-logo-base zalla-brand-logo" role="img" aria-label="Antenas Zalla">
 <svg class="zalla-logo-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
   <rect x="1" y="1" width="62" height="62" rx="16" fill="currentColor"/>
   <g fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
     <path d="M13 45 29 32l16 13M20 41v10h18V41M29 32V16M19 21h20M23 16v10M35 16v10"/>
   </g>
   <path d="M45 15a15 15 0 0 1 8 13M44 23a7 7 0 0 1 3 6" fill="none" stroke="#79d2ef" stroke-width="3" stroke-linecap="round"/>
 </svg>
 <span class="zalla-wordmark"><span>ANTENAS</span><b>ZALLA</b></span>
 </span>`;
}

export function brandLogoSvg(){
 const icon=brandMark().match(/<svg[\s\S]*?<\/svg>/)[0]
  .replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" x="16" y="16" width="128" height="128" ');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160" viewBox="0 0 480 160" role="img" aria-label="Antenas Zalla"><rect width="480" height="160" rx="16" fill="#fff"/><g color="#0b2d48">${icon}<text x="167" y="61" font-family="Arial,sans-serif" font-size="27" font-weight="700" letter-spacing="5" fill="#2d789f">ANTENAS</text><text x="163" y="123" font-family="Arial,sans-serif" font-size="72" font-weight="800" letter-spacing="-2" fill="currentColor">ZALLA</text></g></svg>`;
}
