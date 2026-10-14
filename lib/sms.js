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
        ? `DinoMeals: ¡Hola ${hi}! Recibimos tu pedido a tu gusto ${no}. Te mandamos el precio por texto pronto. ${OPT.es}`
        : `DinoMeals: Hi ${hi}! We got your custom request ${no}. We'll text you a price soon. ${OPT.en}`;
    }
    return es
      ? `DinoMeals: ¡Hola ${hi}! Recibimos tu orden ${no}: ${itemsSummary(o, lang)}, total ${money(o.total)}. Día de cocina: ${prettyDate(o.cook_date, lang)}. ${payLine(o, s, lang)} ${OPT.es}`
      : `DinoMeals: Hi ${hi}! We got order ${no}: ${itemsSummary(o, lang)}, total ${money(o.total)}. Cook day: ${prettyDate(o.cook_date, lang)}. ${payLine(o, s, lang)} ${OPT.en}`;
  }

  if (kind === 'paid') {
    const how = o.fulfillment === 'delivery'
      ? (es ? `Entrega el ${whenText(o, lang)}.` : `Delivery ${whenText(o, lang)}.`)
      : (es ? `Recoge el ${whenText(o, lang)}.` : `Pickup ${whenText(o, lang)}.`);
    return es
      ? `DinoMeals: Pago recibido para la orden ${no}${quote ? '' : ` (${money(o.total)})`}. ¡Gracias! ${how} ${OPT.es}`
      : `DinoMeals: Payment received for order ${no}${quote ? '' : ` (${money(o.total)})`}. Thank you! ${how} ${OPT.en}`;
  }

  if (kind === 'ready') {
    if (o.fulfillment === 'delivery') {
      return es
        ? `DinoMeals: ¡Tu orden ${no} está lista! Sale a entrega el ${whenText(o, lang)}. ${OPT.es}`
        : `DinoMeals: Your order ${no} is ready! It goes out for delivery ${whenText(o, lang)}. ${OPT.en}`;
    }
    const where = s.pickup_address ? (es ? ` Dirección: ${s.pickup_address}.` : ` Pickup at ${s.pickup_address}.`) : '';
    return es
      ? `DinoMeals: ¡Tu orden ${no} está lista para recoger!${where} ${OPT.es}`
      : `DinoMeals: Your order ${no} is ready for pickup!${where} ${OPT.en}`;
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
