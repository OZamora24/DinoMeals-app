// Referral program (Juan's rules, Nov 2026).
//  - Every customer gets a personal code/link (dinomeals.app/order?ref=MARCUS-7Q2K).
//  - A NEW customer (phone that never ordered) using it gets 10% off their first order.
//  - The referrer earns a 5% credit once that friend's first order is PAID and counts
//    (8+ meals, 4+ lb, or a custom quote of $80+ — same rule as loyalty).
//  - Credits pile up if they don't order often; up to 2 are used on one order (10%).
//  - Max 10 referrals per referrer per month. Credits last 60 days.
//  - Inside the same 20% max as promo/trainer codes + loyalty rewards (Juan, Nov 11: "Max 20%. I still
//    want to stay profitable"). Credits that don't fit wait for the next order (still within 60 days).
// Pure helpers (the code itself is made on the server in lib/referralCode.js).
import { qualifies, loyaltyConfig, addDaysYmd, stackDiscounts } from './loyalty.js';

export const REFERRAL_DEFAULTS = { on: true, new_pct: 10, credit_pct: 5, max_stack: 2, monthly_cap: 10, expire_days: 60 };

export function referralConfig(settings = {}) {
  const raw = (settings && settings.referral) || {};
  const num = (v, d, lo, hi) => (v !== '' && v != null && Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
  return {
    on: raw.on !== false,
    new_pct: num(raw.new_pct, REFERRAL_DEFAULTS.new_pct, 0, 50),
    credit_pct: num(raw.credit_pct, REFERRAL_DEFAULTS.credit_pct, 0, 50),
    max_stack: Math.round(num(raw.max_stack, REFERRAL_DEFAULTS.max_stack, 1, 10)),
    monthly_cap: Math.round(num(raw.monthly_cap, REFERRAL_DEFAULTS.monthly_cap, 0, 1000)),
    expire_days: Math.round(num(raw.expire_days, REFERRAL_DEFAULTS.expire_days, 1, 730)),
  };
}

const round2 = (n) => Math.round(n * 100) / 100;
export const pctOff = (pct, subtotal) => round2(Math.max(0, Math.min(Number(subtotal) || 0, ((Number(subtotal) || 0) * pct) / 100)));
export const normRef = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
// Only the part after the name matters (the name is just to make it friendly).
export const refKey = (code) => normRef(code).slice(-5);

// A phone is "new" if it has no earlier non-cancelled order.
export const isNewCustomer = (pastOrders = []) => !pastOrders.some((o) => o.status !== 'cancelled');

// month key 'YYYY-MM' of a date string / ISO
const monthOf = (iso) => String(iso || '').slice(0, 7);

// How many friends this referrer brought this month (not cancelled).
export function referralsThisMonth(friendOrders = [], nowIso = new Date().toISOString()) {
  const m = monthOf(nowIso);
  return friendOrders.filter((o) => o.status !== 'cancelled' && o.referral && monthOf(o.created_at) === m).length;
}

// The referrer's credits: one per friend whose first order is paid and counts.
//   friendOrders: orders where referral.by === referrer digits
//   ownOrders:    the referrer's own orders (to see which credits were already used)
export function referralCredits(friendOrders = [], ownOrders = [], today = '', settings = {}) {
  const cfg = referralConfig(settings);
  const lcfg = loyaltyConfig({ loyalty: { ...((settings && settings.loyalty) || {}), start: '2000-01-01' } });
  const used = new Map();
  for (const o of ownOrders) {
    if (o.status === 'cancelled' || !o.ref_credit) continue;
    for (const id of o.ref_credit.ids || []) used.set(String(id), o.order_no || true);
  }
  const credits = friendOrders
    .filter((o) => o.referral && o.status !== 'cancelled')
    .map((o) => {
      const earned = qualifies(o, lcfg);
      const id = String(o.id);
      const expires = addDaysYmd(o.cook_date, cfg.expire_days);
      const status = !earned ? 'pending' : used.has(id) ? 'used' : today && today > expires ? 'expired' : 'available';
      return { id, friend: String(o.customer_name || '').split(' ')[0], order_no: o.order_no, cook_date: o.cook_date, expires, status, used_on: used.get(id) || null };
    })
    .sort((a, b) => String(a.cook_date).localeCompare(String(b.cook_date)));
  const available = credits.filter((c) => c.status === 'available');
  const use = cfg.on ? available.slice(0, cfg.max_stack) : [];
  return { credits, available: available.length, use: use.map((c) => c.id), pct: use.length * cfg.credit_pct };
}

// Saved on the friend's first order / on the referrer's order that uses credits.
export const referralRow = (code, byDigits, byName, pct, discount) => ({ code: normRef(code), by: byDigits, by_name: String(byName || '').split(' ')[0].slice(0, 30), pct, discount: round2(discount) });
export const creditRow = (ids, pct, discount) => (ids.length ? { ids, pct, discount: round2(discount) } : null);

// Every discount on one food subtotal, all inside ONE cap (loyalty cap_pct, 20%): promo/trainer code +
// loyalty reward first (stackDiscounts), then a friend's referral %, then referral credits in whole
// credits only (a credit that doesn't fully fit isn't used and waits for the next order).
// creditPct in the result = the credit % actually used (a quote, priced later, keeps all of them).
export function allDiscounts(subtotal, { promoDisc = 0, reward = null, refPct = 0, creditPct = 0 } = {}, settings = {}) {
  const s = Number(subtotal) || 0;
  const st = stackDiscounts(s, promoDisc, reward, settings);
  const capAmt = round2((s * loyaltyConfig(settings).cap_pct) / 100);
  let room = Math.max(0, round2(Math.max(capAmt, st.total) - st.total));
  const referral = Math.min(room, pctOff(refPct, s)); room = round2(room - referral);
  const each = Number(settings && settings.referral_credit_pct) || referralConfig(settings).credit_pct || 5;
  let usedPct = creditPct;
  if (creditPct > 0 && s > 0) usedPct = Math.min(creditPct, Math.floor(((room / s) * 100 + 1e-6) / each) * each);
  const credit = s > 0 ? Math.min(room, pctOff(usedPct, s)) : 0;
  return { promo: st.promo, reward: st.reward, referral: round2(referral), credit: round2(credit), creditPct: usedPct, total: round2(st.total + referral + credit) };
}
