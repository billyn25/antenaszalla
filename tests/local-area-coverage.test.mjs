import test from 'node:test';
import assert from 'node:assert/strict';
import geography from '../content/municipal-geography.json' with {type:'json'};
import postalData from '../content/local-postal-references.json' with {type:'json'};
import basqueData from '../content/local-area-basque.json' with {type:'json'};
import burgosData from '../content/local-area-burgos.json' with {type:'json'};
import {selectCoverage} from '../scripts/municipal-coverage.mjs';
import {localAreaFor,localAreaSection,enhanceLocalArea,routeFromZalla} from '../scripts/local-area-coverage.mjs';

const geographyByCode=new Map(geography.municipalities.map(town=>[town.code,town]));
const retained=selectCoverage(geography.municipalities.map(town=>({...town,province:town.code.slice(0,2),protected:town.code==='48096'}))).retained;

test('each retained town has a sourced postal reference attached to an exact municipality code',()=>{
  for(const dataset of [postalData,basqueData,burgosData]){
    assert.equal(new Set(dataset.profiles.map(profile=>profile.code)).size,dataset.profiles.length);
    for(const profile of dataset.profiles){
      assert(geographyByCode.has(profile.code),`Unknown municipality: ${profile.code}`);
      for(const item of [...profile.postalCodes,...profile.areas,...profile.streets]){
        assert(['http:','https:'].includes(new URL(item.sourceUrl).protocol),`Missing source: ${profile.name}`);
      }
      for(const entry of profile.postalCodes){
        assert.match(entry.code,/^\d{5}$/);
        assert(entry.scope.length>10,`Postal code without its local scope: ${profile.name}`);
      }
    }
  }
  for(const town of retained){
    const area=localAreaFor(town);
    assert(area.postalCodes.length,`No postal reference for ${town.name}`);
    assert(area.sources.length,`No source for ${town.name}`);
  }
});

test('CartoCiudad references cannot silently use the neighbouring municipality returned by reverse geocoding',()=>{
  for(const profile of postalData.profiles){
    assert.equal(String(profile.reference.municipalityCode).padStart(5,'0'),profile.code,profile.name);
    assert(profile.postalCodes.some(entry=>entry.code===profile.reference.postalCode),profile.name);
    assert(profile.streets.length<=1,'At most one sampled address per municipality');
  }
  const unknown=localAreaFor({code:'99999',name:'Zalla',province:'Otra provincia'});
  assert.deepEqual(unknown.postalCodes,[],'A matching name must not transfer codes to a different municipality');
});

test('local coverage keeps the business identity and phone count intact and never turns geographic distance into road distance',()=>{
  const town={...geographyByCode.get('48086'),province:'Bizkaia'};
  const original='<title>Antenista en Sopuerta</title><script type="application/ld+json">{"@type":"Organization","address":{"addressLocality":"Zalla","postalCode":"48860"}}</script><main><h1>Antenista en Sopuerta</h1><section id="diagnostico-averias"><p>Diagnóstico</p></section><section id="preparar-visita-local"><p>Preparación anterior</p></section><section id="contacto"><a href="tel:+34670042626">Consulta</a></section></main>';
  const updated=enhanceLocalArea(original,town);
  for(const pattern of [/<title>[\s\S]*?<\/title>/,/<h1>[\s\S]*?<\/h1>/,/<script[\s\S]*?<\/script>/])assert.equal(updated.match(pattern)[0],original.match(pattern)[0]);
  assert.equal((updated.match(/href="tel:/g)||[]).length,1);
  assert.equal((updated.match(/id="preparar-visita-local"/g)||[]).length,1);
  assert.equal(enhanceLocalArea(updated,town),updated);
  assert.equal((enhanceLocalArea(updated.replace('20261113-local-1','older-release'),town).match(/class="wrap local-area-shortcut"/g)||[]).length,1,'A version upgrade must reuse the existing shortcut');
  assert(!/\d+\s*(?:km|kilómetros|minutos)/.test(localAreaSection(town)),'Do not invent a road distance or an arrival promise');
  const url=new URL(routeFromZalla(town));
  assert.equal(url.hostname,'www.google.com');
  assert.equal(url.pathname,'/maps/dir/');
  assert.equal(url.searchParams.get('origin'),'Zalla, Bizkaia, España');
  assert.equal(url.searchParams.get('destination'),`${town.lat},${town.lon}`);
  assert.equal(url.searchParams.get('travelmode'),'driving');
  assert(!localAreaSection({...geographyByCode.get('48096'),province:'Bizkaia'}).includes('Ver ruta y kilómetros desde Zalla'),'Do not offer a zero-length Zalla-to-Zalla journey');
});
