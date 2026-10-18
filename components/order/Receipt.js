// Itemized receipt for one order (public fields only — see lib/orderView.js).
import { lineLabel, ozTag, money } from '../../lib/menu';
import { VIEW_TXT } from '../../lib/orderView';

function lineParts(l, lang, x) {
  if (l.type === 'meal') {
    const [protein, ...sides] = lineLabel(l, lang).split(' + ');
    const tag = ozTag(l, lang);
    return { q: `${l.count}×`, name: protein, sub: [...sides, tag].filter(Boolean).join(' · ') };
  }
  if (l.type === 'extra') return { q: `${l.qty}×`, name: `${lineLabel(l, lang)}`, sub: x.extra };
  return { q: `${l.lbs} lb`, name: lineLabel(l, lang), sub: '' };
}

export default function Receipt({ order, lang = 'en', badge = true }) {
  const x = VIEW_TXT[lang] || VIEW_TXT.en;
  const quote = order.total == null;
  return (
    <div className="receipt">
      <div className="rc-head">
        <b>{x.your_order}</b>
        <span>
          {order.fulfillment === 'delivery' ? x.delivery : x.pickup}
          {badge && !quote && <em className={order.paid ? 'ok' : ''}>{order.paid ? x.paid_badge : x.unpaid_badge}</em>}
        </span>
      </div>
      {(order.items || []).map((l, i) => {
        const p = lineParts(l, lang, x);
        return (
          <div className="rc-row" key={i}>
            <div><span className="rc-q">{p.q}</span>{p.name}{p.sub && <small>{p.sub}</small>}</div>
            {l.total != null && <b>{money(l.total)}</b>}
          </div>
        );
      })}
      {order.custom_request && (
        <div className="rc-row"><div>{x.custom}<small>{order.custom_request}</small></div></div>
      )}
      {!quote && (
        <div className="rc-tot">
          {order.delivery_fee > 0 && (
            <>
              <div><span>{x.subtotal}</span><span>{money(order.subtotal)}</span></div>
              <div><span>{x.fee}</span><span>{money(order.delivery_fee)}</span></div>
            </>
          )}
          <div className="big"><span>{x.total}</span><span>{money(order.total)}</span></div>
        </div>
      )}
    </div>
  );
}
