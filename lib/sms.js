// Customer text messages (Twilio) — the three order-status texts.
//
// OFF until the carrier approves the A2P 10DLC campaign. A text only goes out when ALL are true:
//   1. SMS_ENABLED=true in Vercel env vars (flip this only after Twilio shows the campaign "Verified")
//   2. TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + (TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER) are set
//   3. The customer ticked the (unchecked-by-default) "Text me order updates" box at checkout
//   4. That text hasn't already been sent for that order (orders.sms_sent)
// Sending is best-effort: a Twilio error is logged and never blocks or fails an order.
import { addDays, prettyDate, money } from './menu.js';

export const SMS_KINDS = ['confirm', 'paid', 'ready'];
const SITE = 'dinomeals.vercel.app/order';
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
export function reminderMessage(lang = 'en', s = {}) {
  return lang === 'es'
    ? `🦖 DinoMeals: Las órdenes de esta semana cierran el ${cutoffText(s, 'es')}. Ordena en ${SITE}. Responde STOP para no recibir más.`
    : `🦖 DinoMeals: Orders for this week close ${cutoffText(s, 'en')}. Order at ${SITE}. Reply STOP to opt out.`;
}

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
  if (o.payment_method === 'card' && s.card_link) return es ? `Paga con tarjeta: ${s.card_link}` : `Pay by card: ${s.card_link}`;
  return es ? 'El pago se hace antes del día de cocina.' : 'Payment is due before cook day.';
}

// When the customer gets the food: pickup on cook day (Sunday), delivery the next day (Monday).
function whenText(o, lang) {
  if (!o.cook_date) return '';
  const day = o.fulfillment === 'delivery' ? addDays(o.cook_date, 1) : o.cook_date;
  return prettyDate(day, lang);
}

// Returns the text body for one of the three messages, or null if it doesn't apply.
export function buildMessage(kind, o, s = {}) {
  const lang = o.lang === 'es' ? 'es' : 'en';
  const es = lang === 'es';
  const no = o.order_no ? `#${o.order_no}` : '';
  const hi = firstName(o.customer_name);
  const quote = o.total == null;

  if (kind === 'confirm') {
    if (quote) {
      return es
        ? `${BRAND} ¡Hola ${hi}! Recibimos tu pedido a tu gusto ${no}. Te mandamos el precio por texto pronto. ${OPT.es}`
        : `${BRAND} Hi ${hi}! We got your custom request ${no}. We'll text you a price soon. ${OPT.en}`;
    }
    return es
      ? `${BRAND} ¡Hola ${hi}! Recibimos tu orden ${no}: ${itemsSummary(o, lang)}, total ${money(o.total)}. Día de cocina: ${prettyDate(o.cook_date, lang)}. ${payLine(o, s, lang)} ${OPT.es}`
      : `${BRAND} Hi ${hi}! We got order ${no}: ${itemsSummary(o, lang)}, total ${money(o.total)}. Cook day: ${prettyDate(o.cook_date, lang)}. ${payLine(o, s, lang)} ${OPT.en}`;
  }

  if (kind === 'paid') {
    const how = o.fulfillment === 'delivery'
      ? (s.delivery_window ? (es ? `Entrega: ${s.delivery_window}.` : `Delivery: ${s.delivery_window}.`) : es ? `Entrega el ${whenText(o, lang)}.` : `Delivery ${whenText(o, lang)}.`)
      : (es ? `Recoge el ${whenText(o, lang)}.` : `Pickup ${whenText(o, lang)}.`);
    return es
      ? `${BRAND} Pago recibido para la orden ${no}${quote ? '' : ` (${money(o.total)})`}. ¡Gracias! ${how} ${OPT.es}`
      : `${BRAND} Payment received for order ${no}${quote ? '' : ` (${money(o.total)})`}. Thank you! ${how} ${OPT.en}`;
  }

  if (kind === 'ready') {
    if (o.fulfillment === 'delivery') {
      return es
        ? `${BRAND} ¡Tu orden ${no} está lista y sale a entrega${s.delivery_window ? ` (${s.delivery_window})` : ` el ${whenText(o, lang)}`}. ${OPT.es}`
        : `${BRAND} Your order ${no} is ready and out for delivery${s.delivery_window ? ` (${s.delivery_window})` : ` ${whenText(o, lang)}`}. ${OPT.en}`;
    }
    const where = s.pickup_address ? (es ? ` Dirección: ${s.pickup_address}.` : ` Pickup at ${s.pickup_address}.`) : '';
    return es
      ? `${BRAND} ¡Tu orden ${no} está lista para recoger!${where} ${OPT.es}`
      : `${BRAND} Your order ${no} is ready for pickup!${where} ${OPT.en}`;
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
export async function sendOrderText(kind, o, settings, { env = process.env, fetchImpl = fetch } = {}) {
  if (!shouldSend(kind, o, env)) return null;
  const body = buildMessage(kind, o, settings);
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
