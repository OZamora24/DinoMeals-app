// "Same as last week?" one-tap reorder (Nov 2026).
//  - The Thursday reminder text adds "🔁 Same as last week? 10 meals (Tri-tip, Chicken) → tap to reorder:
//    dinomeals.app/again/<code>" for customers who ordered in the last 4 weeks and haven't ordered for
//    this Sunday yet. Still one text a week.
//  - The link opens the order page with that order ready: same meals, name, phone, pickup/delivery and
//    payment. They check it and tap Place order (all the usual checks run). This week's prices.
//  - Sold-out items are taken out (with a note); a hidden flavor is cleared so they pick a new one.
//  - A trainer code is put back (5% every order). One-time promo codes and rewards don't carry over.
// Pure helpers (no database), shared by the cron, the API and the tests.
import { PROTEINS, byId, activeFlavors, mealLineCount, nameOf } from './menu.js';
import { linesToCart } from './cart.js';

export const AGAIN_WITHIN_DAYS = 28;
const SHORT = {
  tritip: ['Tri-tip', 'Tri-tip'], swchicken: ['SW Chicken', 'Pollo SW'], chicken: ['Chicken', 'Pollo'],
  shrimp: ['Shrimp', 'Camarones'], burgers: ['Burgers', 'Hamburguesas'], smashburgers: ['Smash Burgers', 'Smash Burgers'],
  groundbeef: ['Ground Beef', 'Carne Molida'], turkey: ['Turkey', 'Pavo'], tilapia: ['Tilapia', 'Tilapia'],
};
const short = (id, lang) => (SHORT[id] ? SHORT[id][lang === 'es' ? 1 : 0] : '');
const ymdAdd = (key, n) => { const [y, m, d] = String(key).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };

const live = (o) => o && o.status !== 'cancelled';
const hasItems = (o) => { const c = linesToCart(o.items); return c.meals.length + c.lbs.length > 0; };

// The order to offer again for this cook week, or null. ownOrders = every order of one phone.
export function orderForAgain(ownOrders = [], week) {
  const mine = ownOrders.filter(live);
  if (mine.some((o) => o.cook_date === week)) return null; // already ordered for this Sunday
  const from = ymdAdd(week, -AGAIN_WITHIN_DAYS);
  return mine
    .filter((o) => o.cook_date < week && o.cook_date >= from && o.status !== 'quote' && hasItems(o))
    .sort((a, b) => String(b.cook_date).localeCompare(String(a.cook_date)) || String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
}

// "10 meals (Tri-tip, Chicken)" / "3 lb (Tri-tip)" / "8 meals + 2 lb (…)"
export function againSummary(order, lang = 'en') {
  const c = linesToCart(order.items);
  const meals = c.meals.reduce((a, m) => a + mealLineCount(m), 0);
  const lbs = c.lbs.reduce((a, l) => a + (Number(l.lbs) || 0), 0);
  const ids = [];
  for (const id of [...c.meals.map((m) => m.protein), ...c.lbs.filter((l) => l.kind === 'protein').map((l) => l.item)]) if (id && !ids.includes(id)) ids.push(id);
  const names = ids.map((id) => short(id, lang)).filter(Boolean);
  const es = lang === 'es';
  const parts = [meals ? `${meals} ${es ? 'comidas' : 'meals'}` : '', lbs ? `${lbs} lb` : ''].filter(Boolean).join(' + ');
  const shown = names.length > 3 ? [...names.slice(0, 3), '…'] : names;
  return shown.length ? `${parts} (${shown.join(', ')})` : parts;
}

export const againUrl = (token) => `https://dinomeals.app/again/${token}`;

// The line inside the Thursday text. lastWeek = the order was for the Sunday right before this one.
export function againLine(order, week, lang = 'en') {
  const lastWeek = order.cook_date === ymdAdd(week, -7);
  const sum = againSummary(order, lang);
  return lang === 'es'
    ? `🔁 ¿${lastWeek ? 'Lo mismo que la semana pasada' : 'Lo mismo que la última vez'}? ${sum} → toca para repetir: ${againUrl(order.view_token)}`
    : `🔁 Same as ${lastWeek ? 'last week' : 'last time'}? ${sum} → tap to reorder: ${againUrl(order.view_token)}`;
}

// The cart to load on the order page. Takes out sold-out items; clears a flavor that's no longer offered.
export function againCart(order, soldOut = []) {
  const so = new Set(soldOut || []);
  const cart = linesToCart(order.items);
  const removed = [];
  const flavorReset = [];
  const label = (m) => nameOf(byId(PROTEINS, m.protein) || { name: m.protein });
  cart.meals = cart.meals.filter((m) => {
    if (so.has(m.protein) || so.has(m.carb) || so.has(m.veg)) { removed.push(`${mealLineCount(m)}× ${label(m)}`); return false; }
    return true;
  }).map((m) => {
    const p = byId(PROTEINS, m.protein);
    if (m.flavor && p && !activeFlavors(p.flavors).some((f) => f.id === m.flavor)) { flavorReset.push(label(m)); return { ...m, flavor: null }; }
    return m;
  });
  cart.lbs = cart.lbs.filter((l) => {
    if (so.has(l.item)) { removed.push(`${l.lbs} lb ${l.item}`); return false; }
    return true;
  });
  cart.extras = (cart.extras || []).filter((e) => !so.has(e.item));
  return { cart, removed, flavorReset };
}

// What the order page fills in (never anything about other people).
export const againInfo = (o) => ({
  name: o.customer_name || '', phone: o.phone || '', email: o.email || '',
  fulfillment: o.fulfillment || 'pickup', address: o.address || '', zip: o.zip || '', delivery_notes: o.delivery_notes || '',
  payment_method: o.payment_method || '', diet: o.diet || [], allergy_notes: o.allergy_notes || '',
});
