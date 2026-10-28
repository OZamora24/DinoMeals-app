import { getSettings, weekCustomers } from './db';
import { priceCart, cookDateFor, laNow, DIET_FLAGS, mealLineCount, dateKey } from './menu';
import { normCode, findPromo, promoDiscount } from './promo';

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
  const settings = await getSettings({ fresh: true });
  if (!admin && !settings.ordering_open) return { error: 'closed' };

  const name = clean(body.name, 80);
  const digits = normalizePhone(body.phone);
  if (!name) return { error: 'name_required' };
  if (digits.length !== 10) return { error: 'phone_required' };

  const custom = clean(body.custom_request, 1500);
  const cart = body.cart || {};
  const hasItems = (cart.meals || []).some((m) => mealLineCount(m) > 0) || (cart.lbs || []).some((l) => l.lbs > 0);
  let priced = { lines: [], meals: 0, lbs: 0, subtotal: 0 };
  if (hasItems || !custom) {
    priced = priceCart(cart, admin ? [] : settings.sold_out, { requireFlavor: !admin });
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
  const cFee = payment_method === 'card' && hasItems ? Number(settings.card_fee) || 0 : 0;
  // Promo code: checked on the server against the saved codes; comes off the food subtotal.
  let promo = null;
  let discount = 0;
  if (normCode(body.promo_code) && hasItems) {
    promo = findPromo(settings.promo_codes, body.promo_code, dateKey(laNow()));
    if (!promo) return { error: 'promo_invalid' };
    discount = promoDiscount(promo, priced.subtotal);
  }
  const total = hasItems ? Math.round((priced.subtotal - discount + fee + cFee) * 100) / 100 : null;
  if (!admin && hasItems && body.total != null && Math.abs(Number(body.total) - total) > 0.01) {
    return { error: 'price_changed', total };
  }

  const dietIds = new Set(DIET_FLAGS.map((d) => d.id));
  const cook_date =
    admin && /^\d{4}-\d{2}-\d{2}$/.test(body.cook_date || '')
      ? body.cook_date
      : cookDateFor(laNow(), settings.cutoff_day, settings.cutoff_hour);

  // Weekly customer cap: a customer already in the week can still add an order.
  const capacity = Math.max(0, parseInt(settings.weekly_capacity, 10) || 0);
  if (!admin && capacity > 0) {
    const have = await weekCustomers(cook_date);
    if (!have.has(digits) && have.size >= capacity) return { error: 'full' };
  }

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
      promo,
      discount,
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
      // SMS consent: only the customer can give it, by ticking the unchecked box at checkout.
      sms_opt_in: !admin && body.sms_opt_in === true,
      sms_opt_in_at: !admin && body.sms_opt_in === true ? new Date().toISOString() : null,
      // Separate consent for the weekly cutoff reminder (its own unchecked box).
      reminder_opt_in: !admin && body.reminder_opt_in === true,
    },
  };
}


// Recomputes an existing order's items/fees/total for an admin edit.
//   cart (optional): { meals, lbs } replaces the order's items (re-priced from lib/menu.js,
//   sold-out and customer minimums are not enforced for the admin).
// Delivery fee is kept as charged when the order stays a delivery; the card fee
// is kept as charged when the order stays on card, else taken from settings.
export function repriceOrder(cur, patch, settings, cart) {
  const out = {};
  let subtotal = cur.subtotal == null ? null : Number(cur.subtotal);
  if (cart) {
    const hasItems = (cart.meals || []).some((m) => mealLineCount(m) > 0) || (cart.lbs || []).some((l) => Number(l.lbs) > 0);
    if (hasItems) {
      const priced = priceCart(cart, [], { skipMin: true });
      if (!priced.ok) return { error: priced.error };
      out.items = priced.lines;
      out.meal_count = priced.meals;
      out.lb_total = priced.lbs;
      out.subtotal = priced.subtotal;
      subtotal = priced.subtotal;
      if (cur.status === 'quote') out.status = 'new';
    } else {
      out.items = [];
      out.meal_count = 0;
      out.lb_total = 0;
      out.subtotal = null;
      subtotal = null;
    }
  }
  if (subtotal == null) {
    out.delivery_fee = 0;
    out.discount = 0;
    out.total = null;
    return { patch: out };
  }
  // A promo used at checkout stays on the order: re-figure it for the new subtotal.
  const curDisc = Number(cur.discount) || 0;
  const disc = cur.promo ? promoDiscount(cur.promo, subtotal) : 0;
  const fulfillment = patch.fulfillment || cur.fulfillment;
  const method = patch.payment_method || cur.payment_method;
  const curSub = cur.subtotal == null ? 0 : Number(cur.subtotal);
  const curDel = Number(cur.delivery_fee) || 0;
  const curCard = cur.payment_method === 'card' && cur.total != null
    ? Math.max(0, Math.round((Number(cur.total) - (curSub - curDisc) - curDel) * 100) / 100)
    : 0;
  const delFee = fulfillment === 'delivery'
    ? (cur.fulfillment === 'delivery' && curDel > 0 ? curDel : Number(settings.delivery_fee) || 0)
    : 0;
  const cardFee = method === 'card'
    ? (cur.payment_method === 'card' && curCard > 0 ? curCard : Number(settings.card_fee) || 0)
    : 0;
  out.delivery_fee = delFee;
  out.discount = disc;
  out.total = Math.round((subtotal - disc + delFee + cardFee) * 100) / 100;
  return { patch: out };
}
