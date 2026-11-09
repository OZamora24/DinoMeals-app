// Customer reviews (Juan, Nov 2026).
//  - Only real customers: a review belongs to one order (its private /o/<code> page), one per order.
//  - 1–5 stars overall, optional stars for each meal part they had, optional comment.
//  - Shown with first name + last initial ("Maria L."), never the phone or full name.
//  - Juan can reply publicly and hide spam / abuse. Low ratings are never hidden just for being low.
//  - Each meal shows its score on the menu once it has MIN_MEAL_RATINGS ratings.
//  - Asked on Tuesday evening after a Sunday pickup (push) and inside the Thursday reminder text:
//    always after a customer's first order, then at most once every ASK_EVERY_DAYS.
// Pure helpers (no database) shared by the server, the pages and the tests.
import { PROTEINS, CARBS, VEGGIES, NONE, byId, nameOf } from './menu.js';

export const MIN_MEAL_RATINGS = 3;
export const MIN_OVERALL = 3; // the overall score shows once there are this many reviews
export const ASK_EVERY_DAYS = 28;
export const OPEN_AFTER_DAYS = 2; // the form opens Tuesday after a Sunday cook day
export const MAX_COMMENT = 600;

const round1 = (n) => Math.round(n * 10) / 10;
const ymdAdd = (key, n) => {
  const [y, m, d] = String(key).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
};

// "Maria Lopez" -> "Maria L."
export function displayName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Customer';
  const first = parts[0].slice(0, 20);
  const first2 = first.charAt(0).toUpperCase() + first.slice(1);
  return parts.length > 1 ? `${first2} ${parts[parts.length - 1].charAt(0).toUpperCase()}.` : first2;
}

// Key for one meal part: p:tritip, c:whiterice, v:broccoli (flavors share their protein's score).
export const partKey = (kind, id) => `${kind === 'protein' ? 'p' : kind === 'carb' ? 'c' : 'v'}:${id}`;
export function keyInfo(key) {
  const [k, id] = String(key || '').split(':');
  const kind = k === 'p' ? 'protein' : k === 'c' ? 'carb' : k === 'v' ? 'veg' : null;
  const list = kind === 'protein' ? PROTEINS : kind === 'carb' ? CARBS : kind === 'veg' ? VEGGIES : null;
  const item = list && byId(list, id);
  return item ? { kind, id, item } : null;
}
export const keyLabel = (key, lang = 'en') => {
  const k = keyInfo(key);
  return k ? nameOf(k.item, lang) : '';
};

// The parts a customer can rate for one order: proteins first, then carbs, then veggies.
export function itemsToRate(order) {
  const seen = new Set();
  const out = [];
  const add = (kind, id) => {
    if (!id || id === NONE) return;
    const key = partKey(kind, id);
    if (seen.has(key) || !keyInfo(key)) return;
    seen.add(key); out.push(key);
  };
  for (const l of (order && order.items) || []) {
    if (l.type === 'meal') { add('protein', l.protein); add('carb', l.carb); add('veg', l.veg); }
    else if (l.kind) add(l.kind, l.item);
  }
  for (const l of (order && order.label_lines) || []) {
    if (l.type === 'lb') add(l.kind, l.item);
    else { add('protein', l.protein); add('carb', l.carb); add('veg', l.veg); }
  }
  const rank = { p: 0, c: 1, v: 2 };
  return out.sort((a, b) => rank[a[0]] - rank[b[0]]);
}

const starOk = (n) => Number.isInteger(n) && n >= 1 && n <= 5;

// Validates what the customer sent. Returns { error } or { review } ready to save.
export function cleanReview(body, order) {
  const stars = parseInt(body && body.stars, 10);
  if (!starOk(stars)) return { error: 'stars_required' };
  const allowed = new Set(itemsToRate(order));
  const meals = [];
  for (const m of Array.isArray(body && body.meals) ? body.meals.slice(0, 30) : []) {
    const s = parseInt(m && m.stars, 10);
    if (m && allowed.has(m.key) && starOk(s) && !meals.some((x) => x.key === m.key)) meals.push({ key: m.key, stars: s });
  }
  const comment = String((body && body.comment) || '').replace(/\s+\n/g, '\n').trim().slice(0, MAX_COMMENT);
  return {
    review: {
      order_id: order.id,
      order_no: order.order_no,
      phone_digits: order.phone_digits,
      display_name: displayName(order.customer_name),
      stars,
      meals,
      comment,
      lang: body && body.lang === 'es' ? 'es' : 'en',
      status: 'published',
    },
  };
}

// When the review form opens for an order: Tuesday after its cook day.
export const reviewOpensOn = (cookDate) => (cookDate ? ymdAdd(cookDate, OPEN_AFTER_DAYS) : '');
export const canReview = (order, today) =>
  !!order && order.status !== 'cancelled' && !!order.cook_date && today >= reviewOpensOn(order.cook_date);

// Overall score from published reviews.
export function summarize(reviews = []) {
  const pub = reviews.filter((r) => r.status !== 'hidden');
  const dist = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const r of pub) { dist[r.stars - 1] += 1; sum += r.stars; }
  const count = pub.length;
  return { count, avg: count ? round1(sum / count) : 0, dist: dist.reverse(), show: count >= MIN_OVERALL }; // dist = [5★,4★,3★,2★,1★]
}

// Score per meal part: { 'p:tritip': { avg, count } }. `ready` = has enough ratings to show.
export function mealScores(reviews = []) {
  const acc = {};
  for (const r of reviews) {
    if (r.status === 'hidden') continue;
    for (const m of r.meals || []) {
      const a = (acc[m.key] ||= { sum: 0, count: 0 });
      a.sum += m.stars; a.count += 1;
    }
  }
  const out = {};
  for (const [k, a] of Object.entries(acc)) out[k] = { avg: round1(a.sum / a.count), count: a.count, ready: a.count >= MIN_MEAL_RATINGS };
  return out;
}

// Ranked list for Juan's scoreboard (best first; parts with fewer ratings still listed, marked).
export const scoreboard = (scores, lang = 'en') =>
  Object.entries(scores)
    .map(([key, s]) => ({ key, label: keyLabel(key, lang), kind: keyInfo(key)?.kind || '', ...s }))
    .filter((r) => r.label)
    .sort((a, b) => b.avg - a.avg || b.count - a.count);

// Public card (what anyone may see).
export const publicReview = (r) => ({
  id: r.id,
  name: r.display_name,
  stars: r.stars,
  comment: r.comment || '',
  meals: (r.meals || []).filter((m) => m.stars >= 4).map((m) => m.key), // "loved" chips
  reply: r.reply || '',
  created_at: r.created_at,
  lang: r.lang || 'en',
});

// Should this customer's order get the "rate last week's meals" line in Thursday's reminder?
//   orders: every order of this phone (any week); reviewedIds: Set of order ids already reviewed.
// Picks the newest order whose review form is open and that isn't reviewed. First order ever →
// always; otherwise only if nothing was asked in the last ASK_EVERY_DAYS.
export function orderToAsk(orders = [], reviewedIds = new Set(), today = '', nowIso = new Date().toISOString()) {
  const live = orders.filter((o) => o.status !== 'cancelled');
  const open = live
    .filter((o) => canReview(o, today) && !reviewedIds.has(o.id) && today <= ymdAdd(o.cook_date, 13))
    .sort((a, b) => String(b.cook_date).localeCompare(String(a.cook_date)));
  if (!open.length) return null;
  const firstEver = live.length && live.every((o) => o.cook_date >= open[0].cook_date) && !live.some((o) => reviewedIds.has(o.id));
  if (firstEver) return open[0].review_asked_at ? null : open[0];
  const last = live.map((o) => o.review_asked_at).filter(Boolean).sort().pop();
  if (last && Date.parse(nowIso) - Date.parse(last) < ASK_EVERY_DAYS * 864e5) return null;
  return open[0];
}
