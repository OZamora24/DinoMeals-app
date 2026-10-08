import { PROTEINS, CARBS, VEGGIES, MIN_LBS, nameOf, proteinLabel, lbUnitPrice, money } from '../../lib/menu';
import { Flame, Grain, Leaf } from '../../components/Icons';
import { Stepper, Meter } from './Controls';

export default function LbMenu({ lang, t, soldOut, lbs, lbCount, lbFlavor, setLbFlavor, lbQty, setLb }) {
  return (
    <section className="lb">
      <p className="muted">{t('lb_hint')} <b>{t('min_lbs')}</b></p>
      <Meter value={lbCount} min={MIN_LBS} step={1} unit="lb" label={lbCount >= MIN_LBS ? t('min_ok') : t('need_more_lb', MIN_LBS - lbCount)} />
      {[
        ['protein', t('proteins'), PROTEINS.filter((p) => p.lb != null), Flame],
        ['carb', t('carbs'), CARBS, Grain],
        ['veg', t('veggies'), VEGGIES.filter((v) => v.lb != null), Leaf],
      ].map(([kind, title, list, I]) => (
        <div className="lb-group" key={kind}>
          <h3 className="menu-cat"><I size={18} /> {title}</h3>
          {list.map((x) => {
            const flavors = kind === 'protein' ? x.lbFlavors || x.flavors : null;
            const fl = flavors ? lbFlavor[x.id] || flavors[0].id : undefined;
            const unit = lbUnitPrice({ kind, item: x.id, flavor: fl });
            const q = lbQty(kind, x.id, fl);
            const out = soldOut.has(x.id);
            // other flavors of the same item already in the cart
            const others = flavors ? lbs.filter((l) => l.item === x.id && l.flavor !== fl) : [];
            return (
              <div className={`lb-row ${q > 0 ? 'on' : ''} ${out ? 'out' : ''}`} key={x.id}>
                <div className="lb-name">
                  {kind === 'protein' && x.lbName ? (lang === 'es' ? x.lbEs : x.lbName) : nameOf(x, lang)}
                  <span className="lb-price">{out ? t('sold_out') : `${money(unit)} / lb`}</span>
                  {flavors && (
                    <div className="flavor-row tight">
                      {flavors.map((f) => (
                        <button key={f.id} className={`chip sm ${fl === f.id ? 'on' : ''}`} onClick={() => setLbFlavor((s) => ({ ...s, [x.id]: f.id }))}>
                          {lang === 'es' ? f.es : f.name}{f.extra ? <em>+${f.extra}</em> : null}
                        </button>
                      ))}
                    </div>
                  )}
                  {others.length > 0 && (
                    <div className="muted small">
                      {others.map((o) => `${o.lbs} lb ${proteinLabel(x.id, o.flavor, lang, true)}`).join(' · ')}
                    </div>
                  )}
                </div>
                {!out && (
                  <Stepper value={q} unit="lb" onDec={() => setLb(kind, x.id, fl, Math.max(0, q - 1))} onInc={() => setLb(kind, x.id, fl, q + 1)} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
