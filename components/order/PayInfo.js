// "How to pay" lines for an unpaid order (Zelle / card links / cash). Shared by the
// confirmation screen and the customer's order page.
import { money } from '../../lib/menu';
import { Card, Cash, Bolt } from '../Icons';

// Card-type pay links from settings, labelled by where they go (Venmo / Cash App / card).
export function payLinks(s) {
  return [s.card_link, s.cashapp_link]
    .map((h) => String(h || '').trim().split(/\s+/)[0])
    .filter((h) => /^https?:\/\//.test(h))
    .map((href) => ({ href, label: /venmo\./i.test(href) ? 'Venmo' : /cash\.app/i.test(href) ? 'Cash App' : /paypal\./i.test(href) ? 'PayPal' : '' }));
}

export default function PayInfo({ order, settings = {}, lang, t }) {
  const links = payLinks(settings);
  return (
    <>
      {order.payment_method === 'zelle' && (
        <div className="pay-line"><Bolt size={18} /><div>{settings.zelle_info ? <>{t('pay_zelle')} <b>{settings.zelle_info}</b><br /><span className="muted">{t('memo')}: <b>#{order.order_no}</b></span></> : t('zelle_tbd')}</div></div>
      )}
      {order.payment_method === 'card' &&
        (links.length ? (
          <div className="pay-links">
            {links.map((l) => (
              <a key={l.href} className="btn btn-red btn-block" href={l.href} target="_blank" rel="noreferrer">
                <Card size={18} /> {l.label ? `${lang === 'es' ? 'Pagar con' : 'Pay with'} ${l.label}` : t('pay_card')} · {money(order.total)}
              </a>
            ))}
            <span className="muted small">{t('memo')}: <b>#{order.order_no}</b></span>
          </div>
        ) : (
          <div className="pay-line"><Card size={18} /><div>{t('card_tbd')}</div></div>
        ))}
      {order.payment_method === 'cash' && <div className="pay-line"><Cash size={18} /><div>{settings.cash_info}</div></div>}
    </>
  );
}
