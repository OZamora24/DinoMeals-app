// Promo codes (e.g. LAUNCH10). Juan creates them in /admin → Menu & settings.
// Saved in shop settings as promo_codes (never sent to the public settings);
// each order keeps a copy of the code it used (promo) and the $ discount.
//   { code: 'LAUNCH10', type: 'percent' | 'amount', value: 10, active: true, starts: 'YYYY-MM-DD' | '', ends: 'YYYY-MM-DD' | '' }
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
  return { code, type, value, active: p.active !== false, starts: ymd(p.starts), ends: ymd(p.ends) };
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
  return { code: p.code, type: p.type, value: p.value };
}

// $ off a food subtotal (never more than the subtotal).
export function promoDiscount(promo, subtotal) {
  const s = Number(subtotal) || 0;
  if (!promo || !(s > 0)) return 0;
  const d = promo.type === 'amount' ? Number(promo.value) : (s * Number(promo.value)) / 100;
  return round2(Math.min(s, Math.max(0, d)));
}

// "10% off" / "$5 off"
export const promoLabel = (p, lang = 'en') => {
  if (!p) return '';
  const off = lang === 'es' ? 'de descuento' : 'off';
  return p.type === 'amount' ? `$${+Number(p.value).toFixed(2)} ${off}` : `${+Number(p.value)}% ${off}`;
};
