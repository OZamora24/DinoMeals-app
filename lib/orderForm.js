// Pure helpers + constants shared by the order page and its components.
import { NONE, PORTIONS, mealOz } from './menu.js';
export const DRAFT_KEY = 'dinoDraft';
export const CONTACT_NAME = 'Juan Carlos'; // owner of DinoMeals
export const CONTACT_PHONE = '(909) 436-6621'; // shown on every order: "questions? call or text"
export const emptyInfo = {
  name: '', phone: '', email: '', fulfillment: 'pickup', address: '', zip: '', delivery_notes: '',
  payment_method: '', diet: [], allergy_notes: '', notes: '',
  sms_opt_in: false, reminder_opt_in: false, // text-message consent: always starts unchecked, never saved in the draft
};

export function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function sumMacros(parts) {
  if (parts.some((p) => !p || p.cal == null || p.cal === '')) return null;
  return parts.reduce(
    (a, p) => ({ cal: a.cal + +p.cal, p: a.p + +(p.p || 0), c: a.c + +(p.c || 0), f: a.f + +(p.f || 0) }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );
}

// Macros for ONE meal line (protein + carb + veg), scaled for bigger portions.
// null when any part has no numbers saved yet.
export function mealMacros(m, macros = {}) {
  const oz = mealOz(m);
  const scale = (x, kind) => {
    if (!x) return x;
    const k = oz[kind] / PORTIONS[kind];
    return k === 1 ? x : { cal: (+x.cal || 0) * k, p: (+x.p || 0) * k, c: (+x.c || 0) * k, f: (+x.f || 0) * k };
  };
  const parts = [scale(macros[`${m.protein}:${m.flavor}`] || macros[m.protein], 'protein')];
  if (m.carb && m.carb !== NONE) parts.push(scale(macros[m.carb], 'carb'));
  if (m.veg && m.veg !== NONE) parts.push(scale(macros[m.veg], 'veg'));
  return sumMacros(parts);
}
