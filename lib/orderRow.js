import { getSettings, weekCustomers, ordersByPhone, ordersReferredBy, ordersByTrainer, monthlyOrdersFrom } from './db';
import { referralConfig, referralCredits, isNewCustomer, referralsThisMonth, allDiscounts, referralRow, creditRow, normRef, pctOff } from './referral';
import { trainerConfig, findTrainer, trainerByPhone, trainerPct, trainerRow, trainerCredits, useTrainerCredits, trainerCreditRow } from './trainer';
import { monthlyConfig, monthlyWeeks, activeMonthly, weekSizeOk, newMonthlyId, monthlyRow } from './monthly';
import { resolveCode, codeFor } from './referralCode';
import { loyaltyState, orderReward, publicLoyalty } from './loyalty';
import { priceCart, cookDateFor, laNow, DIET_FLAGS, mealLineCount, dateKey, MAX_MEALS } from './menu';
import { normCode, findPromo, promoDiscount } from './promo';

export const PAY = ['zelle', 'cash', 'card', 'venmo'];
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
//   monthly (Monthly Plan week): { pct, cook_date, card_fee: bool } — no codes, rewards or credits,
//   just the plan's % off; the weekly limit is checked by buildMonthlyRows for all 4 weeks.
export async function buildOrderRow(body, { admin = false, monthly = null, settings: given = null } = {}) {
  const settings = given || (await getSettings({ fresh: true }));
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

  if (monthly && !hasItems) return { error: 'empty' };
  const fee = fulfillment === 'delivery' && hasItems ? Number(settings.delivery_fee) || 0 : 0;
  const cFee = payment_method === 'card' && hasItems && (!monthly || monthly.card_fee) ? Number(settings.card_fee) || 0 : 0;
  // Promo code: checked on the server against the saved codes; comes off the food subtotal.
  // On a custom quote (no priced items) the code is saved on the order and comes off
  // when Juan sets the price in the admin.
  // A trainer's code (Trainer Partner program, lib/trainer.js) goes in the same box and takes
  // the promo spot: 10% on the client's first order, 5% after.
  let promo = null;
  let discount = 0;
  let trainerHit = null;
  const tcfg = trainerConfig(settings);
  if (!monthly && normCode(body.promo_code) && (hasItems || custom)) {
    promo = findPromo(settings.promo_codes, body.promo_code, dateKey(laNow()));
    if (!promo) {
      trainerHit = tcfg.on ? findTrainer(settings.trainers, body.promo_code) : null;
      if (!trainerHit) return { error: 'promo_invalid' };
      if (trainerHit.phone === digits) return { error: 'trainer_self' };
    }
    discount = hasItems && promo ? promoDiscount(promo, priced.subtotal) : 0;
  }
  // Customer Loyalty Rewards (lib/loyalty.js): an unlocked reward is used automatically on the
  // next order; promo + reward never go over the cap. On a custom quote it's saved and comes
  // off when Juan sets the price.
  let past = [];
  try { past = await ordersByPhone(digits, 500); } catch (e) { console.error('loyalty lookup', e?.message); }
  const today = dateKey(laNow());
  const loyalty = loyaltyState(past, today, settings, digits);
  let trainerPick = null; // { pct, first }
  if (trainerHit) {
    const first = isNewCustomer(past);
    trainerPick = { pct: trainerPct(tcfg, first), first };
    discount = hasItems ? pctOff(trainerPick.pct, priced.subtotal) : 0;
  }
  // Referral program (lib/referral.js): a NEW customer with a friend's code gets 10% off;
  // a referrer with earned credits gets up to 2 × 5% off. Separate from the 20% cap.
  const rcfg = referralConfig(settings);
  let refInfo = null; // { code, digits, name }
  let refNote = '';
  if (!monthly && rcfg.on && normRef(body.ref_code) && (hasItems || custom)) {
    const owner = await resolveCode(body.ref_code).catch(() => null);
    if (!owner) refNote = 'ref_invalid';
    else if (owner.digits === digits) refNote = 'ref_self';
    else if (!isNewCustomer(past)) refNote = 'ref_not_new';
    else {
      const friends = await ordersReferredBy(owner.digits).catch(() => []);
      if (rcfg.monthly_cap && referralsThisMonth(friends) >= rcfg.monthly_cap) refNote = 'ref_cap';
      else refInfo = { code: body.ref_code, ...owner };
    }
  }
  let credits = { use: [], pct: 0 };
  if (!monthly && rcfg.on && !refInfo && !isNewCustomer(past)) {
    try { credits = referralCredits(await ordersReferredBy(digits), past, today, settings); } catch (e) { console.error('referral credits', e?.message); }
  }
  let reward = null;
  const loyReward = !monthly && loyalty.available && (hasItems || custom) ? loyalty.available : null;
  const parts = monthly
    ? { promo: 0, reward: 0, referral: 0, credit: 0, total: pctOff(monthly.pct, priced.subtotal) }
    : allDiscounts(hasItems ? priced.subtotal : 0, { promoDisc: discount, reward: loyReward, refPct: refInfo ? rcfg.new_pct : 0, creditPct: credits.pct }, settings);
  if (loyReward) reward = orderReward(loyReward, hasItems ? parts.reward : 0);
  const referral = refInfo ? referralRow(refInfo.code, refInfo.digits, refInfo.name, rcfg.new_pct, hasItems ? parts.referral : 0) : null;
  const ref_credit = credits.use.length ? creditRow(credits.use, credits.pct, hasItems ? parts.credit : 0) : null;
  const trainer = trainerHit ? trainerRow(trainerHit, trainerPick.pct, hasItems ? parts.promo : 0, trainerPick.first) : null;
  // A trainer ordering for themselves: their $5 meal credits come off what's left of the food.
  let trainer_credit = null;
  if (!monthly && hasItems && tcfg.on && trainerByPhone(settings.trainers, digits)) {
    try {
      const tc = trainerCredits(await ordersByTrainer(digits), past, today, settings);
      trainer_credit = trainerCreditRow(useTrainerCredits(tc.ids, tc.each, priced.subtotal - parts.total));
    } catch (e) { console.error('trainer credits', e?.message); }
  }
  const allDisc = hasItems ? Math.round((parts.total + (trainer_credit ? trainer_credit.amount : 0)) * 100) / 100 : 0;
  const total = hasItems ? Math.round((priced.subtotal - allDisc + fee + cFee) * 100) / 100 : null;
  // The page may not know about every discount yet: a lower total than the page showed is fine.
  if (!monthly && !admin && hasItems && body.total != null && Number(body.total) + 0.01 < total) {
    return { error: 'price_changed', total };
  }

  const dietIds = new Set(DIET_FLAGS.map((d) => d.id));
  const cook_date = monthly
    ? monthly.cook_date
    : admin && /^\d{4}-\d{2}-\d{2}$/.test(body.cook_date || '')
      ? body.cook_date
      : cookDateFor(laNow(), settings.cutoff_day, settings.cutoff_hour);

  // Weekly customer cap: a customer already in the week can still add an order.
  const capacity = Math.max(0, parseInt(settings.weekly_capacity, 10) || 0);
  if (!monthly && !admin && capacity > 0) {
    const have = await weekCustomers(cook_date);
    if (!have.has(digits) && have.size >= capacity) return { error: 'full' };
  }

  const row = {
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
      discount: allDisc,
      reward,
      referral,
      ref_credit,
      ...(trainer ? { trainer } : {}),
      ...(trainer_credit ? { trainer_credit } : {}),
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
    };
  if (monthly) return { row, past };
  const after = loyaltyState([...past, { ...row, paid: true, status: 'new' }], today, settings, digits);
  return { row, loyalty: publicLoyalty(after, row.lang), ref: { code: rcfg.on ? codeFor(digits, name) : '', note: refNote } };
}

// Monthly Plan: 4 order rows (one per cook week) paid together up front.
//   body.monthly_weeks = [cart, cart, cart, cart] (each 8/10/12 meals and/or 4+ lb)
export async function buildMonthlyRows(body, { admin = false } = {}) {
  const settings = await getSettings({ fresh: true });
  const mcfg = monthlyConfig(settings);
  if (!mcfg.on) return { error: 'monthly_off' };
  if (!admin && !settings.ordering_open) return { error: 'closed' };
  const carts = Array.isArray(body.monthly_weeks) ? body.monthly_weeks.slice(0, mcfg.weeks) : [];
  if (carts.length !== mcfg.weeks) return { error: 'monthly_weeks' };
  const first = cookDateFor(laNow(), settings.cutoff_day, settings.cutoff_hour);
  const weeks = monthlyWeeks(first, mcfg.weeks);
  const today = dateKey(laNow());
  // Max active plans (Juan's regulars).
  const running = await monthlyOrdersFrom(today).catch(() => []);
  if (activeMonthly(running, today).size >= mcfg.max) return { error: 'monthly_full' };
  const digits = normalizePhone(body.phone);
  const capacity = Math.max(0, parseInt(settings.weekly_capacity, 10) || 0);
  const rows = [];
  let past = [];
  for (let i = 0; i < weeks.length; i++) {
    const cart = carts[i] || {};
    const meals = (cart.meals || []).reduce((a, m) => a + mealLineCount(m), 0);
    const lbs = (cart.lbs || []).reduce((a, l) => a + (Number(l.lbs) || 0), 0);
    if (!weekSizeOk(meals, lbs) || meals > MAX_MEALS) return { error: 'monthly_size', week: i + 1 };
    if (!admin && capacity > 0 && digits.length === 10) {
      const have = await weekCustomers(weeks[i]);
      if (!have.has(digits) && have.size >= capacity) return { error: 'monthly_week_full', week: i + 1 };
    }
    const b = await buildOrderRow({ ...body, cart, custom_request: '', promo_code: '', ref_code: '', total: null }, { admin, settings, monthly: { pct: mcfg.pct, cook_date: weeks[i], card_fee: i === 0 } });
    if (b.error) return { ...b, week: i + 1 };
    rows.push(b.row);
    past = b.past;
  }
  const id = newMonthlyId();
  const planTotal = Math.round(rows.reduce((a, r) => a + Number(r.total || 0), 0) * 100) / 100;
  rows.forEach((r, i) => { r.monthly = monthlyRow(id, i + 1, rows.length, mcfg.pct, r.discount, planTotal); });
  // Only the first week asks for texts / the reminder; the plan counts as one loyalty order.
  rows.slice(1).forEach((r) => { r.sms_opt_in = false; r.sms_opt_in_at = null; r.reminder_opt_in = false; });
  const after = loyaltyState([...past, { ...rows[0], paid: true, status: 'new' }], today, settings, digits);
  return { rows, plan_total: planTotal, loyalty: publicLoyalty(after, rows[0].lang), ref: { code: referralConfig(settings).on ? codeFor(digits, rows[0].customer_name) : '', note: '' } };
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
  // A promo code / loyalty reward used at checkout stays on the order: re-figure both for the new subtotal.
  const curDisc = Number(cur.discount) || 0;
  const promoD = cur.promo ? promoDiscount(cur.promo, subtotal) : cur.trainer ? pctOff(cur.trainer.pct, subtotal) : 0;
  const parts = cur.monthly
    ? { promo: 0, reward: 0, referral: 0, credit: 0, total: pctOff(cur.monthly.pct, subtotal) }
    : allDiscounts(subtotal, { promoDisc: promoD, reward: cur.reward, refPct: cur.referral ? cur.referral.pct : 0, creditPct: cur.ref_credit ? cur.ref_credit.pct : 0 }, settings);
  let tcAmt = 0;
  if (cur.trainer_credit) {
    tcAmt = Math.min(Number(cur.trainer_credit.amount) || 0, Math.max(0, Math.round((subtotal - parts.total) * 100) / 100));
    out.trainer_credit = { ...cur.trainer_credit, amount: tcAmt };
  }
  const disc = Math.round((parts.total + tcAmt) * 100) / 100;
  if (cur.trainer) out.trainer = { ...cur.trainer, discount: parts.promo };
  if (cur.monthly) out.monthly = { ...cur.monthly, discount: parts.total };
  if (cur.reward) out.reward = { ...cur.reward, discount: parts.reward };
  if (cur.referral) out.referral = { ...cur.referral, discount: parts.referral };
  if (cur.ref_credit) out.ref_credit = { ...cur.ref_credit, discount: parts.credit };
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
