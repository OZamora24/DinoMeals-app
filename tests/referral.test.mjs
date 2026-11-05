import test from 'node:test';
import assert from 'node:assert/strict';
import { referralCredits, allDiscounts, isNewCustomer, referralsThisMonth, refKey, normRef } from '../lib/referral.js';

const f = (i, extra = {}) => ({ id: `f${i}`, order_no: 3000 + i, customer_name: `Friend${i} X`, cook_date: '2026-11-15', paid: true, status: 'new', meal_count: 8, items: [{}], total: 112, referral: { by: '9095550142', pct: 10 }, created_at: '2026-11-10T10:00:00Z', ...extra });

test('credits: earned only when paid and big enough, max 2 per order, used/expired', () => {
  const friends = [f(1), f(2), f(3), f(4, { paid: false }), f(5, { meal_count: 4 })];
  const r = referralCredits(friends, [], '2026-11-20');
  assert.equal(r.available, 3);
  assert.deepEqual(r.use, ['f1', 'f2']);
  assert.equal(r.pct, 10);
  assert.equal(r.credits.filter((c) => c.status === 'pending').length, 2);
  const used = referralCredits(friends, [{ order_no: 9, status: 'new', ref_credit: { ids: ['f1', 'f2'] } }], '2026-11-20');
  assert.deepEqual(used.use, ['f3']);
  assert.equal(used.pct, 5);
  assert.equal(referralCredits(friends, [], '2027-02-01').available, 0); // 60 days later
});

test('new customer, monthly count, codes', () => {
  assert.ok(isNewCustomer([]));
  assert.ok(isNewCustomer([{ status: 'cancelled' }]));
  assert.equal(isNewCustomer([{ status: 'done' }]), false);
  assert.equal(referralsThisMonth([f(1), f(2), f(3, { status: 'cancelled' }), f(4, { created_at: '2026-10-30T10:00:00Z' })], '2026-11-20T00:00:00Z'), 2);
  assert.equal(normRef('marcus-7q2k9'), 'MARCUS7Q2K9');
  assert.equal(refKey('Marcus-7Q2K9'), '7Q2K9');
});

test('discounts: promo + loyalty capped at 20%, referral separate, never above the food', () => {
  // LAUNCH10 + 20% loyalty → 20% cap; + 10% referral credits on top = 30%
  assert.deepEqual(allDiscounts(100, { promoDisc: 10, reward: { kind: 'percent', value: 20 }, creditPct: 10 }), { promo: 10, reward: 10, referral: 0, credit: 10, total: 30 });
  // new customer: 10% promo + 10% referral
  assert.deepEqual(allDiscounts(112, { promoDisc: 11.2, refPct: 10 }), { promo: 11.2, reward: 0, referral: 11.2, credit: 0, total: 22.4 });
  assert.equal(allDiscounts(10, { promoDisc: 10, refPct: 50 }).total, 10);
});
