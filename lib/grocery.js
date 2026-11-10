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

const clampPct = (n, d) => { const v = Number(n); return Number.isFinite(v) ? Math.min(90, Math.max(0, v)) : d; };

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
  const pantry = Array.isArray(g.pantry) ? g.pantry.map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 20) : DEFAULT_PANTRY;
  return { yields, extra, pantry };
}

// Only the numbers Juan changed are worth saving; keeps settings small.
export function cleanGrocery(raw = {}) {
  const c = groceryConfig({ grocery: raw });
  const yields = {};
  for (const [id, y] of Object.entries(c.yields)) {
    const d = DEFAULT_YIELDS[id];
    if (d.grow != null ? y.grow !== d.grow : y.trim !== d.trim || y.shrink !== d.shrink) yields[id] = d.grow != null ? { grow: y.grow } : { trim: y.trim, shrink: y.shrink };
  }
  return { extra: c.extra, yields, pantry: c.pantry };
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

const fmtLb = (n) => `${n % 1 ? n.toFixed(1) : n} lb`;

// Plain text for "Copy list" (paste into Notes or a text).
export function listText(list, { week = '', pantry = [], containers = 0 } = {}) {
  const sec = (title, rows) => (rows.length ? `${title}\n${rows.map((r) => `☐ ${r.label} — ${fmtLb(r.rawLb)}`).join('\n')}` : '');
  const extras = [...pantry, ...(containers ? [`Meal containers + lids — ${containers}`, `Label sheets (10 per sheet) — ${Math.ceil(containers / 10)}`] : [])];
  return [
    `🛒 DinoMeals shopping list${week ? ` · ${week}` : ''}`,
    sec('PROTEIN', list.protein), sec('CARBS', list.carb), sec('VEGGIES', list.veg), sec('OTHER', list.other),
    extras.length ? `PANTRY / SUPPLIES\n${extras.map((x) => `☐ ${x}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}
