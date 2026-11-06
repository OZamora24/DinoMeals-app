import test from 'node:test';
import assert from 'node:assert/strict';
import { trainerConfig, cleanTrainerList, findTrainer, trainerByPhone, trainerPct, trainerRow, trainerCredits, useTrainerCredits, clientsThisMonth } from '../lib/trainer.js';
import { monthlyConfig, monthlyWeeks, activeMonthly, weekSizeOk, monthlyRow } from '../lib/monthly.js';
import { qualifies, loyaltyConfig, loyaltyState } from '../lib/loyalty.js';
import { discountParts } from '../lib/orderView.js';

const ISAAC = { name: 'Isaac Miravet', phone: '(626) 257-4520', code: 'coachisaac' };

test('trainer config defaults follow Juan: 10% first, 5% after, $5 credit, 100 days', () => {
  assert.deepEqual(trainerConfig({}), { on: true, first_pct: 10, pct: 5, credit: 5, expire_days: 100 });
  assert.equal(trainerConfig({ trainer: { pct: 99 } }).pct, 50);
});

test('trainer list is cleaned; codes are unique and case-insensitive; paused codes do not work', () => {
  const list = cleanTrainerList([ISAAC, { ...ISAAC, name: 'Dup' }, { name: 'No phone', code: 'X1' }]);
  assert.equal(list.length, 1);
  assert.deepEqual(list[0], { code: 'COACHISAAC', name: 'Isaac Miravet', phone: '6262574520', active: true, added: '' });
  assert.equal(findTrainer(list, 'CoachIsaac')?.name, 'Isaac Miravet');
  assert.equal(findTrainer([{ ...ISAAC, active: false }], 'COACHISAAC'), null);
  assert.equal(trainerByPhone(list, '6262574520')?.code, 'COACHISAAC');
  const cfg = trainerConfig({});
  assert.equal(trainerPct(cfg, true), 10);
  assert.equal(trainerPct(cfg, false), 5);
  assert.deepEqual(trainerRow(list[0], 10, 16.8, true), { code: 'COACHISAAC', by: '6262574520', name: 'Isaac', pct: 10, first: true, discount: 16.8 });
});

test('trainer earns $5 per PAID client order; credits used one-or-all, expire after 100 days', () => {
  const by = '6262574520';
  const client = (id, paid, cook, extra = {}) => ({ id, order_no: 2000 + id, customer_name: 'Ana Ruiz', phone_digits: '9095550001', paid, status: 'new', cook_date: cook, trainer: { by, code: 'COACHISAAC' }, created_at: `${cook}T10:00:00Z`, ...extra });
  const clients = [client(1, true, '2026-11-08'), client(2, true, '2026-11-15'), client(3, false, '2026-11-22'), client(4, true, '2026-11-22', { status: 'cancelled' }), client(5, true, '2026-01-04')];
  const tc = trainerCredits(clients, [], '2026-11-20', {});
  assert.equal(tc.available, 2);
  assert.equal(tc.amount, 10);
  assert.deepEqual(tc.credits.map((c) => c.status).sort(), ['available', 'available', 'expired', 'pending']);
  // after the trainer used credit #1 on their own order
  const tc2 = trainerCredits(clients, [{ order_no: 3000, status: 'new', trainer_credit: { ids: ['1'], amount: 5 } }], '2026-11-20', {});
  assert.equal(tc2.available, 1);
  assert.equal(tc2.credits.find((c) => c.id === '1').used_on, 3000);
  // fits whole credits only, never more than what's left of the food
  assert.deepEqual(useTrainerCredits(['a', 'b', 'c'], 5, 100), { ids: ['a', 'b', 'c'], amount: 15 });
  assert.deepEqual(useTrainerCredits(['a', 'b', 'c'], 5, 12), { ids: ['a', 'b'], amount: 10 });
  assert.deepEqual(useTrainerCredits(['a'], 5, 3), { ids: [], amount: 0 });
  assert.equal(clientsThisMonth(clients, '2026-11-20T00:00:00Z'), 1);
  // the trainer's own order with their code never earns
  assert.equal(trainerCredits([client(9, true, '2026-11-08', { phone_digits: by })], [], '2026-11-10', {}).credits.length, 0);
});

test('monthly plan: 4 weekly cook dates, sizes 8/10/12 or lb, max active plans', () => {
  assert.deepEqual(monthlyConfig({}), { on: true, pct: 10, max: 10, weeks: 4 });
  assert.deepEqual(monthlyWeeks('2026-11-15'), ['2026-11-15', '2026-11-22', '2026-11-29', '2026-12-06']);
  assert.ok(weekSizeOk(8, 0) && weekSizeOk(10, 0) && weekSizeOk(12, 2) && weekSizeOk(0, 4));
  assert.ok(!weekSizeOk(9, 0) && !weekSizeOk(16, 0) && !weekSizeOk(0, 0));
  const orders = [
    { monthly: { id: 'A' }, cook_date: '2026-11-08', status: 'new' },
    { monthly: { id: 'B' }, cook_date: '2026-11-29', status: 'new' },
    { monthly: { id: 'C' }, cook_date: '2026-11-29', status: 'cancelled' },
  ];
  assert.deepEqual([...activeMonthly(orders, '2026-11-20')], ['B']);
  assert.deepEqual(monthlyRow('A', 1, 4, 10, 16.8, 600.4), { id: 'A', week: 1, of: 4, pct: 10, discount: 16.8, plan_total: 600.4 });
});

test('a monthly plan counts as ONE loyalty order', () => {
  const cfg = loyaltyConfig({ loyalty: { start: '2026-01-01' } });
  const w = (week, cook) => ({ paid: true, status: 'new', cook_date: cook, meal_count: 10, items: [{}], monthly: { id: 'P', week, of: 4 } });
  const plan = [w(1, '2026-11-15'), w(2, '2026-11-22'), w(3, '2026-11-29'), w(4, '2026-12-06')];
  assert.deepEqual(plan.map((o) => qualifies(o, cfg)), [true, false, false, false]);
  assert.equal(loyaltyState(plan, '2026-11-20', { loyalty: { start: '2026-01-01' } }).count, 1);
});

test('discount parts split trainer, trainer credit and plan from the promo part', () => {
  const o = { discount: 31.8, trainer: { discount: 16.8 }, trainer_credit: { amount: 15 } };
  assert.deepEqual(discountParts(o), { promo: 0, reward: 0, referral: 0, credit: 0, trainer: 16.8, tcredit: 15, monthly: 0 });
  assert.equal(discountParts({ discount: 20, promo: { code: 'X' }, monthly: null, reward: { discount: 5 } }).promo, 15);
  assert.equal(discountParts({ discount: 16.8, monthly: { discount: 16.8 } }).monthly, 16.8);
});
