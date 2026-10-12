import test from 'node:test';
import assert from 'node:assert/strict';
import { mealUnitPrice, lbUnitPrice, priceCart, lineLabel, cookDateFor, addDays, dateKey, money } from '../lib/menu.js';
import { linesToCart, cartKey } from '../lib/cart.js';

const meal = (protein, carb, veg, sets = 2, flavor) => ({ protein, flavor, carb, veg, sets });

// ---------------- unit prices ----------------
test('meal price = protein + flavor + carb + veg upcharges', () => {
  assert.equal(mealUnitPrice(meal('tritip', 'cilantrorice', 'broccoli')), 15);
  assert.equal(mealUnitPrice(meal('chicken', 'whiterice', 'broccoli')), 11);
  assert.equal(mealUnitPrice(meal('chicken', 'whiterice', 'broccoli', 2, 'teriyaki')), 12); // flavor +1
  assert.equal(mealUnitPrice(meal('tritip', 'sweetpotato', 'fajitas')), 17); // +1 carb, +1 veg
  assert.equal(mealUnitPrice(meal('chicken', 'sweetpotato', 'greenbeans', 2, 'chipotle')), 14); // 11+1+1+1
});

test('unknown flavor falls back to the default flavor (no upcharge)', () => {
  assert.equal(mealUnitPrice(meal('chicken', 'whiterice', 'broccoli', 2, 'nope')), 11);
});

test('meal price is null for unknown items', () => {
  assert.equal(mealUnitPrice(meal('nope', 'whiterice', 'broccoli')), null);
  assert.equal(mealUnitPrice(meal('tritip', 'nope', 'broccoli')), null);
  assert.equal(mealUnitPrice(meal('tritip', 'whiterice', 'nope')), null);
});

test('per-lb prices', () => {
  assert.equal(lbUnitPrice({ kind: 'protein', item: 'tritip' }), 30);
  assert.equal(lbUnitPrice({ kind: 'protein', item: 'burgers', flavor: 'smashed' }), 23); // 22 + 1
  assert.equal(lbUnitPrice({ kind: 'protein', item: 'burgers', flavor: 'plain' }), 22);
  assert.equal(lbUnitPrice({ kind: 'carb', item: 'whiterice' }), 10);
  assert.equal(lbUnitPrice({ kind: 'veg', item: 'asparagus' }), 12);
});

test('per-lb price is null when not offered or unknown', () => {
  assert.equal(lbUnitPrice({ kind: 'veg', item: 'fajitas' }), null); // meals only
  assert.equal(lbUnitPrice({ kind: 'protein', item: 'nope' }), null);
  assert.equal(lbUnitPrice({ kind: 'bogus', item: 'whiterice' }), null);
});

// ---------------- priceCart ----------------
test('priceCart: meal sets are 4 meals each', () => {
  const r = priceCart({ meals: [meal('tritip', 'cilantrorice', 'broccoli', 2)] });
  assert.equal(r.ok, true);
  assert.equal(r.meals, 8);
  assert.equal(r.subtotal, 120); // 8 x $15
  assert.equal(r.lines[0].count, 8);
  assert.equal(r.lines[0].unit, 15);
});

test('priceCart: multiple combos add up', () => {
  const r = priceCart({ meals: [meal('tritip', 'cilantrorice', 'broccoli', 1), meal('chicken', 'whiterice', 'asparagus', 1, 'teriyaki')] });
  assert.equal(r.ok, true);
  assert.equal(r.meals, 8);
  assert.equal(r.subtotal, 4 * 15 + 4 * 12);
});

test('priceCart: meal minimum is 8', () => {
  assert.equal(priceCart({ meals: [meal('tritip', 'whiterice', 'broccoli', 1)] }).error, 'min_meals');
  assert.equal(priceCart({ meals: [meal('tritip', 'whiterice', 'broccoli', 2)] }).ok, true);
});

test('priceCart: lb minimum is 4, half-lb steps', () => {
  const lb = (lbs) => ({ lbs: [{ kind: 'protein', item: 'tritip', lbs }] });
  assert.equal(priceCart(lb(3.5)).error, 'min_lbs');
  const r = priceCart(lb(4));
  assert.equal(r.ok, true);
  assert.equal(r.subtotal, 120);
  assert.equal(priceCart(lb(4.5)).subtotal, 135);
  assert.equal(priceCart(lb(4.2)).lbs, 4); // rounds to nearest half
  assert.equal(priceCart(lb(4.3)).lbs, 4.5);
});

test('priceCart: lb lines across proteins/carbs/veg total correctly', () => {
  const r = priceCart({
    lbs: [
      { kind: 'protein', item: 'tritip', lbs: 2 },
      { kind: 'carb', item: 'cilantrorice', lbs: 1 },
      { kind: 'veg', item: 'asparagus', lbs: 1 },
    ],
  });
  assert.equal(r.ok, true);
  assert.equal(r.lbs, 4);
  assert.equal(r.subtotal, 60 + 11 + 12);
});

test('priceCart: meals and lbs can be mixed, each with its own minimum', () => {
  const ok = priceCart({ meals: [meal('turkey', 'brownrice', 'greenbeans', 2)], lbs: [{ kind: 'protein', item: 'tritip', lbs: 4 }] });
  assert.equal(ok.ok, true);
  assert.equal(ok.subtotal, 8 * 13 + 120);
  const bad = priceCart({ meals: [meal('turkey', 'brownrice', 'greenbeans', 2)], lbs: [{ kind: 'protein', item: 'tritip', lbs: 1 }] });
  assert.equal(bad.error, 'min_lbs');
});

test('priceCart: empty / malformed carts', () => {
  assert.equal(priceCart({}).error, 'empty');
  assert.equal(priceCart(null).error, 'empty');
  assert.equal(priceCart({ meals: 'x', lbs: 5 }).error, 'empty');
  assert.equal(priceCart({ meals: [meal('tritip', 'whiterice', 'broccoli', 0)] }).error, 'empty');
  assert.equal(priceCart({ meals: [meal('tritip', 'whiterice', 'broccoli', -3)] }).error, 'empty');
  assert.equal(priceCart({ meals: [meal('tritip', 'whiterice', 'broccoli', 'abc')] }).error, 'empty');
});

test('priceCart: unknown items are rejected', () => {
  assert.equal(priceCart({ meals: [meal('nope', 'whiterice', 'broccoli', 2)] }).error, 'bad_item');
  assert.equal(priceCart({ lbs: [{ kind: 'veg', item: 'fajitas', lbs: 4 }] }).error, 'bad_item');
});

test('priceCart: sold-out protein, carb, veg and lb items are rejected', () => {
  const c = { meals: [meal('tritip', 'whiterice', 'broccoli', 2)] };
  assert.equal(priceCart(c, ['tritip']).error, 'sold_out');
  assert.equal(priceCart(c, ['whiterice']).error, 'sold_out');
  assert.equal(priceCart(c, ['broccoli']).error, 'sold_out');
  assert.equal(priceCart(c, ['shrimp']).ok, true);
  assert.equal(priceCart(c, null).ok, true);
  assert.equal(priceCart({ lbs: [{ kind: 'protein', item: 'tritip', lbs: 4 }] }, ['tritip']).error, 'sold_out');
});

test('priceCart: client-supplied prices are ignored', () => {
  const m = { ...meal('tritip', 'whiterice', 'broccoli', 2), unit: 1, total: 1, price: 1 };
  const r = priceCart({ meals: [m] });
  assert.equal(r.lines[0].unit, 15);
  assert.equal(r.subtotal, 120);
});

// ---------------- cook date / cutoff ----------------
// 2026-10-11 is a Sunday. Default cutoff = Friday 8 PM.
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test('cookDateFor: midweek orders cook the coming Sunday', () => {
  assert.equal(cookDateFor(at(2026, 10, 5)), '2026-10-11'); // Mon
  assert.equal(cookDateFor(at(2026, 10, 8)), '2026-10-11'); // Thu
});

test('cookDateFor: Friday cutoff at 8 PM', () => {
  assert.equal(cookDateFor(at(2026, 10, 9, 19, 59)), '2026-10-11');
  assert.equal(cookDateFor(at(2026, 10, 9, 20, 0)), '2026-10-18');
  assert.equal(cookDateFor(at(2026, 10, 9, 23, 59)), '2026-10-18');
});

test('cookDateFor: after cutoff through Sunday rolls to the next Sunday', () => {
  assert.equal(cookDateFor(at(2026, 10, 10)), '2026-10-18'); // Sat
  assert.equal(cookDateFor(at(2026, 10, 11, 9)), '2026-10-18'); // Sun (cook day itself)
  assert.equal(cookDateFor(at(2026, 10, 12, 8)), '2026-10-18'); // Mon
});

test('cookDateFor: custom cutoff day/hour', () => {
  assert.equal(cookDateFor(at(2026, 10, 7, 11, 59), 3, 12), '2026-10-11'); // Wed 11:59, cutoff Wed noon
  assert.equal(cookDateFor(at(2026, 10, 7, 12, 0), 3, 12), '2026-10-18');
  assert.equal(cookDateFor(at(2026, 10, 10, 9), 6, 18), '2026-10-11'); // Sat 9am, cutoff Sat 6pm
  assert.equal(cookDateFor(at(2026, 10, 10, 18), 6, 18), '2026-10-18');
});

test('cookDateFor: crosses month and year boundaries', () => {
  assert.equal(cookDateFor(at(2026, 12, 31)), '2027-01-03'); // Thu
  assert.equal(cookDateFor(at(2026, 12, 25, 21)), '2027-01-03'); // Fri after cutoff
  assert.equal(cookDateFor(at(2026, 10, 29)), '2026-11-01'); // Thu
});

test('cookDateFor always returns a Sunday', () => {
  for (let i = 0; i < 60; i++) {
    const d = at(2026, 10, 1 + i, (i * 7) % 24);
    const [y, m, day] = cookDateFor(d).split('-').map(Number);
    assert.equal(new Date(y, m - 1, day).getDay(), 0, `${d.toString()} -> not a Sunday`);
  }
});

test('dateKey / addDays', () => {
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(addDays('2026-10-11', 7), '2026-10-18');
  assert.equal(addDays('2026-10-11', -7), '2026-10-04');
  assert.equal(addDays('2026-12-28', 7), '2027-01-04');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('money formatting', () => {
  assert.equal(money(15), '$15');
  assert.equal(money(15.5), '$15.50');
  assert.equal(money(null), '—');
});

// ---------------- cart round-trip ("order my usual") ----------------
test('linesToCart(priceCart().lines) reprices to the same total', () => {
  const cart = {
    meals: [meal('chicken', 'whiterice', 'asparagus', 1, 'teriyaki'), meal('tritip', 'sweetpotato', 'fajitas', 1)],
    lbs: [{ kind: 'protein', item: 'burgers', flavor: 'smoked', lbs: 4 }],
  };
  const first = priceCart(cart);
  const again = priceCart(linesToCart(first.lines));
  assert.equal(again.ok, true);
  assert.equal(again.subtotal, first.subtotal);
});

test('cartKey ignores line order but not contents', () => {
  const a = { meals: [meal('tritip', 'whiterice', 'broccoli', 2), meal('turkey', 'whiterice', 'broccoli', 2)], lbs: [] };
  const b = { meals: [...a.meals].reverse(), lbs: [] };
  assert.equal(cartKey(a), cartKey(b));
  assert.notEqual(cartKey(a), cartKey({ meals: [meal('tritip', 'whiterice', 'broccoli', 3)], lbs: [] }));
});

// ---- meal plans / per-meal counts ----
import { MEAL_PLANS, planParts, planForCount, mealLineCount } from '../lib/menu.js';

test('meal plans: sets + leftover picks add up to the plan size', () => {
  const want = { 8: [2, 0, 4], 10: [3, 1, 3], 12: [4, 0, 3], 14: [4, 2, 3], 16: [5, 1, 3] };
  for (const p of MEAL_PLANS.filter((x) => x.meals)) {
    const { sets, extra } = planParts(p);
    assert.deepEqual([sets, extra, p.setSize], want[p.meals]);
    assert.equal(sets * p.setSize + extra, p.meals);
  }
  assert.equal(planForCount(12).id, '12');
  assert.equal(planForCount(9).id, 'any');
});

test('priceCart: count lines (any amount) and legacy sets lines both work', () => {
  const r = priceCart({ meals: [
    { protein: 'turkey', carb: 'whiterice', veg: 'broccoli', count: 7 },
    { protein: 'turkey', carb: 'brownrice', veg: 'broccoli', count: 1 },
  ], lbs: [] });
  assert.equal(r.ok, true);
  assert.equal(r.meals, 8);
  assert.equal(r.lines[0].count, 7);
  assert.equal('sets' in r.lines[0], false);
  assert.equal(mealLineCount({ sets: 3 }), 12);
  assert.equal(mealLineCount({ count: 5, sets: 3 }), 5);
  const bad = priceCart({ meals: [{ protein: 'turkey', carb: 'whiterice', veg: 'broccoli', count: 7 }], lbs: [] });
  assert.equal(bad.error, 'min_meals');
});

test('linesToCart keeps per-meal counts (10-meal plan reloads as 10)', () => {
  const r = priceCart({ meals: [
    { protein: 'chicken', flavor: 'chipotle', carb: 'whiterice', veg: 'broccoli', count: 9 },
    { protein: 'tilapia', carb: 'redpotato', veg: 'asparagus', count: 1 },
  ], lbs: [] });
  const cart = linesToCart(r.lines);
  assert.equal(cart.meals.reduce((a, m) => a + m.count, 0), 10);
  assert.equal(cartKey(cart), cartKey(linesToCart(priceCart(cart).lines)));
});

test('meals can skip the carb OR the veggie (same price), not both', async () => {
  const { NONE } = await import('../lib/menu.js');
  const full = mealUnitPrice({ protein: 'groundbeef', flavor: 'taco', carb: 'whiterice', veg: 'broccoli' });
  assert.equal(mealUnitPrice({ protein: 'groundbeef', flavor: 'taco', carb: 'whiterice', veg: NONE }), full);
  assert.equal(mealUnitPrice({ protein: 'chicken', flavor: 'teriyaki', carb: NONE, veg: 'asparagus' }), 12);
  assert.equal(mealUnitPrice({ protein: 'chicken', carb: NONE, veg: NONE }), null);
  assert.equal(mealUnitPrice({ protein: 'chicken', carb: 'basmati', veg: 'broccoli' }), null);
  const r = priceCart({ meals: [
    { protein: 'groundbeef', flavor: 'taco', carb: 'whiterice', veg: NONE, count: 14 },
    { protein: 'chicken', flavor: 'teriyaki', carb: NONE, veg: 'fajitas', count: 7 },
  ], lbs: [] });
  assert.equal(r.ok, true);
  assert.equal(r.meals, 21);
  assert.equal(lineLabel(r.lines[0]), 'Ground Beef · Taco + White Rice');
});

import { extraUnitPrice, lineSummary, priceCart as priceCartX } from '../lib/menu.js';
import { linesToCart as linesToCartX } from '../lib/cart.js';

test('extra portions are priced from the lb menu, per portion', () => {
  assert.equal(extraUnitPrice({ kind: 'protein', item: 'tritip' }), 7.5); // $30/lb x 4oz
  assert.equal(extraUnitPrice({ kind: 'carb', item: 'whiterice' }), 2.5); // $10/lb x 4oz
  assert.equal(extraUnitPrice({ kind: 'veg', item: 'broccoli' }), 2); // $10/lb x 3oz
  assert.ok(extraUnitPrice({ kind: 'veg', item: 'fajitas' }) > 0);
  assert.equal(extraUnitPrice({ kind: 'protein', item: 'nope' }), null);
});

test('extras add to the subtotal and survive a round trip', () => {
  const base = { meals: [{ protein: 'chicken', carb: 'whiterice', veg: 'broccoli', count: 8 }], lbs: [] };
  const plain = priceCartX(base);
  const withExtra = priceCartX({ ...base, extras: [{ kind: 'protein', item: 'chicken', qty: 2 }, { kind: 'veg', item: 'broccoli', qty: 1 }] });
  assert.ok(withExtra.ok);
  assert.equal(withExtra.meals, 8); // extras are not meals
  assert.equal(withExtra.subtotal, plain.subtotal + 2 * 4 + 2);
  const lines = withExtra.lines.filter((l) => l.type === 'extra');
  assert.equal(lines.length, 2);
  assert.equal(lineSummary(lines[0]), '2× extra Grilled Chicken Breast');
  assert.deepEqual(linesToCartX(withExtra.lines).extras, [{ kind: 'protein', item: 'chicken', qty: 2 }, { kind: 'veg', item: 'broccoli', qty: 1 }]);
});

test('extras alone are not an order; bad or sold-out extras are rejected', () => {
  assert.equal(priceCartX({ meals: [], lbs: [], extras: [{ kind: 'carb', item: 'whiterice', qty: 2 }] }).error, 'empty');
  const base = { meals: [{ protein: 'chicken', carb: 'whiterice', veg: 'broccoli', count: 8 }] };
  assert.equal(priceCartX({ ...base, extras: [{ kind: 'carb', item: 'zzz', qty: 1 }] }).error, 'bad_item');
  assert.equal(priceCartX({ ...base, extras: [{ kind: 'carb', item: 'brownrice', qty: 1 }] }, ['brownrice']).error, 'sold_out');
  assert.equal(priceCartX({ ...base, extras: [{ kind: 'carb', item: 'brownrice', qty: 999 }] }).error, 'bad_item');
});
