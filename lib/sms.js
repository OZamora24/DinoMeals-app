// Customer text messages (Twilio) — the three order-status texts.
//
// OFF until the carrier approves the A2P 10DLC campaign. A text only goes out when ALL are true:
//   1. SMS_ENABLED=true in Vercel env vars (flip this only after Twilio shows the campaign "Verified")
//   2. TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + (TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER) are set
//   3. The customer ticked the (unchecked-by-default) "Text me order updates" box at checkout
//   4. That text hasn't already been sent for that order (orders.sms_sent)
// Sending is best-effort: a Twilio error is logged and never blocks or fails an order.
import { addDays, prettyDate, money } from './menu.js';
import { venmoLink, cardLinks } from './payLinks.js';
import { rewardLabel, EVERY } from './loyalty.js';

export const SMS_KINDS = ['confirm', 'paid', 'ready'];
const SITE = 'https://dinomeals.app/order';
const DAY = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] };

// "Fri 11:59 PM" for the cutoff saved in settings (cutoff_hour 0 = the end of the day before).
export function cutoffText(s = {}, lang = 'en') {
  let day = Number.isInteger(+s.cutoff_day) ? +s.cutoff_day : 5;
  let hour = Number.isInteger(+s.cutoff_hour) ? +s.cutoff_hour : 20;
  const L = lang === 'es' ? 'es' : 'en';
  if (hour === 0) return `${DAY[L][(day + 6) % 7]} 11:59 PM`;
  const h12 = ((hour + 11) % 12) + 1;
  return `${DAY[L][day]} ${h12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}

// The weekly "orders close soon" reminder (separate opt-in from the order texts).
// `extra` = this customer's own rewards line (see waitingLine), or '' when nothing is waiting.
export function reminderMessage(lang = 'en', s = {}, extra = '') {
  const x = extra ? ` ${extra}` : '';
  return lang === 'es'
    ? `🦖 DinoMeals: Las órdenes de esta semana cierran el ${cutoffText(s, 'es')}.${x} Ordena en ${SITE}. Responde STOP para no recibir más.`
    : `🦖 DinoMeals: Orders for this week close ${cutoffText(s, 'en')}.${x} Order at ${SITE}. Reply STOP to opt out.`;
}

// ---- Rewards lines inside the texts customers already signed up for (no extra texts) ----
// "Payment received" text: where this paid order puts them. `state` = loyaltyState() after it was paid.
export function progressLine(state, o, lang = 'en') {
  if (!state || !state.on || !state.count) return '';
  const es = lang === 'es';
  // Did THIS order just unlock a reward? (its week is the milestone week and it's still unused)
  const hit = (state.earned || []).find((r) => r.milestone === state.count && r.week === o.cook_date && r.status === 'available');
  if (hit) return es ? `🎉 ¡Desbloqueaste ${rewardLabel(hit, 'es')} en tu próxima orden!` : `🎉 You unlocked ${rewardLabel(hit, 'en')} on your next order!`;
  const n = state.progress;
  if (!n) return '';
  const label = rewardLabel(state.next.reward, lang);
  return es
    ? `⭐ Recompensas: ${n} de ${EVERY}. ¡${state.next.left === 1 ? 'Falta 1 orden' : `Faltan ${state.next.left} órdenes`} para ${label}!`
    : `⭐ Rewards: ${n} of ${EVERY}. ${state.next.left} more order${state.next.left === 1 ? '' : 's'} to ${label}!`;
}

// Thursday reminder: only when something is waiting for them (unused reward and/or referral credit).
export function waitingLine(state, credits, lang = 'en') {
  const es = lang === 'es';
  const a = state && state.on ? state.available : null;
  const pct = credits && credits.pct > 0 ? credits.pct : 0;
  if (!a && !pct) return '';
  const parts = [];
  if (a) parts.push(es ? `${rewardLabel(a, 'es')} (úsalo antes del ${prettyDate(a.expires, 'es')})` : `${rewardLabel(a, 'en')} (use by ${prettyDate(a.expires, 'en')})`);
  if (pct) parts.push(es ? `${pct}% de crédito por referidos` : `${pct}% referral credit`);
  return es ? `🎁 Tienes esperando: ${parts.join(' + ')}.` : `🎁 Waiting for you: ${parts.join(' + ')}.`;
}

// Thursday reminder: "rate last week's meals" with their private order link (lib/reviews.js decides who).
export const rateLine = (token, lang = 'en') =>
  token ? (lang === 'es' ? `⭐ Califica tus comidas: ${ORDER_HOST}/o/${token}` : `⭐ Rate last week's meals: ${ORDER_HOST}/o/${token}`) : '';

// "Ready" text: a nudge to turn on the 🔔 so rewards news reaches them as a notification too.
export const BELL_LINE = {
  en: '🔔 Never miss a reward: open dinomeals.app and tap the bell to turn on alerts.',
  es: '🔔 No te pierdas tus recompensas: abre dinomeals.app y toca la campanita para activar avisos.',
};

// Every text starts with the dino emoji — the brand mark inside the text itself (like 🍓 for Fresas).
export const BRAND = '🦖 DinoMeals:';

export function smsStatus(env = process.env) {
  const enabled = env.SMS_ENABLED === 'true';
  const configured = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_MESSAGING_SERVICE_SID || env.TWILIO_PHONE_NUMBER));
  return { enabled, configured, live: enabled && configured };
}

const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const OPT = { en: 'Reply STOP to opt out, HELP for help.', es: 'Responde STOP para no recibir más, HELP para ayuda.' };

function itemsSummary(o, lang) {
  const parts = [];
  if (Number(o.meal_count) > 0) parts.push(`${o.meal_count} ${lang === 'es' ? 'comidas' : 'meals'}`);
  if (Number(o.lb_total) > 0) parts.push(`${Number(o.lb_total)} lb`);
  return parts.join(' + ');
}

function payLine(o, s, lang) {
  const es = lang === 'es';
  if (o.paid) return es ? 'Ya está pagada, ¡gracias!' : 'Already paid, thank you!';
  if (o.payment_method === 'zelle' && s.zelle_info) return es ? `Paga por Zelle a ${s.zelle_info}.` : `Pay by Zelle to ${s.zelle_info}.`;
  if (o.payment_method === 'venmo' && venmoLink(s)) return es ? `Paga por Venmo: ${venmoLink(s)}` : `Pay by Venmo: ${venmoLink(s)}`;
  if (o.payment_method === 'card' && cardLinks(s)[0]) return es ? `Paga con tarjeta: ${cardLinks(s)[0].href}` : `Pay by card: ${cardLinks(s)[0].href}`;
  return es ? 'El pago se hace antes del día de cocina.' : 'Payment is due before cook day.';
}

// When the customer gets the food: pickup on cook day (Sunday), delivery the next day (Monday).
function whenText(o, lang) {
  if (!o.cook_date) return '';
  const day = o.fulfillment === 'delivery' ? addDays(o.cook_date, 1) : o.cook_date;
  return prettyDate(day, lang);
}

// Private order page link ("Your order: dinomeals.app/o/ab12cd34ef56").
const ORDER_HOST = 'https://dinomeals.app'; // full https:// so phones turn it into a tappable link
function orderLink(o, lang) {
  if (!o.view_token) return '';
  return `${lang === 'es' ? 'Tu orden' : 'Your order'}: ${ORDER_HOST}/o/${o.view_token}`;
}

// Returns the text body for one of the three messages, or null if it doesn't apply.
//   extra.line = optional rewards line for the "payment received" text (see progressLine)
//   extra.bell = false to leave the 🔔 tip off the "ready" text
export function buildMessage(kind, o, s = {}, extra = {}) {
  const msg = buildMessageRaw(kind, o, s, extra);
  return msg ? msg.replace(/ {2,}/g, ' ') : msg;
}

function buildMessageRaw(kind, o, s = {}, extra = {}) {
  const lang = o.lang === 'es' ? 'es' : 'en';
  const es = lang === 'es';
  const no = o.order_no ? `#${o.order_no}` : '';
  const hi = firstName(o.customer_name);
  const quote = o.total == null;

  if (kind === 'confirm') {
    if (quote) {
      return es
        ? `${BRAND} ¡Hola ${hi}! Recibimos tu pedido a tu gusto ${no}. Te mandamos el precio por texto pronto. ${orderLink(o, lang)} ${OPT.es}`
        : `${BRAND} Hi ${hi}! We got your custom request ${no}. We'll text you a price soon. ${orderLink(o, lang)} ${OPT.en}`;
    }
    if (o.monthly) {
      const m = o.monthly;
      return es
        ? `${BRAND} ¡Hola ${hi}! Recibimos tu Plan Mensual ${no}: ${m.of} fines de semana, total ${money(m.plan_total)} (${m.pct}% de descuento). Primer día de cocina: ${prettyDate(o.cook_date, lang)}. ${payLine(o, s, lang)} ${orderLink(o, lang)} ${OPT.es}`
        : `${BRAND} Hi ${hi}! We got your Monthly Plan ${no}: ${m.of} weekends, total ${money(m.plan_total)} (${m.pct}% off). First cook day: ${prettyDate(o.cook_date, lang)}. ${payLine(o, s, lang)} ${orderLink(o, lang)} ${OPT.en}`;
    }
    return es
      ? `${BRAND} ¡Hola ${hi}! Recibimos tu orden ${no}: ${itemsSummary(o, lang)}, total ${money(o.total)}. Día de cocina: ${prettyDate(o.cook_date, lang)}. ${payLine(o, s, lang)} ${orderLink(o, lang)} ${OPT.es}`
      : `${BRAND} Hi ${hi}! We got order ${no}: ${itemsSummary(o, lang)}, total ${money(o.total)}. Cook day: ${prettyDate(o.cook_date, lang)}. ${payLine(o, s, lang)} ${orderLink(o, lang)} ${OPT.en}`;
  }

  if (kind === 'paid') {
    const how = o.fulfillment === 'delivery'
      ? (s.delivery_window ? (es ? `Entrega: ${s.delivery_window}.` : `Delivery: ${s.delivery_window}.`) : es ? `Entrega el ${whenText(o, lang)}.` : `Delivery ${whenText(o, lang)}.`)
      : (es ? `Recoge el ${whenText(o, lang)}.` : `Pickup ${whenText(o, lang)}.`);
    const line = extra.line || '';
    if (o.monthly) {
      return es
        ? `${BRAND} Pago recibido para tu Plan Mensual ${no} (${money(o.monthly.plan_total)}). ¡Gracias! ${how} ${line} ${orderLink(o, lang)} ${OPT.es}`
        : `${BRAND} Payment received for your Monthly Plan ${no} (${money(o.monthly.plan_total)}). Thank you! ${how} ${line} ${orderLink(o, lang)} ${OPT.en}`;
    }
    return es
      ? `${BRAND} Pago recibido para la orden ${no}${quote ? '' : ` (${money(o.total)})`}. ¡Gracias! ${how} ${line} ${orderLink(o, lang)} ${OPT.es}`
      : `${BRAND} Payment received for order ${no}${quote ? '' : ` (${money(o.total)})`}. Thank you! ${how} ${line} ${orderLink(o, lang)} ${OPT.en}`;
  }

  if (kind === 'ready') {
    const bell = extra.bell === false ? '' : BELL_LINE[lang];
    if (o.fulfillment === 'delivery') {
      return es
        ? `${BRAND} ¡Tu orden ${no} está lista y sale a entrega${s.delivery_window ? ` (${s.delivery_window})` : ` el ${whenText(o, lang)}`}. ${bell} ${OPT.es}`
        : `${BRAND} Your order ${no} is ready and out for delivery${s.delivery_window ? ` (${s.delivery_window})` : ` ${whenText(o, lang)}`}. ${bell} ${OPT.en}`;
    }
    const where = s.pickup_address ? (es ? ` Dirección: ${s.pickup_address}.` : ` Pickup at ${s.pickup_address}.`) : '';
    return es
      ? `${BRAND} ¡Tu orden ${no} está lista para recoger!${where} ${bell} ${OPT.es}`
      : `${BRAND} Your order ${no} is ready for pickup!${where} ${bell} ${OPT.en}`;
  }
  return null;
}

// Should this order get this text right now? (pure — used by the API and tests)
export function shouldSend(kind, o, env = process.env) {
  if (!SMS_KINDS.includes(kind) || !o) return false;
  if (!smsStatus(env).live) return false;
  if (!o.sms_opt_in) return false;
  if (o.status === 'cancelled') return false;
  if (o.sms_sent && o.sms_sent[kind]) return false;
  return String(o.phone_digits || '').length === 10;
}

// Sends any body to a 10-digit US number. Returns { ok, code } — code 21610 means the
// person replied STOP (Twilio blocks further texts to them).
export async function sendText(digits, body, { env = process.env, fetchImpl = fetch } = {}) {
  if (!smsStatus(env).live || String(digits || '').length !== 10 || !body) return { ok: false, code: 'off' };
  const params = new URLSearchParams({ To: `+1${digits}`, Body: body });
  if (env.TWILIO_MESSAGING_SERVICE_SID) params.set('MessagingServiceSid', env.TWILIO_MESSAGING_SERVICE_SID);
  else params.set('From', env.TWILIO_PHONE_NUMBER);
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
  try {
    const r = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (r.ok) return { ok: true };
    const j = await r.json().catch(() => ({}));
    console.error('Twilio text failed', r.status, j.code, j.message);
    return { ok: false, code: j.code || r.status };
  } catch (e) {
    console.error('Twilio text error', e?.message);
    return { ok: false, code: 'error' };
  }
}

// Sends one text. Returns the updated sms_sent map, or null when nothing was sent.
export async function sendOrderText(kind, o, settings, { env = process.env, fetchImpl = fetch, extra = {} } = {}) {
  if (!shouldSend(kind, o, env)) return null;
  const body = buildMessage(kind, o, settings, extra);
  if (!body) return null;
  const params = new URLSearchParams({ To: `+1${o.phone_digits}`, Body: body });
  if (env.TWILIO_MESSAGING_SERVICE_SID) params.set('MessagingServiceSid', env.TWILIO_MESSAGING_SERVICE_SID);
  else params.set('From', env.TWILIO_PHONE_NUMBER);
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      console.error('Twilio SMS failed', kind, o.order_no, r.status, await r.text().catch(() => ''));
      return null;
    }
    return { ...(o.sms_sent || {}), [kind]: new Date().toISOString() };
  } catch (e) {
    console.error('Twilio SMS error', kind, o.order_no, e?.message);
    return null;
  }
}
