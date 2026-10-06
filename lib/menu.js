// DinoMeals menu — single source of truth for items + pricing.
// Shared by the browser (order page) AND the server (pages/api/orders.js
// recomputes every total from this file, so a customer can't edit prices
// in the page). The menu itself doesn't change week to week; things that
// DO change (sold out, macros, allergen labels) live in shop settings and
// are edited from /admin.

export const MEAL_SET_SIZE = 4; // meals come in sets of 4 of the same combo
export const MIN_MEALS = 8; // 8 meals minimum = 2 sets of 4
export const MIN_LBS = 4; // by-the-lb minimum

export const PORTIONS = { protein: 4, carb: 4, veg: 3 }; // oz per meal

// Flavor options. `extra` is added to the per-meal OR per-lb price.
const BEEF_FLAVORS = [
  { id: 'plain', name: 'Seasoned', es: 'Sazonada', extra: 0 },
  { id: 'taco', name: 'Taco', es: 'Taco', extra: 1 },
  { id: 'kbbq', name: 'Korean BBQ', es: 'Korean BBQ', extra: 1 },
];
const CHICKEN_FLAVORS = [
  { id: 'plain', name: 'Classic', es: 'Clásico', extra: 0 },
  { id: 'chipotle', name: 'Chipotle', es: 'Chipotle', extra: 1 },
  { id: 'montreal', name: 'Montreal', es: 'Montreal', extra: 1 },
  { id: 'teriyaki', name: 'Teriyaki', es: 'Teriyaki', extra: 1 },
];
const BURGER_LB_FLAVORS = [
  { id: 'plain', name: 'Classic', es: 'Clásica', extra: 0 },
  { id: 'smashed', name: 'Smashed', es: 'Smash', extra: 1 },
  { id: 'smoked', name: 'Smoked', es: 'Ahumada', extra: 1 },
];

// meal = price for one meal (protein 4oz + carb 4oz + veg 3oz)
// lb   = price per pound on the "By the LB" menu (null = not offered)
export const PROTEINS = [
  { id: 'tritip', name: 'Smoked Tri-tip Steak', es: 'Tri-tip Ahumado', meal: 15, lb: 30, smoked: true },
  { id: 'swchicken', name: 'Southwest Smoked Chicken', es: 'Pollo Ahumado Southwest', meal: 14, lb: 16, smoked: true },
  { id: 'shrimp', name: 'Garlic Butter Shrimp', es: 'Camarón al Ajo y Mantequilla', meal: 14, lb: 25 },
  { id: 'burgers', name: 'Smoked Burgers', es: 'Hamburguesas Ahumadas', meal: 15, lb: 22, smoked: true, lbName: 'Burgers', lbEs: 'Hamburguesas', lbFlavors: BURGER_LB_FLAVORS },
  { id: 'groundbeef', name: 'Ground Beef', es: 'Carne Molida', meal: 14, lb: 20, flavors: BEEF_FLAVORS },
  { id: 'turkey', name: 'Ground Turkey', es: 'Pavo Molido', meal: 12, lb: 16 },
  { id: 'chicken', name: 'Grilled Chicken Breast', es: 'Pechuga de Pollo a la Parrilla', meal: 11, lb: 15, flavors: CHICKEN_FLAVORS },
  { id: 'tilapia', name: 'Lemon Pepper Tilapia Loin', es: 'Tilapia Limón Pimienta', meal: 12, lb: 18 },
];

// mealExtra = upcharge on a meal; lb = price per pound
export const CARBS = [
  { id: 'sweetpotato', name: 'Roasted Sweet Potatoes', es: 'Camote Rostizado', mealExtra: 1, lb: 13 },
  { id: 'redpotato', name: 'Roasted Red Potatoes', es: 'Papas Rojas Rostizadas', mealExtra: 0, lb: 11 },
  { id: 'mashed', name: 'Mashed Red Potatoes', es: 'Puré de Papa Roja', mealExtra: 0, lb: 12 },
  { id: 'whiterice', name: 'White Rice', es: 'Arroz Blanco', mealExtra: 0, lb: 10 },
  { id: 'brownrice', name: 'Brown Rice', es: 'Arroz Integral', mealExtra: 0, lb: 10 },
  { id: 'cilantrorice', name: 'Cilantro Lime Rice', es: 'Arroz Cilantro y Limón', mealExtra: 0, lb: 11 },
];

export const VEGGIES = [
  { id: 'fajitas', name: 'Fajitas', es: 'Fajitas', mealExtra: 1, lb: null },
  { id: 'greenbeans', name: 'Green Beans', es: 'Ejotes', mealExtra: 1, lb: 13 },
  { id: 'broccoli', name: 'Broccoli', es: 'Brócoli', mealExtra: 0, lb: 10 },
  { id: 'brussels', name: 'Brussels Sprouts', es: 'Coles de Bruselas', mealExtra: 0, lb: 11 },
  { id: 'asparagus', name: 'Asparagus', es: 'Espárragos', mealExtra: 0, lb: 12 },
];

// Starting allergen labels — Juan Carlos should confirm these in /admin →
// Menu (they're editable there and the saved version wins).
export const DEFAULT_ALLERGENS = {
  shrimp: ['shellfish', 'dairy'],
  tilapia: ['fish'],
  mashed: ['dairy'],
  'chicken:teriyaki': ['soy', 'wheat'],
  'groundbeef:kbbq': ['soy', 'wheat', 'sesame'],
};

export const ALLERGEN_LABELS = {
  dairy: { en: 'Dairy', es: 'Lácteos' },
  shellfish: { en: 'Shellfish', es: 'Mariscos' },
  fish: { en: 'Fish', es: 'Pescado' },
  soy: { en: 'Soy', es: 'Soya' },
  wheat: { en: 'Wheat/Gluten', es: 'Trigo/Gluten' },
  sesame: { en: 'Sesame', es: 'Ajonjolí' },
  egg: { en: 'Egg', es: 'Huevo' },
  nuts: { en: 'Tree nuts', es: 'Nueces' },
  peanuts: { en: 'Peanuts', es: 'Cacahuate' },
};

export const DIET_FLAGS = [
  { id: 'nodairy', en: 'No dairy', es: 'Sin lácteos' },
  { id: 'nogluten', en: 'Gluten-free', es: 'Sin gluten' },
  { id: 'noshellfish', en: 'Shellfish allergy', es: 'Alergia a mariscos' },
  { id: 'nofish', en: 'Fish allergy', es: 'Alergia al pescado' },
  { id: 'nosoy', en: 'No soy', es: 'Sin soya' },
  { id: 'lowsodium', en: 'Low sodium', es: 'Bajo en sodio' },
  { id: 'nospicy', en: 'Not spicy', es: 'Sin picante' },
];

export const byId = (list, id) => list.find((x) => x.id === id);
export const nameOf = (item, lang) => (item ? (lang === 'es' ? item.es || item.name : item.name) : '');

export function flavorOf(protein, flavorId, forLb = false) {
  if (!protein) return null;
  const list = forLb ? protein.lbFlavors || protein.flavors : protein.flavors;
  if (!list) return null;
  return list.find((f) => f.id === flavorId) || list[0];
}

export function proteinLabel(proteinId, flavorId, lang = 'en', forLb = false) {
  const p = byId(PROTEINS, proteinId);
  if (!p) return proteinId;
  const base = forLb && p.lbName ? (lang === 'es' ? p.lbEs : p.lbName) : nameOf(p, lang);
  const f = flavorOf(p, flavorId, forLb);
  if (!f || f.id === 'plain') return base;
  return `${base} · ${lang === 'es' ? f.es : f.name}`;
}

// Price of ONE meal of a given combo.
export function mealUnitPrice({ protein, flavor, carb, veg }) {
  const p = byId(PROTEINS, protein);
  const c = byId(CARBS, carb);
  const v = byId(VEGGIES, veg);
  if (!p || !c || !v) return null;
  const f = flavorOf(p, flavor);
  return p.meal + (f ? f.extra : 0) + c.mealExtra + v.mealExtra;
}

// Per-pound price for an LB line. kind: protein | carb | veg
export function lbUnitPrice({ kind, item, flavor }) {
  if (kind === 'protein') {
    const p = byId(PROTEINS, item);
    if (!p || p.lb == null) return null;
    const f = flavorOf(p, flavor, true);
    return p.lb + (f ? f.extra : 0);
  }
  const list = kind === 'carb' ? CARBS : kind === 'veg' ? VEGGIES : null;
  const x = list && byId(list, item);
  return x && x.lb != null ? x.lb : null;
}

// Validates + prices a cart. Returns { ok, error, meals, lbs, subtotal, lines }
// Cart shape:
//   meals: [{ protein, flavor, carb, veg, sets }]   (sets of 4)
//   lbs:   [{ kind, item, flavor, lbs }]
export function priceCart(cart, soldOut = []) {
  const out = { ok: true, error: null, meals: 0, lbs: 0, subtotal: 0, lines: [] };
  const so = new Set(soldOut || []);
  const meals = Array.isArray(cart?.meals) ? cart.meals : [];
  const lbs = Array.isArray(cart?.lbs) ? cart.lbs : [];

  for (const m of meals) {
    const sets = Math.floor(Number(m.sets) || 0);
    if (sets <= 0) continue;
    const unit = mealUnitPrice(m);
    if (unit == null) return { ...out, ok: false, error: 'bad_item' };
    if (so.has(m.protein) || so.has(m.carb) || so.has(m.veg)) return { ...out, ok: false, error: 'sold_out' };
    const count = sets * MEAL_SET_SIZE;
    const line = { type: 'meal', ...m, sets, count, unit, total: unit * count };
    out.meals += count;
    out.subtotal += line.total;
    out.lines.push(line);
  }
  for (const l of lbs) {
    const qty = Math.round((Number(l.lbs) || 0) * 2) / 2; // half-lb steps
    if (qty <= 0) continue;
    const unit = lbUnitPrice(l);
    if (unit == null) return { ...out, ok: false, error: 'bad_item' };
    if (so.has(l.item)) return { ...out, ok: false, error: 'sold_out' };
    const line = { type: 'lb', ...l, lbs: qty, unit, total: unit * qty };
    out.lbs += qty;
    out.subtotal += line.total;
    out.lines.push(line);
  }

  if (out.meals === 0 && out.lbs === 0) return { ...out, ok: false, error: 'empty' };
  if (out.meals > 0 && out.meals < MIN_MEALS) return { ...out, ok: false, error: 'min_meals' };
  if (out.lbs > 0 && out.lbs < MIN_LBS) return { ...out, ok: false, error: 'min_lbs' };
  out.subtotal = Math.round(out.subtotal * 100) / 100;
  return out;
}

export function lineLabel(line, lang = 'en') {
  if (line.type === 'meal') {
    return [
      proteinLabel(line.protein, line.flavor, lang),
      nameOf(byId(CARBS, line.carb), lang),
      nameOf(byId(VEGGIES, line.veg), lang),
    ].join(' + ');
  }
  if (line.kind === 'protein') return proteinLabel(line.item, line.flavor, lang, true);
  const list = line.kind === 'carb' ? CARBS : VEGGIES;
  return nameOf(byId(list, line.item), lang);
}

// Allergens for a meal line or LB line, using saved overrides when present.
export function allergensFor(keys, allergenMap) {
  const map = allergenMap && Object.keys(allergenMap).length ? allergenMap : DEFAULT_ALLERGENS;
  const s = new Set();
  for (const k of keys) (map[k] || []).forEach((a) => s.add(a));
  return [...s];
}

// ---- Cook week helpers ----
// Orders are grouped by the Sunday they'll be cooked. Orders placed after
// the weekly cutoff roll into the following Sunday.
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// "now" in Pacific time as a plain Date whose local fields are LA time.
export function laNow() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  return new Date(s);
}

// cutoffDay: 0=Sun..6=Sat, cutoffHour: 0-23 (Pacific). Default Fri 8pm.
export function cookDateFor(now = laNow(), cutoffDay = 5, cutoffHour = 20) {
  const d = new Date(now);
  const daysToSun = (7 - d.getDay()) % 7; // 0 if today is Sunday
  const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysToSun);
  // Cutoff moment for this coming Sunday
  let back = (sunday.getDay() - cutoffDay + 7) % 7 || 7;
  const cutoff = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() - back, cutoffHour, 0, 0);
  if (d >= cutoff) sunday.setDate(sunday.getDate() + 7);
  return dateKey(sunday);
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}

export function prettyDate(key, lang = 'en') {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export const money = (n) =>
  n == null ? '—' : `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;
