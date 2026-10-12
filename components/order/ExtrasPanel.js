import { PROTEINS, CARBS, VEGGIES, PORTIONS, EXTRA_MAX, nameOf, extraUnitPrice, money } from '../../lib/menu';
import { Flame, Grain, Leaf } from '../../components/Icons';
import { Stepper } from './Controls';

// Add-on portions (one container each) of a protein, carb or veggie.
export default function ExtrasPanel({ lang, t, soldOut, extras, setExtraQty }) {
  const qtyOf = (kind, item) => (extras.find((e) => e.kind === kind && e.item === item) || {}).qty || 0;
  const total = extras.reduce((a, e) => a + (Number(e.qty) || 0), 0);
  return (
    <details className="extras" open={total > 0}>
      <summary>
        {t('extras_title')}
        {total > 0 && <span className="tab-badge">{total}</span>}
      </summary>
      <p className="muted small">{t('extras_sub')}</p>
      {[
        ['protein', t('proteins'), PROTEINS, Flame],
        ['carb', t('carbs'), CARBS, Grain],
        ['veg', t('veggies'), VEGGIES, Leaf],
      ].map(([kind, title, list, I]) => (
        <div className="lb-group" key={kind}>
          <h3 className="menu-cat"><I size={18} /> {title} · {PORTIONS[kind]} oz</h3>
          {list.map((x) => {
            const unit = extraUnitPrice({ kind, item: x.id });
            if (unit == null) return null;
            const q = qtyOf(kind, x.id);
            const out = soldOut.has(x.id);
            return (
              <div className={`lb-row ${q > 0 ? 'on' : ''} ${out ? 'out' : ''}`} key={x.id}>
                <div className="lb-name">
                  {nameOf(x, lang)}
                  <span className="lb-price">{out ? t('sold_out') : `+${money(unit)} ${t('per_portion')}`}</span>
                </div>
                {!out && <Stepper value={q} onDec={() => setExtraQty(kind, x.id, q - 1)} onInc={() => setExtraQty(kind, x.id, q + 1)} incDisabled={q >= EXTRA_MAX} />}
              </div>
            );
          })}
        </div>
      ))}
    </details>
  );
}
