import test from 'node:test';
import assert from 'node:assert/strict';
import { displayName, itemsToRate, cleanReview, canReview, reviewOpensOn, summarize, mealScores, scoreboard, publicReview, orderToAsk, partKey, keyLabel } from '../lib/reviews.js';
import { rateLine, reminderMessage } from '../lib/sms.js';
import { promoPayload } from '../lib/pushPayload.js';

const order = {
  id: 'o1', order_no: 1093, phone_digits: '9095550199', customer_name: 'maria del carmen lopez', status: 'new', cook_date: '2026-11-08',
  items: [
    { type: 'meal', protein: 'tritip', carb: 'cilantrorice', veg: 'broccoli', count: 4 },
    { type: 'meal', protein: 'chicken', flavor: 'teriyaki', carb: 'whiterice', veg: 'none', count: 4 },
    { type: 'lb', kind: 'protein', item: 'chicken', flavor: 'chipotle', lbs: 1 },
  ],
};

test('names show as first name + last initial', () => {
  assert.equal(displayName('maria del carmen lopez'), 'Maria L.');
  assert.equal(displayName('Isaac'), 'Isaac');
  assert.equal(displayName(''), 'Customer');
});

test('the parts to rate come from the order: proteins, then carbs, then veggies, once each', () => {
  assert.deepEqual(itemsToRate(order), ['p:tritip', 'p:chicken', 'c:cilantrorice', 'c:whiterice', 'v:broccoli']);
  assert.equal(keyLabel('p:tritip'), 'Smoked Tri-tip Steak');
  assert.equal(partKey('veg', 'broccoli'), 'v:broccoli');
});

test('review form opens the Tuesday after cook day, never on cancelled orders', () => {
  assert.equal(reviewOpensOn('2026-11-08'), '2026-11-10');
  assert.equal(canReview(order, '2026-11-09'), false);
  assert.equal(canReview(order, '2026-11-10'), true);
  assert.equal(canReview({ ...order, status: 'cancelled' }, '2026-11-12'), false);
});

test('cleanReview keeps only real stars, parts from this order, and a trimmed comment', () => {
  assert.deepEqual(cleanReview({ stars: 0 }, order), { error: 'stars_required' });
  const r = cleanReview({ stars: '5', meals: [{ key: 'p:tritip', stars: 5 }, { key: 'p:shrimp', stars: 1 }, { key: 'c:whiterice', stars: 9 }, { key: 'p:tritip', stars: 1 }], comment: '  so good  ', lang: 'es' }, order).review;
  assert.equal(r.stars, 5);
  assert.deepEqual(r.meals, [{ key: 'p:tritip', stars: 5 }]);
  assert.equal(r.comment, 'so good');
  assert.equal(r.display_name, 'Maria L.');
  assert.equal(r.lang, 'es');
  assert.equal(r.status, 'published');
});

test('scores: overall shows at 3 reviews, meals at 3 ratings, hidden reviews never count', () => {
  const rv = (stars, meals, status = 'published') => ({ stars, meals, status });
  const list = [rv(5, [{ key: 'p:tritip', stars: 5 }]), rv(4, [{ key: 'p:tritip', stars: 4 }, { key: 'c:whiterice', stars: 3 }]), rv(5, [{ key: 'p:tritip', stars: 5 }]), rv(1, [{ key: 'p:tritip', stars: 1 }], 'hidden')];
  const s = summarize(list);
  assert.deepEqual(s, { count: 3, avg: 4.7, dist: [2, 1, 0, 0, 0], show: true });
  assert.equal(summarize(list.slice(0, 2)).show, false);
  const m = mealScores(list);
  assert.deepEqual(m['p:tritip'], { avg: 4.7, count: 3, ready: true });
  assert.equal(m['c:whiterice'].ready, false);
  assert.equal(scoreboard(m)[0].label, 'Smoked Tri-tip Steak');
  assert.deepEqual(publicReview({ id: 'x', display_name: 'Maria L.', stars: 5, meals: [{ key: 'p:tritip', stars: 5 }, { key: 'c:whiterice', stars: 3 }], comment: 'yum', phone_digits: '9095550199' }).meals, ['p:tritip']);
  assert.equal('phone_digits' in publicReview({ phone_digits: '1' }), false);
});

test('Thursday ask: first order always (once), then at most every 4 weeks, never reviewed orders', () => {
  const o = (id, cook, extra = {}) => ({ id, cook_date: cook, status: 'done', view_token: `t${id}`, ...extra });
  // first-ever order, picked up Sun Nov 8 -> asked Thu Nov 12
  assert.equal(orderToAsk([o('a', '2026-11-08')], new Set(), '2026-11-12', '2026-11-13T00:00:00Z').id, 'a');
  // already asked once -> not again
  assert.equal(orderToAsk([o('a', '2026-11-08', { review_asked_at: '2026-11-13T00:00:00Z' })], new Set(), '2026-11-12'), null);
  // regular asked 2 weeks ago -> skip; 5 weeks ago -> ask newest open order
  const reg = [o('x', '2026-10-04', { review_asked_at: '2026-10-29T00:00:00Z' }), o('y', '2026-11-08')];
  assert.equal(orderToAsk(reg, new Set(['x']), '2026-11-12', '2026-11-13T00:00:00Z'), null);
  assert.equal(orderToAsk(reg, new Set(['x']), '2026-11-12', '2026-12-05T00:00:00Z').id, 'y');
  // already reviewed / too old / form not open yet
  assert.equal(orderToAsk([o('a', '2026-11-08')], new Set(['a']), '2026-11-12'), null);
  assert.equal(orderToAsk([o('a', '2026-10-04')], new Set(), '2026-11-12'), null);
  assert.equal(orderToAsk([o('a', '2026-11-15')], new Set(), '2026-11-12'), null);
});

test('the rate line rides in the Thursday reminder; the Tuesday push opens /rate', () => {
  assert.equal(rateLine('ab12', 'en'), "⭐ Rate last week's meals: https://dinomeals.app/o/ab12");
  assert.match(reminderMessage('es', { cutoff_day: 5, cutoff_hour: 10 }, rateLine('ab12', 'es')), /Califica tus comidas: https:\/\/dinomeals\.app\/o\/ab12 Ordena/);
  const p = promoPayload({ id: 'review-ask', title: 'T', body: 'B', url: '/rate' });
  assert.equal(p.url, '/rate');
  assert.equal(p.id, '');
  assert.equal(promoPayload({ id: 'x1', title: 'T', body: 'B' }).url, '/?promo=x1');
  assert.equal(promoPayload({ id: 'x1', title: 'T', body: 'B', url: 'https://evil.example' }).url, '/?promo=x1');
});
