import test from 'node:test';
import assert from 'node:assert/strict';
import { orderForAgain, againSummary, againLine, againCart, againInfo } from '../lib/again.js';

const meal = (protein, count, flavor, carb = 'whiterice', veg = 'broccoli') => ({ type: 'meal', protein, flavor, carb, veg, count, unit: 15, total: 15 * count });
const o = (id, cook_date, items, extra = {}) => ({ id, cook_date, created_at: `${cook_date}T00:00:00Z`, status: 'new', items, view_token: `tok${id}`, ...extra });
const WEEK = '2026-11-15';

test('offers the newest order from the last 4 weeks, unless they already ordered this Sunday', () => {
  const a = o(1, '2026-11-08', [meal('tritip', 4), meal('chicken', 6, 'teriyaki')]);
  const b = o(2, '2026-11-01', [meal('shrimp', 8)]);
  assert.equal(orderForAgain([b, a], WEEK).id, 1);
  assert.equal(orderForAgain([a, o(3, WEEK, [meal('tritip', 8)])], WEEK), null);
  assert.equal(orderForAgain([o(4, '2026-10-11', [meal('tritip', 8)])], WEEK), null); // older than 4 weeks
  assert.equal(orderForAgain([o(5, '2026-11-08', [meal('tritip', 8)], { status: 'cancelled' })], WEEK), null);
  assert.equal(orderForAgain([o(6, '2026-11-08', [], { status: 'quote' })], WEEK), null);
});

test('text line: summary, last week vs last time, Spanish', () => {
  const a = o(1, '2026-11-08', [meal('tritip', 4), meal('chicken', 6, 'teriyaki'), { type: 'lb', kind: 'protein', item: 'tritip', lbs: 2 }]);
  assert.equal(againSummary(a), '10 meals + 2 lb (Tri-tip, Chicken)');
  assert.match(againLine(a, WEEK), /^🔁 Same as last week\? 10 meals \+ 2 lb \(Tri-tip, Chicken\) → tap to reorder: https:\/\/dinomeals\.app\/again\/tok1$/);
  assert.match(againLine({ ...a, cook_date: '2026-10-25' }, WEEK), /Same as last time\?/);
  assert.match(againLine(a, WEEK, 'es'), /¿Lo mismo que la semana pasada\? 10 comidas \+ 2 lb \(Tri-tip, Pollo\) → toca para repetir/);
});

test('cart: sold-out items come out with a note; hidden flavor is cleared', () => {
  const a = o(1, '2026-11-08', [meal('tritip', 4), meal('chicken', 6, 'nope'), meal('shrimp', 2)]);
  const r = againCart(a, ['shrimp']);
  assert.equal(r.cart.meals.length, 2);
  assert.equal(r.removed[0], '2× Garlic Butter Shrimp');
  assert.equal(r.cart.meals[1].flavor, null);
  assert.equal(r.flavorReset.length, 1);
  const info = againInfo({ customer_name: 'Maria Lopez', phone: '(909) 555-0401', fulfillment: 'pickup', payment_method: 'zelle', paid: true, total: 99 });
  assert.equal(info.name, 'Maria Lopez');
  assert.equal(info.paid, undefined);
});
