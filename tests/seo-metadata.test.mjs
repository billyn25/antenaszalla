import test from 'node:test';
import assert from 'node:assert/strict';
import guides from '../content/service-guides.json' with {type:'json'};
import services from '../content/services.json' with {type:'json'};
import {
  displayPlaceName, townSeoMetadata, provinceSeoMetadata, homeSeoMetadata,
  serviceSeoMetadata, serviceIndexSeoMetadata, blogSeoMetadata, SEO_PHONE
} from '../scripts/seo-metadata.mjs';

test('place labels restore trailing articles without altering official bilingual names', () => {
  for (const [source, expected] of [
    ['Corrales de Buelna, Los', 'Los Corrales de Buelna'],
    ['Arcos, Los', 'Los Arcos'],
    ['Guardia, La', 'La Guardia'],
    ['Donostia/San Sebastián', 'Donostia/San Sebastián'],
    ['Abanto y Ciérvana-Abanto Zierbena', 'Abanto y Ciérvana-Abanto Zierbena']
  ]) {
    assert.equal(displayPlaceName(source), expected);
    assert.equal(displayPlaceName(expected), expected);
  }
  assert.throws(() => displayPlaceName('  '), TypeError);
});

test('capital pages are distinct from province pages and do not repeat their location', () => {
  for (const name of ['Burgos', 'León', 'Palencia', 'Segovia', 'Valladolid']) {
    const town = Object.freeze({name, province:name, path:`/antenas-${name}/${name}`});
    const local = townSeoMetadata(town);
    const province = provinceSeoMetadata(name);
    assert.equal(local.heading, `Antenista en ${name}`);
    assert.notEqual(local.title, province.title);
    assert.notEqual(local.description, province.description);
    assert.ok(!Object.values(local).some(text => text.includes(`${name}, ${name}`)));
    assert.equal(town.name, name);
    assert.ok(local.description.includes(SEO_PHONE));
  }
});

test('long locality names remain complete when the brand and longer description are omitted', () => {
  const name = 'Villarcayo de Merindad de Castilla la Vieja';
  const longTown = townSeoMetadata({name, province:'Burgos'});
  assert.equal(longTown.title, `Antenista en ${name}`);
  for (const value of Object.values(longTown)) assert.ok(value.includes(name));
  assert.ok(longTown.title.length <= 65);
  assert.ok(longTown.description.length <= 160);
  const unusuallyLongName = 'Localidad de nombre completo '.repeat(8).trim();
  const unusual = townSeoMetadata({name:unusuallyLongName, province:'Burgos'});
  assert.ok(unusual.description.length > 160);
  assert.ok(unusual.description.includes(unusuallyLongName));
});

test('homonymous municipalities retain the province when the caller marks ambiguity', () => {
  const name = 'Villanueva de los Caballeros de la Montaña';
  const burgos = townSeoMetadata({name, province:'Burgos', disambiguate:true});
  const leon = townSeoMetadata({name, province:'León', disambiguate:true});
  assert.notEqual(burgos.title, leon.title);
  assert.notEqual(burgos.description, leon.description);
  for (const value of Object.values(burgos)) {
    assert.ok(value.includes(name));
    assert.ok(value.includes('Burgos'));
  }
  assert.throws(() => townSeoMetadata({name, disambiguate:true}), TypeError);
  const capital = townSeoMetadata({name:'León', province:'León', disambiguate:true});
  assert.ok(!Object.values(capital).some(value => value.includes('León, León')));
});

test('emergency wording follows a stated service without inventing arrival promises', () => {
  const ordinary = townSeoMetadata({name:'Briviesca', province:'Burgos'});
  const urgent = townSeoMetadata({name:'Briviesca', province:'Burgos', urgentLabel:'Urgencias 24h'});
  assert.ok(!ordinary.description.includes('24 h'));
  assert.ok(urgent.description.includes('Urgencias 24 h'));
  assert.ok(!/inmediata|garantiz|minutos|\bgratis\b/iu.test(urgent.description));
});

test('all ten published services have distinct metadata through their identifiers and routes', () => {
  const titles = new Set();
  const descriptions = new Set();
  assert.equal(guides.length, 10);
  for (const guide of guides) {
    const metadata = serviceSeoMetadata(guide);
    for (const alias of [guide.id, guide.slug, guide.name, guide.label, `/servicios/${guide.slug}/`, services.find(s => s.id === guide.id).name]) {
      assert.deepEqual(serviceSeoMetadata(alias), metadata);
    }
    assert.equal(metadata.heading, guide.name);
    assert.ok(metadata.title.length <= 65);
    assert.ok(metadata.description.length >= 100 && metadata.description.length <= 160);
    assert.ok(!/Zallatel/iu.test(Object.values(metadata).join(' ')));
    titles.add(metadata.title);
    descriptions.add(metadata.description);
  }
  assert.equal(titles.size, guides.length);
  assert.equal(descriptions.size, guides.length);
  assert.throws(() => serviceSeoMetadata('servicio no publicado'), RangeError);
});

test('satellite and connectivity descriptions retain the relevant conditions of the service', () => {
  assert.match(serviceSeoMetadata('tdt-satelite').description, /elegibilidad y activación/);
  assert.match(serviceSeoMetadata('starlink').description, /kit, la cuenta y la tarifa.*por separado/);
  assert.match(serviceSeoMetadata('cobertura-movil-servicio').description, /router 4G o 5G/);
  assert.ok(!/garantiz|sin cuotas|todos los canales/iu.test(serviceSeoMetadata('tdt-satelite').description));
});

test('home, service index and paginated news retain the business identity and useful descriptions', () => {
  for (const metadata of [homeSeoMetadata(), serviceIndexSeoMetadata(), blogSeoMetadata(), blogSeoMetadata(2)]) {
    assert.match(metadata.title, /Antenas Zalla/);
    assert.ok(metadata.title.length <= 65);
    assert.ok(metadata.description.length <= 160);
    assert.ok(metadata.heading.length > 10);
  }
  assert.notEqual(blogSeoMetadata().title, blogSeoMetadata(2).title);
  assert.throws(() => blogSeoMetadata(0), RangeError);
});
