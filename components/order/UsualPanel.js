import { priceCart, lineLabel, money } from '../../lib/menu';
import { Repeat } from '../../components/Icons';
import { formatPhone } from '../../lib/orderForm';

export default function UsualPanel({ lang, t, open, setOpen, phone, setPhone, usual, findUsual, loadUsual }) {
  return (
    <section className={`usual ${open ? 'open' : ''}`} id="usual">
      <button className="usual-toggle" onClick={() => setOpen((o) => !o)}>
        <Repeat size={20} /> <span>{t('usual_title')}</span>
        <span className="chev">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="usual-body">
          <p className="muted small">{t('usual_sub')}</p>
          <div className="row">
            <input
              className="input"
              inputMode="tel"
              placeholder="(909) 555-0123"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && findUsual()}
            />
            <button className="btn btn-red" onClick={findUsual}>{t('find')}</button>
          </div>
          {usual === 'loading' && <p className="muted small">…</p>}
          {Array.isArray(usual) && usual.length === 0 && <p className="muted small">{t('no_usual')}</p>}
          {Array.isArray(usual) &&
            usual.map((o, i) => {
              const p = priceCart(o.cart, []);
              return (
                <div className="usual-item" key={i}>
                  <ul>
                    {p.lines.map((l, k) => (
                      <li key={k}>{l.type === 'meal' ? `${l.count}×` : `${l.lbs} lb`} {lineLabel(l, lang)}</li>
                    ))}
                  </ul>
                  <button className="btn btn-red btn-sm" onClick={() => loadUsual(o)}>{t('load')} · {money(p.subtotal)}</button>
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}
