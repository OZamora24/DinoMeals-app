import { cookDateFor, laNow } from './menu';
import { weekCustomers } from './db';

// Fields customers are allowed to see.
const PUBLIC_KEYS = [
  'ordering_open', 'announcement', 'sold_out', 'macros', 'allergens', 'zelle_info', 'cash_info',
  'card_link', 'pickup_address', 'pickup_window', 'delivery_window', 'delivery_fee', 'delivery_zips',
  'card_fee', 'cutoff_day', 'cutoff_hour', 'business_phone', 'cashapp_link', 'delivery_fee_note',
];

export function publicSettings(s) {
  const out = {};
  for (const k of PUBLIC_KEYS) out[k] = s[k];
  out.cook_date = cookDateFor(laNow(), s.cutoff_day, s.cutoff_hour);
  return out;
}

// publicSettings + whether this cook week is full (weekly_capacity customers).
// Only a yes/no goes to the browser, not the customer list.
export async function publicSettingsWithCapacity(s) {
  const out = publicSettings(s);
  const cap = Math.max(0, parseInt(s.weekly_capacity, 10) || 0);
  out.week_full = cap > 0 && (await weekCustomers(out.cook_date)).size >= cap;
  return out;
}
