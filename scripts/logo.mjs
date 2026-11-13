// Logotipo SVG propio Antenas Zalla: antena TDT + parabólica, sin imagen externa.
export function brandMark(){
 return `<span class="zalla-brand-logo-base zalla-brand-logo" role="img" aria-label="Antenas Zalla">
 <svg class="zalla-logo-icon" viewBox="0 0 96 76" aria-hidden="true" focusable="false">
   <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
     <path d="M9 66h73" stroke-width="4"/>
     <path d="M18 65 39 45l20 20" stroke-width="5"/>
     <path d="M29 55V20" stroke-width="4"/>
     <path d="M16 22h31M19 17l25 10M20 28l24-12" stroke-width="3"/>
     <path d="M22 14v16M29 12v20M36 14v16M43 17v10" stroke-width="2.5"/>
     <path d="M58 47c-9-4-14-13-11-22 12 2 22 10 25 21-4 4-9 5-14 1Z" stroke-width="4"/>
     <path d="m60 43 14-16M73 27l4-3" stroke-width="3"/>
     <path d="M77 18c5 2 9 6 11 11M80 10c8 3 14 9 17 17" stroke-width="3"/>
   </g>
 </svg>
 <span class="zalla-wordmark"><span>ANTENAS</span><b>ZALLA</b></span>
 </span>`;
}

export function brandLogoSvg(){
 const icon=brandMark().match(/<svg[\s\S]*?<\/svg>/)[0]
  .replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" x="0" y="20" width="140" height="120" ');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="160" viewBox="0 0 512 160" role="img" aria-label="Antenas Zalla"><rect width="512" height="160" rx="12" fill="#fff"/><g color="#0867bd">${icon}<text x="158" y="62" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="currentColor">ANTENAS</text><text x="155" y="125" font-family="Arial,sans-serif" font-size="65" font-weight="800" fill="currentColor">ZALLA</text></g></svg>`;
}
