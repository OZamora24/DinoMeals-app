import test from 'node:test';
import assert from 'node:assert/strict';
import { labelCount, nextStart, sheetsUsed } from '../lib/labelSpots.js';
import { orderLabels, bestByDate, buildLabelsDocx } from '../lib/labelsDocx.js';

const settings = { macros: { chicken: { cal: 187, p: 35, c: 0, f: 4 }, cilantrorice: { cal: 145, p: 3, c: 32, f: 1 }, broccoli: { cal: 30, p: 3, c: 6, f: 0 } } };
const order = { order_no: 1, customer_name: 'A', cook_date: '2026-10-25', items: [
  { type: 'meal', protein: 'chicken', flavor: 'chipotle', carb: 'cilantrorice', veg: 'broccoli', count: 3 },
  { type: 'lb', kind: 'carb', item: 'cilantrorice', lbs: 1.5 },
] };

test('labels: one per meal, one per lb (+ half lb), macros summed', () => {
  const l = orderLabels(order, settings);
  assert.equal(l.length, 5);
  assert.equal(labelCount(order), 5);
  assert.deepEqual(l[0].macros, { cal: 362, p: 41, c: 38, f: 5 });
  assert.equal(l[3].weight, '1 Lb.');
  assert.equal(l[4].weight, '½ Lb.');
  assert.equal(bestByDate('2026-10-25'), '10/31/2026');
});

test('labels: start spot carries over so sheets are not wasted', async () => {
  assert.equal(nextStart(1, 11), 2);
  assert.equal(nextStart(2, 8), 10);
  assert.equal(nextStart(10, 1), 1);
  assert.equal(sheetsUsed(1, 11), 2);
  assert.equal(sheetsUsed(2, 8), 1);
  assert.equal(sheetsUsed(9, 3), 2);
  const r = await buildLabelsDocx([order, order], settings, { start: 7 });
  assert.equal(r.count, 10);
  assert.equal(r.sheets, 2);
  assert.equal(r.next, 7);
});
