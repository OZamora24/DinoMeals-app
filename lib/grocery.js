// Shopping list on the cook sheet (Juan, Nov 2026): turns the week's COOKED pounds into RAW amounts to buy.
//   raw = cooked ÷ ((1 − trim%) × (1 − shrink%))      meat, potatoes, veggies
//   raw = cooked ÷ grow                                 rice (dry rice about triples)
// then + extra % (default 5) and rounded up to the next ½ lb.
// Several menu items can come from one thing Juan buys (all chicken flavors + SW smoked chicken =
// chicken breast; white + cilantro lime rice = white rice; burgers + ground beef = ground beef 91/9).
// Juan's numbers (Nov 2026): tri-tip bought whole and trimmed (silver skin + fat: about 0.5–0.7 lb off a
// 3 lb tri-tip, ~20%), fajitas = bell peppers + onions only, ground beef 91/9 (meals and burgers),
// ground turkey 93/7, chicken breast natural (not jumbo), tilapia loin (not filet), green beans and
// sweet potatoes organic, organic avocado oil, most marinades made in house.
// Every trim / shrink / grow number can be changed on the cook sheet ("Adjust shrink %").

export const BUY = {
  tritip: { kind: 'protein', en: 'Tri-tip, whole (untrimmed)' },
  chicken: { kind: 'protein', en: 'Chicken breast · natural (not jumbo)' },
  beef: { kind: 'protein', en: 'Ground beef 91/9' },
  shrimp: { kind: 'protein', en: 'Shrimp, peeled & deveined' },
  turkey: { kind: 'protein', en: 'Ground turkey 93/7' },
  tilapia: { kind: 'protein', en: 'Tilapia loins (not filet)' },
  rice: { kind: 'carb', en: 'White rice, dry' },
  brownrice: { kind: 'carb', en: 'Brown rice, dry' },
  sweetpotato: { kind: 'carb', en: 'Sweet potatoes · organic' },
  redpotato: { kind: 'carb', en: 'Red potatoes' },
  fajitas: { kind: 'veg', en: 'Bell peppers + onions' },
  broccoli: { kind: 'veg', en: 'Broccoli crowns' },
  asparagus: { kind: 'veg', en: 'Asparagus' },
  greenbeans: { kind: 'veg', en: 'Green beans · organic' },
  brussels: { kind: 'veg', en: 'Brussels sprouts' },
};

// Menu item -> what Juan buys + how much is lost. trim/shrink in %, grow = cooked ÷ dry.
export const DEFAULT_YIELDS = {
  tritip: { buy: 'tritip', trim: 20, shrink: 30 },
  chicken: { buy: 'chicken', trim: 3, shrink: 25 },
  swchicken: { buy: 'chicken', trim: 3, shrink: 30 },
  burgers: { buy: 'beef', trim: 0, shrink: 20 },
  smashburgers: { buy: 'beef', trim: 0, shrink: 20 },
  groundbeef: { buy: 'beef', trim: 0, shrink: 20 },
  shrimp: { buy: 'shrimp', trim: 0, shrink: 20 },
  turkey: { buy: 'turkey', trim: 0, shrink: 20 },
  tilapia: { buy: 'tilapia', trim: 0, shrink: 15 },
  whiterice: { buy: 'rice', grow: 2.8 },
  cilantrorice: { buy: 'rice', grow: 2.8 },
  brownrice: { buy: 'brownrice', grow: 2.6 },
  sweetpotato: { buy: 'sweetpotato', trim: 10, shrink: 20 },
  redpotato: { buy: 'redpotato', trim: 2, shrink: 15 },
  mashed: { buy: 'redpotato', trim: 2, shrink: 0 }, // butter + milk make up for the water lost
  fajitas: { buy: 'fajitas', trim: 15, shrink: 35 },
  broccoli: { buy: 'broccoli', trim: 10, shrink: 15 },
  asparagus: { buy: 'asparagus', trim: 20, shrink: 10 },
  greenbeans: { buy: 'greenbeans', trim: 5, shrink: 10 },
  brussels: { buy: 'brussels', trim: 10, shrink: 15 },
};

export const DEFAULT_PANTRY = ['Organic avocado oil', 'Marinade ingredients (made in house)', 'Seasonings & rubs'];
// Categories on the list. Juan can add his own ("Packaging", "Sauces", …) when he adds an item.
export const BASE_CATS = ['Protein', 'Carbs', 'Veggies', 'Pantry / supplies'];
const KIND_CAT = { protein: 'Protein', carb: 'Carbs', veg: 'Veggies', other: 'Other' };
export const catOf = (kind) => KIND_CAT[kind] || 'Other';
export const SUPPLY_KEYS = ['containers', 'labels'];

const clampPct = (n, d) => { const v = Number(n); return Number.isFinite(v) ? Math.min(90, Math.max(0, v)) : d; };
const txt = (x, n) => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n);
const isWeek = (w) => /^\d{4}-\d{2}-\d{2}$/.test(String(w || ''));

// One item Juan added: { id, cat, name, qty, week? } (week = only that cook week).
export function cleanCustomItem(x, i = 0) {
  const name = txt(x && x.name, 60);
  if (!name) return null;
  const cat = txt(x.cat, 30) || 'Pantry / supplies';
  const id = /^c_[a-z0-9]{1,20}$/.test(String(x.id || '')) ? x.id : `c_${(Date.now() + i).toString(36)}${i}`;
  return { id, cat, name, qty: txt(x.qty, 24), ...(isWeek(x.week) ? { week: x.week } : {}) };
}

// Saved settings.grocery merged over the defaults (bad numbers fall back to the default).
export function groceryConfig(s = {}) {
  const g = (s && s.grocery) || {};
  const yields = {};
  for (const [id, d] of Object.entries(DEFAULT_YIELDS)) {
    const y = (g.yields && g.yields[id]) || {};
    yields[id] = d.grow != null
      ? { buy: d.buy, grow: Number(y.grow) > 0.5 && Number(y.grow) < 6 ? Number(y.grow) : d.grow }
      : { buy: d.buy, trim: clampPct(y.trim, d.trim), shrink: clampPct(y.shrink, d.shrink) };
  }
  const extra = [0, 5, 10, 15].includes(Number(g.extra)) ? Number(g.extra) : 5;
  // Items Juan added. Older saves had a plain "pantry" list; those become Pantry / supplies items.
  const custom = Array.isArray(g.custom)
    ? g.custom.map(cleanCustomItem).filter(Boolean).slice(0, 80)
    : (Array.isArray(g.pantry) ? g.pantry : DEFAULT_PANTRY).map((name, i) => cleanCustomItem({ id: `c_p${i}`, cat: 'Pantry / supplies', name }, i)).filter(Boolean);
  const hidden = Array.isArray(g.hidden) ? [...new Set(g.hidden.map((k) => txt(k, 40)).filter(Boolean))].slice(0, 100) : [];
  return { yields, extra, custom, hidden };
}

// Only the numbers Juan changed are worth saving; keeps settings small.
export function cleanGrocery(raw = {}) {
  const c = groceryConfig({ grocery: raw });
  const yields = {};
  for (const [id, y] of Object.entries(c.yields)) {
    const d = DEFAULT_YIELDS[id];
    if (d.grow != null ? y.grow !== d.grow : y.trim !== d.trim || y.shrink !== d.shrink) yields[id] = d.grow != null ? { grow: y.grow } : { trim: y.trim, shrink: y.shrink };
  }
  return { extra: c.extra, yields, custom: c.custom, hidden: c.hidden };
}

// The whole list for one cook week, by category, ready to show or copy.
// Each row: { key, name, amount, note, custom }  (key is what "hidden" and the store check-offs use)
export function weekList(list, cfg, { week = '', containers = 0 } = {}) {
  const hide = new Set(cfg.hidden || []);
  const fmt = (n) => `${n % 1 ? n.toFixed(1) : n} lb`;
  const cats = {};
  const push = (cat, row) => { if (!hide.has(row.key)) (cats[cat] ||= []).push(row); };
  for (const kind of ['protein', 'carb', 'veg', 'other']) {
    for (const r of list[kind] || []) push(catOf(kind), { key: r.key, name: r.label, amount: fmt(r.rawLb), note: `${r.cookedLb % 1 ? r.cookedLb.toFixed(1) : r.cookedLb} lb cooked${r.from && r.from.length > 1 ? ` · ${r.from.join(' + ')}` : ''}` });
  }
  for (const x of cfg.custom || []) if (!x.week || x.week === week) push(x.cat, { key: x.id, name: x.name, amount: x.qty || '', note: x.week ? 'this week only' : '', custom: true });
  if (containers) {
    push('Pantry / supplies', { key: 'containers', name: 'Meal containers + lids', amount: String(containers), note: 'from this week\'s orders' });
    push('Pantry / supplies', { key: 'labels', name: 'Label sheets (10 per sheet)', amount: String(Math.ceil(containers / 10)), note: 'from this week\'s orders' });
  }
  const order = [...BASE_CATS.slice(0, 3), 'Other', 'Pantry / supplies'];
  const names = Object.keys(cats).sort((a, b) => (order.includes(a) ? order.indexOf(a) : 50) - (order.includes(b) ? order.indexOf(b) : 50) || a.localeCompare(b));
  return names.map((cat) => ({ cat, rows: cats[cat] }));
}

export const rawFactor = (y) => (y.grow != null ? 1 / y.grow : 1 / ((1 - y.trim / 100) * (1 - y.shrink / 100)));
const up = (lb) => Math.ceil(lb * 2 - 1e-9) / 2;

// cookedOz: { [menuItemId]: cooked oz this week }  names: { [menuItemId]: label }
// -> { protein: [...], carb: [...], veg: [...], other: [...] } rows { key, label, cookedLb, rawLb, from }
export function shoppingList(cookedOz = {}, s = {}, names = {}, extraPct) {
  const c = groceryConfig(s);
  const extra = extraPct != null ? extraPct : c.extra;
  const acc = {};
  for (const [id, oz] of Object.entries(cookedOz)) {
    if (!(oz > 0)) continue;
    const y = c.yields[id];
    const key = y ? y.buy : `item:${id}`;
    const r = (acc[key] ||= { key, label: y ? BUY[y.buy].en : names[id] || id, kind: y ? BUY[y.buy].kind : 'other', cookedOz: 0, rawLb: 0, from: [] });
    r.cookedOz += oz;
    r.rawLb += y ? (oz / 16) * rawFactor(y) : oz / 16;
    if (names[id] && !r.from.includes(names[id])) r.from.push(names[id]);
  }
  const out = { protein: [], carb: [], veg: [], other: [] };
  for (const r of Object.values(acc)) {
    out[r.kind].push({ key: r.key, label: r.label, from: r.from, cookedLb: Math.round((r.cookedOz / 16) * 10) / 10, rawLb: up(r.rawLb * (1 + extra / 100)) });
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => b.rawLb - a.rawLb);
  return out;
}

// Plain text for "Copy list" (paste into Notes or a text). groups = weekList(...)
export function listText(groups, { week = '' } = {}) {
  return [
    `🛒 DinoMeals shopping list${week ? ` · ${week}` : ''}`,
    ...groups.map((g) => `${g.cat.toUpperCase()}\n${g.rows.map((r) => `☐ ${r.name}${r.amount ? ` — ${r.amount}` : ''}`).join('\n')}`),
  ].join('\n\n');
}
