import { cookDateFor, laNow } from './menu';

// Fields customers are allowed to see.
const PUBLIC_KEYS = [
  'ordering_open', 'announcement', 'sold_out', 'macros', 'allergens', 'zelle_info', 'cash_info',
  'card_link', 'pickup_address', 'pickup_window', 'delivery_window', 'delivery_fee', 'delivery_zips',
  'cutoff_day', 'cutoff_hour', 'business_phone',
];

export function publicSettings(s) {
  const out = {};
  for (const k of PUBLIC_KEYS) out[k] = s[k];
  out.cook_date = cookDateFor(laNow(), s.cutoff_day, s.cutoff_hour);
  return out;
}

