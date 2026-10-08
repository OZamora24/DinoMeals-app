import test from 'node:test';
import assert from 'node:assert/strict';
import { mealUnitPrice, lbUnitPrice, priceCart, cookDateFor, addDays, dateKey, money } from '../lib/menu.js';
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
