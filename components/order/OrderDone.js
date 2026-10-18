import { prettyDate, money } from '../../lib/menu';
import { Check, Card, Cash, Bolt } from '../../components/Icons';
import Link from 'next/link';
import SiteNav from '../SiteNav';
import { CONTACT_NAME, CONTACT_PHONE } from '../../lib/orderForm';
import ChefRexPopup from './ChefRexPopup';

// Card-type pay links from settings, labelled by where they go (Venmo / Cash App / card).
function payLinks(s) {
  return [s.card_link, s.cashapp_link]
    .map((h) => String(h || '').trim().split(/\s+/)[0])
    .filter((h) => /^https?:\/\//.test(h))
    .map((href) => ({ href, label: /venmo\./i.test(href) ? 'Venmo' : /cash\.app/i.test(href) ? 'Cash App' : /paypal\./i.test(href) ? 'PayPal' : '' }));
}

export default function OrderDone({ done, adminMode, settings, lang, setLang, t, resetAll }) {
  const quote = done.total == null;
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
                {done.payment_method === 'zelle' && (
                  <div className="pay-line"><Bolt size={18} /><div>{settings.zelle_info ? <>{t('pay_zelle')} <b>{settings.zelle_info}</b><br /><span className="muted">{t('memo')}: <b>#{done.order_no}</b></span></> : t('zelle_tbd')}</div></div>
                )}
                {done.payment_method === 'card' &&
                  (payLinks(settings).length ? (
                    <div className="pay-links">
                      {payLinks(settings).map((l) => (
                        <a key={l.href} className="btn btn-red btn-block" href={l.href} target="_blank" rel="noreferrer">
                          <Card size={18} /> {l.label ? `${lang === 'es' ? 'Pagar con' : 'Pay with'} ${l.label}` : t('pay_card')} · {money(done.total)}
                        </a>
                      ))}
                      <span className="muted small">{t('memo')}: <b>#{done.order_no}</b></span>
                    </div>
                  ) : (
                    <div className="pay-line"><Card size={18} /><div>{t('card_tbd')}</div></div>
                  ))}
                {done.payment_method === 'cash' && <div className="pay-line"><Cash size={18} /><div>{settings.cash_info}</div></div>}
                <p className="muted small">{t('pay_after')}</p>
              </>
            )}
          </div>
        )}
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
