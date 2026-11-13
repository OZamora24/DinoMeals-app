import { cookDateFor, laNow, dateKey } from './menu';
import { cleanPromoList } from './promo';
import { loyaltyConfig } from './loyalty';
import { referralConfig } from './referral';
import { weekCustomers, monthlyOrdersFrom } from './db';
import { trainerConfig, cleanTrainerList } from './trainer';
import { monthlyConfig, activeMonthly } from './monthly';
import { cardOnline } from './stripePay';

// Customers only see how many spots are left once it's down to this many (Juan, Nov 2026).
export const SPOTS_SHOW_AT = 10;

// Fields customers are allowed to see.
const PUBLIC_KEYS = [
  'ordering_open', 'announcement', 'sold_out', 'macros', 'allergens', 'zelle_info', 'cash_info',
  'card_link', 'venmo_link', 'pickup_address', 'pickup_window', 'delivery_window', 'delivery_fee', 'delivery_zips',
  'card_fee', 'cutoff_day', 'cutoff_hour', 'business_phone', 'cashapp_link', 'delivery_fee_note',
];

export function publicSettings(s) {
  const out = {};
  for (const k of PUBLIC_KEYS) out[k] = s[k];
  out.cook_date = cookDateFor(laNow(), s.cutoff_day, s.cutoff_hour);
  // Only whether ANY promo code is live (so checkout shows the box) — never the codes themselves.
  const today = dateKey(laNow());
  out.promo_on = cleanPromoList(s.promo_codes).some((p) => p.active && p.value > 0 && (!p.ends || p.ends >= today) && (!p.starts || p.starts <= today));
  // Trainer codes go in the same box, so it shows when any trainer is active too.
  if (trainerConfig(s).on && cleanTrainerList(s.trainers).some((t) => t.active)) out.promo_on = true;
  out.card_online = cardOnline(s); // card / Apple Pay / Google Pay through Stripe
  out.loyalty_on = loyaltyConfig(s).on;
  const rc = referralConfig(s);
  out.referral_on = rc.on;
  out.referral_new_pct = rc.new_pct;
  out.referral_credit_pct = rc.credit_pct;
  return out;
}

// publicSettings + whether this cook week is full (weekly_capacity customers).
// Only a yes/no goes to the browser, not the customer list.
export async function publicSettingsWithCapacity(s) {
  const out = publicSettings(s);
  const cap = Math.max(0, parseInt(s.weekly_capacity, 10) || 0);
  const have = cap > 0 ? (await weekCustomers(out.cook_date)).size : 0;
  out.week_full = cap > 0 && have >= cap;
  // "Only 7 spots left this week" — hidden until 10 or fewer are left (the admin always sees "20 of 40").
  const left = cap > 0 ? Math.max(0, cap - have) : null;
  out.spots_left = left != null && left > 0 && left <= SPOTS_SHOW_AT ? left : null;
  // Monthly Plan: on/off, the %, and whether a plan spot is open (not how many plans exist).
  const mc = monthlyConfig(s);
  let open = false;
  if (mc.on && mc.max > 0) {
    try { open = activeMonthly(await monthlyOrdersFrom(dateKey(laNow())), dateKey(laNow())).size < mc.max; } catch { open = false; }
  }
  out.monthly = { on: mc.on, pct: mc.pct, weeks: mc.weeks, open };
  return out;
}
