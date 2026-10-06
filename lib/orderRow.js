import { getSettings } from './db';
import { priceCart, cookDateFor, laNow, DIET_FLAGS } from './menu';

export const PAY = ['zelle', 'cash', 'card'];
export const STATUSES = ['new', 'quote', 'confirmed', 'cooking', 'ready', 'done', 'cancelled'];
export const clean = (s, max = 500) => String(s || '').trim().slice(0, max);

export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
}

// Builds a validated order row from a request body. Totals are ALWAYS
// recomputed here from lib/menu.js — the browser's number is only used to
// detect a stale page (prices/sold-out changed while they were ordering).
export async function buildOrderRow(body, { admin = false } = {}) {
  const settings = await getSettings();
  if (!admin && !settings.ordering_open) return { error: 'closed' };

  const name = clean(body.name, 80);
  const digits = normalizePhone(body.phone);
  if (!name) return { error: 'name_required' };
  if (digits.length !== 10) return { error: 'phone_required' };

  const custom = clean(body.custom_request, 1500);
  const cart = body.cart || {};
  const hasItems = (cart.meals || []).some((m) => m.sets > 0) || (cart.lbs || []).some((l) => l.lbs > 0);
  let priced = { lines: [], meals: 0, lbs: 0, subtotal: 0 };
  if (hasItems || !custom) {
    priced = priceCart(cart, admin ? [] : settings.sold_out);
    if (!priced.ok) return { error: priced.error };
  }

  const fulfillment = body.fulfillment === 'delivery' ? 'delivery' : 'pickup';
  const address = clean(body.address, 200);
  const zip = clean(body.zip, 10).replace(/[^\d]/g, '').slice(0, 5);
  if (fulfillment === 'delivery') {
    if (!address || zip.length !== 5) return { error: 'address_required' };
    const zips = (settings.delivery_zips || []).filter(Boolean);
    if (!admin && zips.length && !zips.includes(zip)) return { error: 'out_of_area' };
  }

  const payment_method = PAY.includes(body.payment_method) ? body.payment_method : null;
  if (!payment_method) return { error: 'payment_required' };

  const fee = fulfillment === 'delivery' && hasItems ? Number(settings.delivery_fee) || 0 : 0;
  const total = hasItems ? Math.round((priced.subtotal + fee) * 100) / 100 : null;
  if (!admin && hasItems && body.total != null && Math.abs(Number(body.total) - total) > 0.01) {
    return { error: 'price_changed', total };
  }

  const dietIds = new Set(DIET_FLAGS.map((d) => d.id));
  const cook_date =
    admin && /^\d{4}-\d{2}-\d{2}$/.test(body.cook_date || '')
      ? body.cook_date
      : cookDateFor(laNow(), settings.cutoff_day, settings.cutoff_hour);

  return {
    row: {
      cook_date,
      customer_name: name,
      phone: clean(body.phone, 30),
      phone_digits: digits,
      email: clean(body.email, 120),
      items: priced.lines,
      meal_count: priced.meals,
      lb_total: priced.lbs,
      subtotal: hasItems ? priced.subtotal : null,
      delivery_fee: fee,
      total,
      fulfillment,
      address: fulfillment === 'delivery' ? address : '',
      zip: fulfillment === 'delivery' ? zip : '',
      delivery_notes: clean(body.delivery_notes, 300),
      payment_method,
      paid: admin ? !!body.paid : false,
      paid_at: admin && body.paid ? new Date().toISOString() : null,
      status: hasItems ? 'new' : 'quote',
      diet: (Array.isArray(body.diet) ? body.diet : []).filter((d) => dietIds.has(d)),
      allergy_notes: clean(body.allergy_notes, 500),
      notes: clean(body.notes, 800),
      custom_request: custom,
      lang: body.lang === 'es' ? 'es' : 'en',
      source: admin ? (['dm', 'text', 'call', 'web', 'repeat'].includes(body.source) ? body.source : 'dm') : 'web',
    },
  };
}

