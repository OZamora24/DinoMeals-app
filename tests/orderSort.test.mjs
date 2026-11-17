import test from 'node:test';
import assert from 'node:assert/strict';
import { applySort, moveId, cleanRank } from '../lib/orderSort.js';

const O = (id, no) => ({ id, order_no: no });
const list = [O('c', 1003), O('a', 1001), O('b', 1002), O('d', 1004)];
const ids = (l) => l.map((o) => o.id);

test('sort low→high, high→low, and Juan\'s order (new orders go last, low→high)', () => {
  assert.deepEqual(ids(applySort(list, 'asc')), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids(applySort(list, 'desc')), ['d', 'c', 'b', 'a']);
  assert.deepEqual(ids(applySort(list, 'custom', ['c', 'a'])), ['c', 'a', 'b', 'd']);
  assert.deepEqual(ids(applySort(list, 'custom', [])), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids(applySort(list, 'custom', ['gone', 'd'])), ['d', 'a', 'b', 'c']);
});

test('moveId before/after a target', () => {
  assert.deepEqual(moveId(['a', 'b', 'c', 'd'], 'd', 'a'), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moveId(['a', 'b', 'c', 'd'], 'a', 'c', true), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveId(['a', 'b'], 'a', 'a'), ['a', 'b']);
  assert.deepEqual(moveId(['a', 'b'], 'x', 'a'), ['a', 'b']);
});

test('cleanRank keeps real weeks and ids only', () => {
  assert.deepEqual(cleanRank({ '2026-11-22': ['a', 'a', 'b', 5, '<x>'], bad: ['a'] }), { '2026-11-22': ['a', 'b'] });
  assert.deepEqual(cleanRank(null), {});
  const many = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`2026-01-${String(i + 1).padStart(2, '0')}`, ['a']]));
  assert.equal(Object.keys(cleanRank(many)).length, 12);
});
