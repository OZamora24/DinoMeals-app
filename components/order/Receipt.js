// Itemized receipt for one order (public fields only — see lib/orderView.js).
import { lineLabel, ozTag, money } from '../../lib/menu';
import { VIEW_TXT, discountParts } from '../../lib/orderView';

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
  const dp = discountParts(order);
  const { reward: rewardPart, referral: refPart, credit: creditPart, promo: promoPart } = dp;
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
      {quote && order.reward && (
        <div className="rc-row rc-promo"><div>🎁 {x.reward}<small>{x.promo_pending}</small></div><b>{order.reward.label}</b></div>
      )}
      {quote && order.promo_code && (
        <div className="rc-row rc-promo"><div>🏷 {x.promo} {order.promo_code}<small>{x.promo_pending}</small></div><b>{order.promo_off}</b></div>
      )}
      {!quote && (
        <div className="rc-tot">
          {(order.delivery_fee > 0 || order.discount > 0) && (
            <>
              <div><span>{x.subtotal}</span><span>{money(order.subtotal)}</span></div>
              {promoPart > 0 && <div className="rc-promo"><span>{x.promo} {order.promo_code}</span><span>−{money(promoPart)}</span></div>}
              {rewardPart > 0 && <div className="rc-promo"><span>🎁 {x.reward} · {order.reward.label}</span><span>−{money(rewardPart)}</span></div>}
              {refPart > 0 && <div className="rc-promo"><span>🤝 {x.referral(order.referral.by)} · {order.referral.pct}%</span><span>−{money(refPart)}</span></div>}
              {creditPart > 0 && <div className="rc-promo"><span>🤝 {x.ref_credit(order.ref_credit.n)} · {order.ref_credit.pct}%</span><span>−{money(creditPart)}</span></div>}
              {dp.trainer > 0 && <div className="rc-promo"><span>💪 {x.trainer(order.trainer.code)} · {order.trainer.pct}%</span><span>−{money(dp.trainer)}</span></div>}
              {dp.monthly > 0 && <div className="rc-promo"><span>📅 {x.monthly(order.monthly.week, order.monthly.of)} · {order.monthly.pct}%</span><span>−{money(dp.monthly)}</span></div>}
              {dp.tcredit > 0 && <div className="rc-promo"><span>💪 {x.trainer_credit(order.trainer_credit.n)}</span><span>−{money(dp.tcredit)}</span></div>}
              {order.delivery_fee > 0 && <div><span>{x.fee}</span><span>{money(order.delivery_fee)}</span></div>}
            </>
          )}
          <div className="big"><span>{x.total}</span><span>{money(order.total)}</span></div>
          {order.monthly && order.monthly.week === 1 && order.monthly.plan_total > 0 && <div className="rc-plan"><span>📅 {x.plan_total}</span><b>{money(order.monthly.plan_total)}</b></div>}
        </div>
      )}
    </div>
  );
}
