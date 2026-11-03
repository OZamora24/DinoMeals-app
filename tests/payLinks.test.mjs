import test from 'node:test';
import assert from 'node:assert/strict';
import { venmoLink, cardLinks } from '../lib/payLinks.js';
import { readFileSync } from 'node:fs';

test('venmo and card are separate: a Venmo link never shows up as a card link', () => {
  const s = { venmo_link: 'https://venmo.com/u/dinomeals', card_link: 'https://square.link/u/abc', cashapp_link: 'https://cash.app/$dino' };
  assert.equal(venmoLink(s), 'https://venmo.com/u/dinomeals');
  assert.deepEqual(cardLinks(s).map((l) => l.label), ['', 'Cash App']);
});

test('older shops that saved their Venmo link in the card field still work', () => {
  const s = { card_link: 'https://venmo.com/u/dinomeals' };
  assert.equal(venmoLink(s), 'https://venmo.com/u/dinomeals');
  assert.deepEqual(cardLinks(s), []);
  assert.equal(venmoLink({}), '');
});

// orderRow.js uses extensionless imports (Next resolves them, plain node can't), so read its source.
test('venmo is an accepted payment method, and only card carries the card fee', () => {
  const src = readFileSync(new URL('../lib/orderRow.js', import.meta.url), 'utf8');
  assert.match(src, /export const PAY = \[[^\]]*'venmo'/);
  assert.match(src, /payment_method === 'card' && hasItems \? Number\(settings\.card_fee\)/);
  assert.doesNotMatch(src, /payment_method === 'venmo'[^\n]*card_fee/);
});
