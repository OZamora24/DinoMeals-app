// dinomeals.app/pay/<code>: starts a Stripe payment (card, Apple Pay, Google Pay) for the order's
// current total and sends the customer to Stripe's page. Nothing about the amount comes from the
// browser. If it can't start, a small page says why with a link back to the order.
import Head from 'next/head';
import Link from 'next/link';

const MSG = {
  en: { t: "Couldn't start the payment", paid: 'This order is already paid. Thank you!', quote: "We haven't priced this order yet. We'll text you the total.", off: 'Online card payment is off right now. Please use the payment info on your order page.', cancelled: 'This order was cancelled.', not_found: "We couldn't find this order.", error: 'Something went wrong. Please try again in a minute.', back: 'Back to my order' },
  es: { t: 'No se pudo iniciar el pago', paid: 'Esta orden ya está pagada. ¡Gracias!', quote: 'Todavía no tenemos el precio de esta orden. Te enviaremos el total por mensaje.', off: 'El pago con tarjeta en línea está apagado. Usa la información de pago en tu orden.', cancelled: 'Esta orden fue cancelada.', not_found: 'No encontramos esta orden.', error: 'Algo salió mal. Intenta de nuevo en un minuto.', back: 'Volver a mi orden' },
};

export async function getServerSideProps({ params, req, res }) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const token = String(params.token || '');
  const fail = (reason, lang = 'en', status = 200) => { res.statusCode = status; return { props: { reason, lang, token } }; };
  try {
    const { rateLimit } = await import('../../lib/rateLimit');
    if (!rateLimit(req, 'pay', 20, 10 * 60 * 1000)) return fail('error', 'en', 429);
    const { getOrderByToken, getSettings, ordersByMonthly } = await import('../../lib/db');
    const { cardOnline, payable, checkoutFields, createCheckout } = await import('../../lib/stripePay');
    const o = await getOrderByToken(token);
    if (!o) return fail('not_found', 'en', 404);
    const lang = o.lang === 'es' ? 'es' : 'en';
    if (!cardOnline(await getSettings())) return fail('off', lang);
    // A Monthly Plan is paid as one: all 4 weeks, on week 1's order.
    let first = o;
    let list = [o];
    if (o.monthly && o.monthly.id) {
      list = await ordersByMonthly(o.monthly.id);
      first = list.find((x) => x.monthly && x.monthly.week === 1) || o;
    }
    const p = payable(list);
    if (!p.ok) return fail(p.reason === 'too_small' ? 'error' : p.reason, lang);
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'dinomeals.app';
    const base = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? `http://${host}` : `https://${host}`;
    const s = await createCheckout(checkoutFields(first, { amount: p.amount, base, weeks: list.length }));
    return { redirect: { destination: s.url, permanent: false } };
  } catch (e) {
    console.error('pay page', e?.message);
    return fail('error', 'en', 500);
  }
}

export default function PayPage({ reason, lang, token }) {
  const m = MSG[lang] || MSG.en;
  return (
    <div className="page order-page">
      <Head><title>DinoMeals</title><meta name="robots" content="noindex" /></Head>
      <main className="done track-page">
        <h1 className="display">{reason === 'paid' ? '✓' : m.t}</h1>
        <p className="done-no">{m[reason] || m.error}</p>
        <div className="done-actions">
          {reason !== 'not_found' && <Link href={`/o/${token}`} className="btn btn-red">{m.back}</Link>}
        </div>
      </main>
    </div>
  );
}
