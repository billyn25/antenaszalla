import test from 'node:test';
import assert from 'node:assert/strict';
import {reduceTown,replaceSection} from '../scripts/reduce-town-boilerplate.mjs';

test('consolidation preserves SEO, photographs, service anchors and the enquiry form',()=>{
 const html='<head><title>Antenista en Lerma</title><meta name="description" content="Descripción propia"><link rel="canonical" href="https://example.test/lerma"></head><main id="contenido"><h1>Antenista en Lerma</h1><section id="servicios"><article id="tdt"><img src="antena.jpg" alt="Antena"><h3>TDT</h3></article><article id="porteros">Porteros</article></section><section class="doorphones section" id="porteros-videoporteros"><div class="doorphone-work"><article><h3>Audio</h3><p>Revisión de audio</p></article><article><h3>Imagen</h3><p>Revisión de imagen</p></article><article><h3>Apertura</h3><p>Revisión de apertura</p></article></div><p class="doorphone-note">Otra preparación del aviso</p></section><section id="cobertura-movil"><p>Explicación repetida</p></section><section id="experiencia"><div class="stars" aria-label="Decoración">★★★★★</div><span>Fermax</span><span>Televés</span></section><section id="contacto"><form data-whatsapp-form><input name="town" value="Lerma"></form></section></main>';
 const page={name:'Lerma',path:'/Antenas-Burgos/lerma.html',municipioId:'09194'};
 const result=reduceTown(html,page);
 for(const token of ['<title>Antenista en Lerma</title>','Descripción propia','https://example.test/lerma','<h1>Antenista en Lerma</h1>','<img src="antena.jpg" alt="Antena">','id="tdt"','id="porteros"','<form data-whatsapp-form>','value="Lerma"','★★★★★'])assert(result.includes(token),token);
 assert.equal((result.match(/Revisión de (audio|imagen|apertura)/g)||[]).length,1);
 assert.equal(reduceTown(result,page),result,'a second pass must be harmless');
});
test('nested sections are replaced without removing following contact content',()=>{
 const html='<main><section id="target"><section>inside</section>tail</section><section id="contacto">form</section></main>';
 assert.equal(replaceSection(html,'target',()=>'<section id="target">brief</section>'),'<main><section id="target">brief</section><section id="contacto">form</section></main>');
});
