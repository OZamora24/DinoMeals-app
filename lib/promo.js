// Promo codes (e.g. LAUNCH10). Juan creates them in /admin → Menu & settings.
// Saved in shop settings as promo_codes (never sent to the public settings);
// each order keeps a copy of the code it used (promo) and the $ discount.
//   { code: 'LAUNCH10', type: 'percent' | 'amount', value: 10, active: true, starts: 'YYYY-MM-DD' | '', ends: 'YYYY-MM-DD' | '',
//     once: true (each customer/phone can use it one time), new_only: true (only a phone that never ordered) }
// e.g. FIRSTDINO: always on, 10% off, new customers only (Juan, Nov 2026).
// The discount comes off the FOOD subtotal only (not delivery or card fees).

export const MAX_CODES = 20;
export const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
const round2 = (n) => Math.round(n * 100) / 100;

export function cleanPromo(p) {
  const code = normCode(p && p.code);
  if (!code) return null;
  const type = p.type === 'amount' ? 'amount' : 'percent';
  let value = Math.round((Number(p.value) || 0) * 100) / 100;
  value = type === 'percent' ? Math.min(100, Math.max(0, value)) : Math.min(1000, Math.max(0, value));
  const ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : '');
  return { code, type, value, active: p.active !== false, starts: ymd(p.starts), ends: ymd(p.ends), once: !!p.once, new_only: !!p.new_only };
}

export function cleanPromoList(list) {
  const seen = new Set();
  const out = [];
  for (const p of Array.isArray(list) ? list.slice(0, MAX_CODES) : []) {
    const c = cleanPromo(p);
    if (c && !seen.has(c.code)) { seen.add(c.code); out.push(c); }
  }
  return out;
}

// The usable promo for a typed code: active, value > 0 and inside its start/end dates (Pacific day).
export function findPromo(list, code, today = '') {
  const c = normCode(code);
  if (!c) return null;
  const p = cleanPromoList(list).find((x) => x.code === c);
  if (!p || !p.active || !(p.value > 0)) return null;
  if (p.ends && today && today > p.ends) return null;
  if (p.starts && today && today < p.starts) return null;
  return { code: p.code, type: p.type, value: p.value, ...(p.once ? { once: true } : {}), ...(p.new_only ? { new_only: true } : {}) };
}

// Can this phone use the code? pastOrders = that phone's other orders.
//   'promo_new_only' -> the code is for new customers and this phone already ordered
//   'promo_used'     -> one time per customer and this phone already used it
export function promoBlock(promo, pastOrders = []) {
  if (!promo) return null;
  const live = (pastOrders || []).filter((o) => o && o.status !== 'cancelled');
  if (promo.new_only && live.length) return 'promo_new_only';
  if (promo.once && live.some((o) => o.promo && normCode(o.promo.code) === promo.code)) return 'promo_used';
  return null;
}

// Admin adding a code to an order that's already placed: any saved code with a value (Juan decides;
// dates, on/off and the one-time / new-customer rules don't block him).
export function adminPromo(list, code) {
  const c = normCode(code);
  const p = cleanPromoList(list).find((x) => x.code === c && x.value > 0);
  return p ? { code: p.code, type: p.type, value: p.value, ...(p.once ? { once: true } : {}), ...(p.new_only ? { new_only: true } : {}) } : null;
}

// $ off a food subtotal (never more than the subtotal).
export function promoDiscount(promo, subtotal) {
  const s = Number(subtotal) || 0;
  if (!promo || !(s > 0)) return 0;
  const d = promo.type === 'amount' ? Number(promo.value) : (s * Number(promo.value)) / 100;
  return round2(Math.min(s, Math.max(0, d)));
}

// Custom quote with a promo saved at checkout: the price Juan types is BEFORE the discount.
//   quotePrice({type:'percent',value:10}, 150) -> { subtotal: 150, discount: 15, total: 135 }
export function quotePrice(promo, price) {
  const p = round2(Math.max(0, Number(price) || 0));
  const discount = promoDiscount(promo, p);
  return { subtotal: p, discount, total: round2(p - discount) };
}

// "10% off" / "$5 off"
export const promoLabel = (p, lang = 'en') => {
  if (!p) return '';
  const off = lang === 'es' ? 'de descuento' : 'off';
  return p.type === 'amount' ? `$${+Number(p.value).toFixed(2)} ${off}` : `${+Number(p.value)}% ${off}`;
};
