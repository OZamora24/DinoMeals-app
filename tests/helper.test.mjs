import test from 'node:test';
import assert from 'node:assert/strict';
import { offlineAnswer, cleanMessages, systemPrompt } from '../lib/dinoHelper.js';

test('Rex: finds how-to answers in the guide, says "not sure" otherwise', () => {
  assert.match(offlineAnswer('How do I mark an order as paid?'), /Mark an order paid/);
  assert.match(offlineAnswer('how do I print labels'), /Labels/);
  assert.match(offlineAnswer('change the price of tri-tip'), /Orlando/);
  assert.match(offlineAnswer('como marco una orden pagada'), /paid/i);
  assert.equal(offlineAnswer('what is the weather today'), null);
});

test('Rex: chat history is trimmed and must end with a question', () => {
  assert.deepEqual(cleanMessages([{ role: 'assistant', content: 'hi' }]), []);
  const m = cleanMessages([{ role: 'system', content: 'x' }, { role: 'user', content: 'a'.repeat(900) }]);
  assert.equal(m.length, 1);
  assert.equal(m[0].content.length, 600);
  assert.match(systemPrompt(), /contact Orlando/);
});
