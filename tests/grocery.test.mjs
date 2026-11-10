import test from 'node:test';
import assert from 'node:assert/strict';
import { shoppingList, groceryConfig, cleanGrocery, rawFactor, listText, weekList, DEFAULT_YIELDS } from '../lib/grocery.js';

test('raw amounts: trim + shrink, rice grows, extra %, rounded up to ½ lb', () => {
  // 22.5 lb cooked tri-tip: ÷ (0.8 × 0.7) = 40.18 lb, +5% = 42.19 -> 42.5
  const l = shoppingList({ tritip: 22.5 * 16 }, {}, { tritip: 'Smoked Tri-tip Steak' });
  assert.equal(l.protein[0].label, 'Tri-tip, whole (untrimmed)');
  assert.equal(l.protein[0].rawLb, 42.5);
  // 28 lb cooked rice ÷ 2.8 = 10 lb dry, +0% = 10
  assert.equal(shoppingList({ whiterice: 28 * 16 }, {}, {}, 0).carb[0].rawLb, 10);
});

test('several menu items roll up into what Juan buys', () => {
  const l = shoppingList({ chicken: 160, swchicken: 160, whiterice: 160, cilantrorice: 160, burgers: 80, groundbeef: 80 }, {}, { chicken: 'Grilled Chicken', swchicken: 'SW Chicken' }, 0);
  assert.equal(l.protein.find((r) => r.key === 'chicken').from.length, 2);
  assert.equal(l.carb.length, 1);
  assert.equal(l.protein.find((r) => r.key === 'beef').cookedLb, 10);
});

test('Juan can change numbers; bad numbers fall back; only changes are saved', () => {
  const s = { grocery: { yields: { tritip: { trim: 25, shrink: 'x' }, whiterice: { grow: 3 } }, extra: 10 } };
  const c = groceryConfig(s);
  assert.deepEqual(c.yields.tritip, { buy: 'tritip', trim: 25, shrink: DEFAULT_YIELDS.tritip.shrink });
  assert.equal(c.yields.whiterice.grow, 3);
  assert.equal(c.extra, 10);
  const saved = cleanGrocery({ yields: { tritip: { trim: 25, shrink: 30 }, chicken: { trim: 3, shrink: 25 } }, extra: 5 });
  assert.deepEqual(Object.keys(saved.yields), ['tritip']);
  assert.ok(Math.abs(rawFactor({ trim: 20, shrink: 30 }) - 1 / 0.56) < 1e-9);
});

test('copy text: categories, Juan items, this-week-only items, lines taken off', () => {
  const cfg = groceryConfig({ grocery: { custom: [
    { id: 'c_1', cat: 'Pantry / supplies', name: 'Organic avocado oil', qty: '2 bottles' },
    { id: 'c_2', cat: 'Sauces', name: 'Limes', qty: '1 bag', week: '2026-11-15' },
    { id: 'c_3', cat: 'Sauces', name: 'Old item', week: '2026-11-08' },
  ], hidden: ['broccoli'] } });
  const groups = weekList(shoppingList({ tritip: 160, broccoli: 48 }, {}, {}), cfg, { week: '2026-11-15', containers: 182 });
  const txt = listText(groups, { week: 'Sun, Nov 15' });
  assert.match(txt, /PROTEIN\n☐ Tri-tip/);
  assert.doesNotMatch(txt, /Broccoli/);
  assert.match(txt, /SAUCES\n☐ Limes — 1 bag/);
  assert.doesNotMatch(txt, /Old item/);
  assert.match(txt, /Organic avocado oil — 2 bottles/);
  assert.match(txt, /Label sheets \(10 per sheet\) — 19/);
  assert.deepEqual(groups.map((g) => g.cat), ['Protein', 'Pantry / supplies', 'Sauces']);
});

test('old saved pantry list becomes Pantry / supplies items; bad items are dropped', () => {
  const c = groceryConfig({ grocery: { pantry: ['Avocado oil', ''] } });
  assert.deepEqual(c.custom.map((x) => [x.cat, x.name]), [['Pantry / supplies', 'Avocado oil']]);
  const saved = cleanGrocery({ custom: [{ name: '  Foil  ', cat: '' }, { name: '' }], hidden: ['containers', 'containers'] });
  assert.equal(saved.custom.length, 1);
  assert.equal(saved.custom[0].cat, 'Pantry / supplies');
  assert.deepEqual(saved.hidden, ['containers']);
});
