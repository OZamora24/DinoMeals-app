// Monthly Plan (Juan's rules, Nov 2026).
//  - Month to month, no automatic charge: the customer picks meals for the next 4 weekends
//    and pays for all 4 up front. No changes after (Juan can still edit in Admin).
//  - 10% off everything in the plan. No promo codes, trainer codes, referrals or loyalty
//    rewards on a plan (it's its own thing). Earned rewards stay saved for a regular order.
//  - Each week is 8, 10 or 12 meals, or by the lb (4 lb+). More than that → text Juan.
//  - Counts as ONE order toward Customer Loyalty Rewards.
//  - Max 10 active plans (Juan's usual customers); everyone else uses the open spots.
// In the database a plan is 4 normal orders (one per cook week) that share monthly.id,
// so the kitchen, labels, delivery route and weekly limit all work as before.
import { addDays } from './menu.js';

export const MONTHLY_DEFAULTS = { on: true, pct: 10, max: 10, weeks: 4 };
export const MONTHLY_SIZES = ['8', '10', '12']; // meal-box sizes (lib/menu.js MEAL_PLANS ids)

const round2 = (n) => Math.round(n * 100) / 100;

export function monthlyConfig(settings = {}) {
  const raw = (settings && settings.monthly) || {};
  const num = (v, d, lo, hi) => (v !== '' && v != null && Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
  return {
    on: raw.on !== false,
    pct: num(raw.pct, MONTHLY_DEFAULTS.pct, 0, 50),
    max: Math.round(num(raw.max, MONTHLY_DEFAULTS.max, 0, 200)),
    weeks: MONTHLY_DEFAULTS.weeks,
  };
}

// The cook dates of a plan that starts on `first` (a Sunday 'YYYY-MM-DD').
export const monthlyWeeks = (first, n = MONTHLY_DEFAULTS.weeks) => Array.from({ length: n }, (_, i) => addDays(first, 7 * i));

// Plans still running (a week on or after `today`, not cancelled). Returns the set of plan ids.
export function activeMonthly(orders = [], today = '') {
  const ids = new Set();
  for (const o of orders) if (o.monthly && o.monthly.id && o.status !== 'cancelled' && (!today || o.cook_date >= today)) ids.add(o.monthly.id);
  return ids;
}

// A week's meal count must be one of the plan sizes (or 0 when that week is by the lb only).
export function weekSizeOk(meals, lbs) {
  const m = Number(meals) || 0;
  if (m > 0 && !MONTHLY_SIZES.includes(String(m))) return false;
  return m > 0 || (Number(lbs) || 0) > 0;
}

export const newMonthlyId = () => `M${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

// Saved on each of the plan's orders.
export const monthlyRow = (id, week, of, pct, discount, planTotal) => ({ id, week, of, pct, discount: round2(discount), plan_total: round2(planTotal) });

// Short label: "Monthly Plan · week 2 of 4"
export const monthlyLabel = (m, lang = 'en') =>
  !m ? '' : lang === 'es' ? `Plan Mensual · semana ${m.week} de ${m.of}` : `Monthly Plan · week ${m.week} of ${m.of}`;
