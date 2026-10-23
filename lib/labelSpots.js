// Label-sheet math shared by the admin page (browser) and the labels API.
// Sheet = PLS504: 10 labels, 2 across x 5 down, spots numbered 1-10 left to right, top to bottom.
import { mealLineCount, PROTEINS, CARBS, VEGGIES, NONE, PORTIONS, byId, flavorOf } from './menu.js';

export const LABELS_PER_SHEET = 10;
export const clampSpot = (n) => Math.max(1, Math.min(LABELS_PER_SHEET, Math.floor(Number(n) || 1)));

// ---- Custom label lines (for custom-quote orders typed as a note) ----
// A line = one kind of meal: { protein, flavor, carb, veg, amt: { protein: [7,'oz'], carb: [150,'g'], veg: [60,'g'] }, count }
// Saved on the order as `label_lines`; macros are scaled from the saved per-portion macros.
export const OZ_G = 28.3495;
export const MAX_LABEL_LINES = 30;
export const toGrams = (a) => (Array.isArray(a) ? (a[1] === 'g' ? Number(a[0]) : Number(a[0]) * OZ_G) : 0) || 0;
export const amtText = (a) => (Array.isArray(a) && Number(a[0]) > 0 ? `${+Number(a[0]).toFixed(2)}${a[1] === 'g' ? 'g' : 'oz'}` : '');

function cleanAmt(a, kind) {
  const v = Math.round((Number(Array.isArray(a) ? a[0] : NaN) || 0) * 100) / 100;
  const u = Array.isArray(a) && a[1] === 'g' ? 'g' : 'oz';
  const max = u === 'g' ? 2000 : 64;
  return [v > 0 && v <= max ? v : PORTIONS[kind], u];
}

// Validates label lines from the admin form; drops anything not on the menu.
export function cleanLabelLines(lines) {
  if (!Array.isArray(lines)) return [];
  const out = [];
  for (const l of lines.slice(0, MAX_LABEL_LINES)) {
    const p = l && byId(PROTEINS, l.protein);
    if (!p) continue;
    const carb = byId(CARBS, l.carb) ? l.carb : NONE;
    const veg = byId(VEGGIES, l.veg) ? l.veg : NONE;
    const flavor = p.flavors ? (flavorOf(p, l.flavor) || p.flavors[0]).id : undefined;
    const count = Math.max(1, Math.min(200, Math.floor(Number(l.count) || 1)));
    const amt = { protein: cleanAmt(l.amt?.protein, 'protein') };
    if (carb !== NONE) amt.carb = cleanAmt(l.amt?.carb, 'carb');
    if (veg !== NONE) amt.veg = cleanAmt(l.amt?.veg, 'veg');
    out.push({ protein: p.id, ...(flavor ? { flavor } : {}), carb, veg, amt, count });
  }
  return out;
}

// Macros for ONE meal of a custom line, scaled by weight from the saved per-portion numbers.
// null when any part has no macros saved yet.
export function customMacros(l, macros = {}) {
  const parts = [['protein', macros[`${l.protein}:${l.flavor}`] || macros[l.protein]]];
  if (l.carb && l.carb !== NONE) parts.push(['carb', macros[l.carb]]);
  if (l.veg && l.veg !== NONE) parts.push(['veg', macros[l.veg]]);
  const sum = { cal: 0, p: 0, c: 0, f: 0 };
  for (const [kind, m] of parts) {
    if (!m || m.cal == null || m.cal === '') return null;
    const k = toGrams(l.amt?.[kind]) / (PORTIONS[kind] * OZ_G);
    sum.cal += (+m.cal || 0) * k; sum.p += (+m.p || 0) * k; sum.c += (+m.c || 0) * k; sum.f += (+m.f || 0) * k;
  }
  return sum;
}

// How many labels an order prints: 1 per meal, 1 per lb (+1 for a half lb), 1 per extra portion,
// plus the custom label lines (custom-quote orders).
export function labelCount(order) {
  let n = 0;
  for (const l of (order && order.items) || []) {
    if (l.type === 'meal') n += mealLineCount(l);
    else if (l.type === 'extra') n += Number(l.qty) || 0;
    else if (l.type === 'lb') { const lbs = Number(l.lbs) || 0; n += Math.floor(lbs) + (lbs % 1 ? 1 : 0); }
  }
  for (const l of (order && order.label_lines) || []) n += Number(l.count) || 0;
  return n;
}

// Orders typed as a note (custom quotes) get the custom label editor.
export const isCustomOrder = (o) => !!(o && (o.custom_request || o.status === 'quote' || (o.label_lines || []).length));

// Spot where the NEXT print starts after printing `count` labels beginning at `start`.
export const nextStart = (start, count) => ((clampSpot(start) - 1 + count) % LABELS_PER_SHEET) + 1;

// Sheets used by a print (a partly used first sheet counts as one).
export const sheetsUsed = (start, count) => (count ? Math.ceil((clampSpot(start) - 1 + count) / LABELS_PER_SHEET) : 0);
