// Customer Loyalty Rewards Program (Juan's rules, Nov 2026).
//  - Counts PAID, not-cancelled orders, at most ONE per cook week, from the program start week.
//  - "No small orders": an order counts only with 8+ meals, 4+ lb, or a custom quote priced $80+.
//  - Every 5th counted week unlocks a reward for a LATER order:
//      5th → 5% off · 10th → 10% off · 15th → $20 off (a free meal of their choice)
//      20th → 20% off · 25th, 30th, … → 5–10% off (starts at 5%, Juan picks up to 10% in Admin)
//  - A reward lasts 30 days after the week it was earned; Juan can renew an expired one in Admin.
//  - Rewards stack with promo codes, but promo + reward together never go over 20% of the food.
// Pure functions only (used by the server, the checkout page and tests).

export const LOYALTY_DEFAULTS = {
  on: true,
  start: '2026-11-08', // first cook week that counts (launch week)
  expire_days: 30,
  cap_pct: 20, // promo + reward never more than this % of the food subtotal
  min_meals: 8,
  min_lbs: 4,
  min_quote: 80, // custom quote orders count when priced at least this much
  renew: {}, // { "<phone digits>:<milestone>": "YYYY-MM-DD" new expiry } set by Juan
};
export const EVERY = 5;
export const PICK_MIN = 5;
export const PICK_MAX = 10;

const round2 = (n) => Math.round(n * 100) / 100;
const ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
export function addDaysYmd(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n, 12));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
}

export function loyaltyConfig(settings = {}) {
  const raw = (settings && settings.loyalty) || {};
  const num = (v, d, lo, hi) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Math.min(hi, Math.max(lo, Number(v))) : d);
  const renew = {};
  for (const [k, v] of Object.entries(raw.renew || {})) if (/^\d{10}:\d{1,4}$/.test(k) && ymd(v)) renew[k] = v;
  return {
    on: raw.on !== false,
    start: ymd(raw.start) || LOYALTY_DEFAULTS.start,
    expire_days: num(raw.expire_days, LOYALTY_DEFAULTS.expire_days, 1, 365),
    cap_pct: num(raw.cap_pct, LOYALTY_DEFAULTS.cap_pct, 0, 100),
    min_meals: num(raw.min_meals, LOYALTY_DEFAULTS.min_meals, 0, 100),
    min_lbs: num(raw.min_lbs, LOYALTY_DEFAULTS.min_lbs, 0, 100),
    min_quote: num(raw.min_quote, LOYALTY_DEFAULTS.min_quote, 0, 10000),
    renew,
  };
}

// The reward unlocked at a milestone (5, 10, 15, …).
export function tierReward(milestone) {
  if (!milestone || milestone % EVERY) return null;
  if (milestone === 5) return { kind: 'percent', value: 5 };
  if (milestone === 10) return { kind: 'percent', value: 10 };
  if (milestone === 15) return { kind: 'amount', value: 20, meal: true };
  if (milestone === 20) return { kind: 'percent', value: 20 };
  return { kind: 'pick', value: PICK_MIN };
}

export function rewardLabel(r, lang = 'en') {
  if (!r) return '';
  const es = lang === 'es';
  if (r.kind === 'amount') return r.meal ? (es ? `Comida gratis ($${r.value})` : `Free meal ($${r.value} off)`) : `$${r.value} ${es ? 'de descuento' : 'off'}`;
  if (r.kind === 'pick' && !r.picked) return es ? `${PICK_MIN}–${PICK_MAX}% de descuento` : `${PICK_MIN}–${PICK_MAX}% off`;
  return `${r.value}% ${es ? 'de descuento' : 'off'}`;
}
export const ordinal = (n, lang = 'en') => {
  if (lang === 'es') return `${n}.ª`;
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return `${n}${s}`;
};

// Does this order count toward the program?
export function qualifies(o, cfg = loyaltyConfig()) {
  if (!o || !o.paid || o.status === 'cancelled') return false;
  if (!ymd(o.cook_date) || o.cook_date < cfg.start) return false;
  const meals = Number(o.meal_count) || 0;
  const lbs = Number(o.lb_total) || 0;
  if (meals >= cfg.min_meals || lbs >= cfg.min_lbs) return true;
  const quote = !(o.items || []).length && Number(o.total) >= cfg.min_quote;
  return quote;
}

// Full picture for one customer (all their orders). `today` = 'YYYY-MM-DD' (Pacific).
export function loyaltyState(orders = [], today = '', settings = {}, digits = '') {
  const cfg = loyaltyConfig(settings);
  const weeks = [...new Set(orders.filter((o) => qualifies(o, cfg)).map((o) => o.cook_date))].sort();
  const count = weeks.length;
  const usedBy = new Map();
  for (const o of orders) {
    if (o.status === 'cancelled' || !o.reward || !o.reward.milestone) continue;
    usedBy.set(o.reward.milestone, o.order_no || o.id || true);
  }
  const earned = [];
  for (let m = EVERY; m <= count; m += EVERY) {
    const week = weeks[m - 1];
    const renewKey = `${digits}:${m}`;
    const expires = cfg.renew[renewKey] || addDaysYmd(week, cfg.expire_days);
    const used = usedBy.get(m);
    const status = used ? 'used' : today && today > expires ? 'expired' : 'available';
    earned.push({ milestone: m, week, expires, status, used_order: used || null, renewed: !!cfg.renew[renewKey], ...tierReward(m) });
  }
  const available = cfg.on ? earned.find((r) => r.status === 'available') || null : null;
  const nextAt = (Math.floor(count / EVERY) + 1) * EVERY;
  return {
    on: cfg.on,
    count,
    earned,
    available,
    next: { at: nextAt, left: nextAt - count, reward: tierReward(nextAt) },
    progress: count % EVERY, // 0-4 filled pips toward the next reward
  };
}

// $ off a food subtotal for a reward (before the 20% stacking cap).
export function rewardDiscount(r, subtotal) {
  const s = Number(subtotal) || 0;
  if (!r || !(s > 0)) return 0;
  const d = r.kind === 'amount' ? Number(r.value) : (s * Number(r.value)) / 100;
  return round2(Math.min(s, Math.max(0, d)));
}

// Promo + reward together: the reward is trimmed so the total stays at or under cap_pct %
// of the food (a promo alone is never trimmed).
export function stackDiscounts(subtotal, promoDisc, reward, settings = {}) {
  const s = Number(subtotal) || 0;
  const p = round2(Number(promoDisc) || 0);
  let rd = rewardDiscount(reward, s);
  if (rd > 0) {
    const cap = round2((s * loyaltyConfig(settings).cap_pct) / 100);
    rd = round2(Math.max(0, Math.min(rd, Math.max(cap, p) - p)));
  }
  return { promo: p, reward: rd, total: round2(p + rd) };
}

// What gets saved on an order that uses a reward.
export const orderReward = (r, discount = 0) =>
  r ? { milestone: r.milestone, kind: r.kind, value: Number(r.value), ...(r.meal ? { meal: true } : {}), ...(r.picked ? { picked: true } : {}), discount: round2(discount) } : null;

// Short public summary for the checkout and order pages (no other customers' data).
export function publicLoyalty(state, lang = 'en') {
  if (!state || !state.on) return { on: false };
  const a = state.available;
  return {
    on: true,
    count: state.count,
    progress: state.progress,
    next: { at: state.next.at, left: state.next.left, label: rewardLabel(state.next.reward, lang) },
    available: a ? { milestone: a.milestone, kind: a.kind, value: a.value, meal: !!a.meal, label: rewardLabel(a, lang), expires: a.expires } : null,
  };
}
