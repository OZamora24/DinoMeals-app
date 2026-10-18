// The customer's private order page: dinomeals.app/o/<code> (linked from the
// confirmation text, the confirmation screen and "My orders"). Shows the items,
// total and live status — never the name, phone, address or notes.
import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '../../components/SiteNav';
import Receipt from '../../components/order/Receipt';
import PayInfo from '../../components/order/PayInfo';
import { Tracker, ReceiptButtons, OrderAgain, SaveContact } from '../../components/order/OrderTools';
import { useLang } from '../../lib/i18n';
import { prettyDate } from '../../lib/menu';
import { CONTACT_NAME, CONTACT_PHONE } from '../../lib/orderForm';
import { VIEW_TXT, rememberOrder } from '../../lib/orderView';

export async function getServerSideProps({ params, res }) {
  const { getOrderByToken, getSettings } = await import('../../lib/db');
  const { publicOrder } = await import('../../lib/orderView');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  try {
    const o = await getOrderByToken(String(params.token || ''));
    if (!o) {
      res.statusCode = 404;
      return { props: { order: null, pay: {} } };
    }
    const s = await getSettings();
    const pay = { zelle_info: s.zelle_info || '', card_link: s.card_link || '', cashapp_link: s.cashapp_link || '', cash_info: s.cash_info || '' };
    return { props: { order: publicOrder(o), pay } };
  } catch (e) {
    console.error('order page', e?.message);
    res.statusCode = 500;
    return { props: { order: null, pay: {} } };
  }
}

export default function OrderPage({ order, pay }) {
  const { lang, setLang, t } = useLang();
  const x = VIEW_TXT[lang] || VIEW_TXT.en;
  useEffect(() => {
    if (!order) return;
    rememberOrder(order);
    // First visit on a new phone: show it in the language they ordered in.
    try { if (!localStorage.getItem('dinoLang') && order.lang === 'es') setLang('es'); } catch {}
  }, [order, setLang]);

  return (
    <div className="page order-page">
      <Head>
        <title>{order ? `DinoMeals · ${x.order} #${order.order_no}` : 'DinoMeals'}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <SiteNav lang={lang} setLang={setLang} t={t} cta={false} />
      <main className="done track-page">
        {!order ? (
          <>
            <h1 className="display">{x.not_found_t}</h1>
            <p className="done-no">{x.not_found_s}</p>
            <p className="contact-line"><b>{CONTACT_NAME}</b> <a href={`tel:${CONTACT_PHONE.replace(/\D/g, '')}`}>{CONTACT_PHONE}</a></p>
            <div className="done-actions"><Link href="/" className="btn btn-ghost">DinoMeals</Link></div>
          </>
        ) : (
          <>
            <h1 className="display">{x.order} #{order.order_no}</h1>
            <p className="done-no">{order.fulfillment === 'delivery' ? x.delivery : x.pickup} · {t('cook_day')} {prettyDate(order.cook_date, lang)}</p>
            <Tracker order={order} lang={lang} />
            {!order.paid && order.total != null && order.status !== 'cancelled' && (
              <div className="pay-card">
                <h3>{t('pay_now')}</h3>
                <PayInfo order={order} settings={pay} lang={lang} t={t} />
              </div>
            )}
            <Receipt order={order} lang={lang} />
            <ReceiptButtons order={order} lang={lang} />
            <OrderAgain order={order} lang={lang} />
            <SaveContact lang={lang} />
            <p className="contact-line">{t('questions')} <b>{CONTACT_NAME}</b> <a href={`tel:${CONTACT_PHONE.replace(/\D/g, '')}`}>{CONTACT_PHONE}</a></p>
          </>
        )}
      </main>
    </div>
  );
}
