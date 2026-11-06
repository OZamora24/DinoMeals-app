// Trainer Partner program (Juan's rules, Nov 2026).
//  - Juan adds trainers in Admin → Trainers: name, phone and their code (e.g. COACHISAAC).
//  - A client typing the trainer's code (in the promo code box) gets 10% off their FIRST order
//    with DinoMeals, then 5% off every order after that, as long as they keep using the code.
//  - The code takes the promo-code spot: it shares the 20% max with loyalty rewards.
//  - The trainer earns a $5 meal credit every time a client's order is PAID (not cash/Venmo).
//    Credits pile up, the trainer can use one or all of them on their own order, and each
//    lasts 100 days. Separate from the friend referral program.
// Pure helpers (no database) so the server, the admin and the tests share them.
import { normCode } from './promo.js';
import { addDaysYmd } from './loyalty.js';

export const TRAINER_DEFAULTS = { on: true, first_pct: 10, pct: 5, credit: 5, expire_days: 100 };
export const MAX_TRAINERS = 50;

const round2 = (n) => Math.round(n * 100) / 100;
const digitsOf = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
};

export function trainerConfig(settings = {}) {
  const raw = (settings && settings.trainer) || {};
  const num = (v, d, lo, hi) => (v !== '' && v != null && Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
  return {
    on: raw.on !== false,
    first_pct: num(raw.first_pct, TRAINER_DEFAULTS.first_pct, 0, 50),
    pct: num(raw.pct, TRAINER_DEFAULTS.pct, 0, 50),
    credit: round2(num(raw.credit, TRAINER_DEFAULTS.credit, 0, 100)),
    expire_days: Math.round(num(raw.expire_days, TRAINER_DEFAULTS.expire_days, 1, 730)),
  };
}

// { code, name, phone (10 digits), active, added }
export function cleanTrainer(t) {
  const code = normCode(t && t.code);
  const phone = digitsOf(t && t.phone);
  const name = String((t && t.name) || '').trim().slice(0, 60);
  if (!code || !name || phone.length !== 10) return null;
  const added = /^\d{4}-\d{2}-\d{2}$/.test((t && t.added) || '') ? t.added : '';
  return { code, name, phone, active: t.active !== false, added };
}

export function cleanTrainerList(list) {
  const seen = new Set();
  const out = [];
  for (const t of Array.isArray(list) ? list.slice(0, MAX_TRAINERS) : []) {
    const c = cleanTrainer(t);
    if (c && !seen.has(c.code)) { seen.add(c.code); out.push(c); }
  }
  return out;
}

// Active trainer for a typed code, or null.
export function findTrainer(list, code) {
  const c = normCode(code);
  if (!c) return null;
  const t = cleanTrainerList(list).find((x) => x.code === c);
  return t && t.active ? t : null;
}
export const trainerByPhone = (list, digits) => cleanTrainerList(list).find((x) => x.phone === digits) || null;

// % for this client: first order ever with DinoMeals → first_pct, otherwise pct.
export const trainerPct = (cfg, isNew) => (isNew ? cfg.first_pct : cfg.pct);

// Saved on the client's order.
export const trainerRow = (t, pct, discount, first) => ({ code: t.code, by: t.phone, name: String(t.name).split(' ')[0].slice(0, 30), pct, first: !!first, discount: round2(discount) });

// A trainer's $ credits: one per PAID client order with their code (not their own orders).
//   clientOrders: orders where trainer.by === the trainer's digits
//   ownOrders:    the trainer's own orders (to see which credits were already used)
export function trainerCredits(clientOrders = [], ownOrders = [], today = '', settings = {}) {
  const cfg = trainerConfig(settings);
  const used = new Map();
  for (const o of ownOrders) {
    if (o.status === 'cancelled' || !o.trainer_credit) continue;
    for (const id of o.trainer_credit.ids || []) used.set(String(id), o.order_no || true);
  }
  const credits = clientOrders
    .filter((o) => o.trainer && o.status !== 'cancelled' && o.phone_digits !== o.trainer.by)
    .map((o) => {
      const id = String(o.id);
      const expires = addDaysYmd(o.cook_date, cfg.expire_days);
      const status = !o.paid ? 'pending' : used.has(id) ? 'used' : today && today > expires ? 'expired' : 'available';
      return { id, client: String(o.customer_name || '').split(' ')[0], order_no: o.order_no, cook_date: o.cook_date, expires, status, used_on: used.get(id) || null, value: cfg.credit };
    })
    .sort((a, b) => String(a.expires).localeCompare(String(b.expires)));
  const available = credits.filter((c) => c.status === 'available');
  return { credits, available: available.length, ids: cfg.on ? available.map((c) => c.id) : [], amount: cfg.on ? round2(available.length * cfg.credit) : 0, each: cfg.credit };
}

// How many whole credits fit on what's left of the food after every other discount
// (never more than the food). Oldest (soonest to expire) first.
export function useTrainerCredits(ids = [], each = 5, left = 0) {
  const fit = each > 0 ? Math.min(ids.length, Math.floor((Math.max(0, Number(left) || 0) + 0.001) / each)) : 0;
  const use = ids.slice(0, fit);
  return { ids: use, amount: round2(use.length * each) };
}
export const trainerCreditRow = (u) => (u && u.ids.length ? { ids: u.ids, amount: round2(u.amount) } : null);

// Clients this month (not cancelled) for the admin list.
export function clientsThisMonth(clientOrders = [], nowIso = new Date().toISOString()) {
  const m = String(nowIso).slice(0, 7);
  return new Set(clientOrders.filter((o) => o.status !== 'cancelled' && String(o.created_at || '').slice(0, 7) === m).map((o) => o.phone_digits)).size;
}
