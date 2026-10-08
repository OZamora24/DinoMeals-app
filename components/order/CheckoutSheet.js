import { DIET_FLAGS, lineLabel, money } from '../../lib/menu';
import { Truck, Pin, Card, Cash, Bolt } from '../../components/Icons';
import { formatPhone } from '../../lib/orderForm';

export default function CheckoutSheet({
  lang, t, settings, adminMode, adm, setAdm, info, setInfo, custom, priced,
  hasItems, fee, subtotal, total, err, busy, place, onClose,
}) {
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-head">
          <button className="btn btn-ghost btn-sm" onClick={() => onClose()}>← {t('back')}</button>
          <h2>{t('checkout')}</h2>
          <span />
        </div>
        <div className="sheet-body">
          {adminMode && (
            <fieldset className="fs admin-fs">
              <legend>Kitchen</legend>
              <div className="grid2">
                <label>Came in by
                  <select className="input" value={adm.source} onChange={(e) => setAdm({ ...adm, source: e.target.value })}>
                    <option value="dm">Instagram DM</option>
                    <option value="text">Text</option>
                    <option value="call">Phone call</option>
                    <option value="web">In person / other</option>
                  </select>
                </label>
                <label>Cook date (Sunday)
                  <input className="input" type="date" value={adm.cook_date} onChange={(e) => setAdm({ ...adm, cook_date: e.target.value })} />
                </label>
              </div>
              <label className="check"><input type="checkbox" checked={adm.paid} onChange={(e) => setAdm({ ...adm, paid: e.target.checked })} /> Already paid</label>
            </fieldset>
          )}

          <fieldset className="fs">
            <legend>{t('your_info')}</legend>
            <label>{t('name')}<input className="input" autoComplete="name" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></label>
            <div className="grid2">
              <label>{t('phone')}<input className="input" inputMode="tel" autoComplete="tel" placeholder="(909) 555-0123" value={info.phone} onChange={(e) => setInfo({ ...info, phone: formatPhone(e.target.value) })} /></label>
              <label>{t('email_opt')}<input className="input" type="email" autoComplete="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></label>
            </div>
          </fieldset>

          <fieldset className="fs">
            <legend>{t('get_it')}</legend>
            <div className="opt-grid">
              <button className={`opt ${info.fulfillment === 'pickup' ? 'on' : ''}`} onClick={() => setInfo({ ...info, fulfillment: 'pickup' })}>
                <Pin size={22} /><b>{t('pickup')}</b><span>{settings.pickup_window || t('pickup_when')}</span>
              </button>
              <button className={`opt ${info.fulfillment === 'delivery' ? 'on' : ''}`} onClick={() => setInfo({ ...info, fulfillment: 'delivery' })}>
                <Truck size={22} /><b>{t('delivery')}</b><span>{settings.delivery_window || t('delivery_when')}{settings.delivery_fee ? ` · +${money(settings.delivery_fee)}` : ''}</span>
              </button>
            </div>
            {info.fulfillment === 'pickup' && settings.pickup_address && <p className="muted small"><Pin size={14} /> {settings.pickup_address}</p>}
            {info.fulfillment === 'delivery' && (
              <>
                <div className="grid-addr">
                  <label>{t('address')}<input className="input" autoComplete="street-address" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} /></label>
                  <label>{t('zip')}<input className="input" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={info.zip} onChange={(e) => setInfo({ ...info, zip: e.target.value.replace(/\D/g, '') })} /></label>
                </div>
                <label>{t('delivery_notes')}<input className="input" value={info.delivery_notes} onChange={(e) => setInfo({ ...info, delivery_notes: e.target.value })} /></label>
              </>
            )}
          </fieldset>

          <fieldset className="fs">
            <legend>{t('payment')}</legend>
            <p className="muted small">{t('pay_note')}</p>
            <div className="opt-grid three">
              {[['zelle', Bolt], ['cash', Cash], ['card', Card]].map(([k, I]) => (
                <button key={k} className={`opt ${info.payment_method === k ? 'on' : ''}`} onClick={() => setInfo({ ...info, payment_method: k })}>
                  <I size={22} /><b>{t(k)}</b>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="fs">
            <legend>{t('allergies')}</legend>
            <div className="chips">
              {DIET_FLAGS.map((d) => {
                const on = info.diet.includes(d.id);
                return (
                  <button key={d.id} className={`chip sm ${on ? 'on' : ''}`} onClick={() => setInfo({ ...info, diet: on ? info.diet.filter((x) => x !== d.id) : [...info.diet, d.id] })}>
                    {d[lang]}
                  </button>
                );
              })}
            </div>
            <label>{t('allergy_notes')}<textarea className="input" rows={2} value={info.allergy_notes} onChange={(e) => setInfo({ ...info, allergy_notes: e.target.value })} /></label>
          </fieldset>

          <fieldset className="fs review">
            <legend>{t('review')}</legend>
            <ul className="review-list">
              {priced.lines.map((l, i) => (
                <li key={i}>
                  <span>{l.type === 'meal' ? `${l.count}×` : `${l.lbs} lb`} {lineLabel(l, lang)}</span>
                  <b>{money(l.total)}</b>
                </li>
              ))}
              {custom.trim() && (
                <li className="custom-li"><span>✎ {custom.trim()}</span><b>{hasItems ? '' : t('quote')}</b></li>
              )}
            </ul>
            {hasItems && (
              <div className="totals">
                {fee > 0 && (
                  <>
                    <div><span>{t('subtotal')}</span><span>{money(subtotal)}</span></div>
                    <div><span>{t('delivery_fee')}</span><span>{money(fee)}</span></div>
                  </>
                )}
                <div className="grand"><span>{t('total')}</span><span>{money(total)}</span></div>
              </div>
            )}
          </fieldset>
          {err && <div className="error">{err}</div>}
        </div>
        <div className="sheet-foot">
          <button className="btn btn-red btn-lg btn-block" disabled={busy} onClick={place}>
            {busy ? t('placing') : <>{t('place')}{hasItems ? ` · ${money(total)}` : ''}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
