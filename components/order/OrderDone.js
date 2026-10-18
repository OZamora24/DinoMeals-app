import { useEffect } from 'react';
import { prettyDate, money } from '../../lib/menu';
import { Check } from '../../components/Icons';
import Link from 'next/link';
import SiteNav from '../SiteNav';
import { CONTACT_NAME, CONTACT_PHONE } from '../../lib/orderForm';
import ChefRexPopup from './ChefRexPopup';
import PayInfo from './PayInfo';
import Receipt from './Receipt';
import { ReceiptButtons, SaveContact } from './OrderTools';
import { rememberOrder } from '../../lib/orderView';

export default function OrderDone({ done, adminMode, settings, lang, setLang, t, resetAll }) {
  const quote = done.total == null;
  // Save it to this phone's 🧾 My orders list.
  useEffect(() => { if (!adminMode && done.token) rememberOrder(done); }, [adminMode, done]);
  return (
    <div className="page order-page">
      <SiteNav lang={lang} setLang={setLang} t={t} cta={false} />
      <main className="done">
        <div className="done-check"><Check size={44} /></div>
        <h1 className="display">{t('done_title')}</h1>
        <p className="done-no">{t('done_sub')} <b>#{done.order_no}</b> · {t('cook_day')} {prettyDate(done.cook_date, lang)}</p>
        {quote ? (
          <div className="pay-card"><p>{t('quote_done')}</p></div>
        ) : (
          <div className="pay-card">
            <div className="pay-total">{money(done.total)}</div>
            {!adminMode && (
              <>
                <h3>{t('pay_now')}</h3>
                <PayInfo order={done} settings={settings} lang={lang} t={t} />
                <p className="muted small">{t('pay_after')}</p>
              </>
            )}
          </div>
        )}
        {done.items?.length > 0 && <Receipt order={done} lang={lang} badge={false} />}
        {!adminMode && done.token && <ReceiptButtons order={done} lang={lang} />}
        {!adminMode && <SaveContact lang={lang} />}
        <p className="contact-line">{t('questions')} <b>{CONTACT_NAME}</b> <a href={`tel:${CONTACT_PHONE.replace(/\D/g, '')}`}>{CONTACT_PHONE}</a></p>
        <div className="done-actions">
          {adminMode ? (
            <>
              <button className="btn btn-red" onClick={resetAll}>+ Enter another order</button>
              <Link href="/admin" className="btn btn-ghost">Back to dashboard</Link>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={resetAll}>{t('new_order')}</button>
              <Link href="/" className="btn btn-ghost">DinoMeals</Link>
            </>
          )}
        </div>
      </main>
      {!adminMode && <ChefRexPopup lang={lang} orderNo={done.order_no} />}
    </div>
  );
}
