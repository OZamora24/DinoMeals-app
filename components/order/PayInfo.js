// "How to pay" lines for an unpaid order (Zelle / Venmo / card links / cash). Shared by the
// confirmation screen and the customer's order page.
import { money } from '../../lib/menu';
import { Card, Cash, Bolt } from '../Icons';
import { cardLinks, venmoLink } from '../../lib/payLinks';

// Pay links live in lib/payLinks.js (Venmo and Card are separate options).
export { cardLinks as payLinks } from '../../lib/payLinks';

export default function PayInfo({ order, settings = {}, lang, t }) {
  const links = cardLinks(settings);
  const venmo = venmoLink(settings);
  return (
    <>
      {order.payment_method === 'zelle' && (
        <div className="pay-line"><Bolt size={18} /><div>{settings.zelle_info ? <>{t('pay_zelle')} <b>{settings.zelle_info}</b><br /><span className="muted">{t('memo')}: <b>#{order.order_no}</b></span></> : t('zelle_tbd')}</div></div>
      )}
      {order.payment_method === 'venmo' &&
        (venmo ? (
          <div className="pay-links">
            <a className="btn btn-red btn-block" href={venmo} target="_blank" rel="noreferrer">
              <Card size={18} /> {t('pay_venmo')} · {money(order.total)}
            </a>
            <span className="muted small">{t('memo')}: <b>#{order.order_no}</b></span>
          </div>
        ) : (
          <div className="pay-line"><Card size={18} /><div>{t('venmo_tbd')}</div></div>
        ))}
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
