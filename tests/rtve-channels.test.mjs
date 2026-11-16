import test from 'node:test';
import assert from 'node:assert/strict';
import { topicFor } from '../src/news-sources.mjs';

test('RTVE channel changes, new channels and pay TV are eligible', () => {
  assert.equal(topicFor('RTVE estrena nuevas emisiones en La 2').type, 'RTVE');
  assert.equal(topicFor('Nuevo canal llega a la televisión digital').type, 'Canales');
  assert.equal(topicFor('Movistar Plus+ incorpora un canal a su parrilla').type, 'TV de pago');
  assert.equal(topicFor('Orange TV reorganiza sus diales').type, 'TV de pago');
});
test('audiences and RTVE entertainment alone remain excluded', () => {
  assert.equal(topicFor('RTVE lidera las audiencias con La 1'), null);
  assert.equal(topicFor('La 1 logra récord de espectadores'), null);
  assert.equal(topicFor('RTVE anuncia un concurso de televisión'), null);
});
