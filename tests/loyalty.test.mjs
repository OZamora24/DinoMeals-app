import test from 'node:test';
import assert from 'node:assert/strict';
import { loyaltyState, qualifies, loyaltyConfig, stackDiscounts, rewardDiscount, tierReward, publicLoyalty, addDaysYmd } from '../lib/loyalty.js';

const wk = (i) => addDaysYmd('2026-11-08', 7 * i);
const ord = (i, extra = {}) => ({ order_no: 2000 + i, cook_date: wk(i), paid: true, status: 'done', meal_count: 8, lb_total: 0, items: [{}], total: 112, ...extra });

test('which orders count', () => {
  const cfg = loyaltyConfig();
  assert.ok(qualifies(ord(0), cfg));
  assert.equal(qualifies(ord(0, { paid: false }), cfg), false);
  assert.equal(qualifies(ord(0, { status: 'cancelled' }), cfg), false);
  assert.equal(qualifies(ord(0, { meal_count: 4 }), cfg), false); // small order
  assert.ok(qualifies(ord(0, { meal_count: 0, lb_total: 4 }), cfg));
  assert.ok(qualifies(ord(0, { meal_count: 0, items: [], total: 90 }), cfg)); // custom quote $80+
  assert.equal(qualifies(ord(0, { meal_count: 0, items: [], total: 60 }), cfg), false);
  assert.equal(qualifies({ ...ord(0), cook_date: '2026-11-01' }, cfg), false); // before launch week
});

test('one per week, milestones, rewards', () => {
  const orders = [0, 1, 2, 3, 4].map((i) => ord(i));
  orders.push(ord(4, { order_no: 9999 })); // second order same week doesn't count twice
  const s = loyaltyState(orders, wk(5), {}, '9095550142');
  assert.equal(s.count, 5);
  assert.equal(s.available.milestone, 5);
  assert.equal(s.available.value, 5);
  assert.equal(s.available.expires, addDaysYmd(wk(4), 30));
  assert.deepEqual(s.next, { at: 10, left: 5, reward: { kind: 'percent', value: 10 } });
  assert.deepEqual(tierReward(15), { kind: 'amount', value: 20, meal: true });
  assert.equal(tierReward(25).kind, 'pick');
  assert.equal(tierReward(7), null);
});

test('used, expired and renewed rewards', () => {
  const orders = [0, 1, 2, 3, 4].map((i) => ord(i));
  const used = [...orders, ord(5, { reward: { milestone: 5 } })];
  assert.equal(loyaltyState(used, wk(6)).available, null);
  const late = addDaysYmd(wk(4), 31);
  const ex = loyaltyState(orders, late, {}, '9095550142');
  assert.equal(ex.available, null);
  assert.equal(ex.earned[0].status, 'expired');
  const renewed = loyaltyState(orders, late, { loyalty: { renew: { '9095550142:5': addDaysYmd(late, 30) } } }, '9095550142');
  assert.equal(renewed.available.milestone, 5);
  assert.equal(loyaltyState(orders, wk(5), { loyalty: { on: false } }).available, null);
});

test('stacking never goes over 20%', () => {
  assert.equal(rewardDiscount({ kind: 'percent', value: 10 }, 112), 11.2);
  assert.equal(rewardDiscount({ kind: 'amount', value: 20 }, 15), 15);
  // 10% promo + 10% reward = 20% (ok)
  assert.deepEqual(stackDiscounts(100, 10, { kind: 'percent', value: 10 }), { promo: 10, reward: 10, total: 20 });
  // 10% promo + 20% reward → reward trimmed to 10
  assert.deepEqual(stackDiscounts(100, 10, { kind: 'percent', value: 20 }), { promo: 10, reward: 10, total: 20 });
  // free meal $20 on $112 + 10% promo → capped at $22.40 total
  assert.deepEqual(stackDiscounts(112, 11.2, { kind: 'amount', value: 20 }), { promo: 11.2, reward: 11.2, total: 22.4 });
  // no promo: free meal $20 on $112 is under 20% → full $20
  assert.equal(stackDiscounts(112, 0, { kind: 'amount', value: 20 }).reward, 20);
});

test('public summary', () => {
  const s = loyaltyState([0, 1, 2].map((i) => ord(i)), wk(3));
  assert.deepEqual(publicLoyalty(s), { on: true, count: 3, progress: 3, next: { at: 5, left: 2, label: '5% off' }, available: null });
});
