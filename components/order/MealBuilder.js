import { PROTEINS, CARBS, VEGGIES, ALLERGEN_LABELS, PORTIONS, OZ_CHOICES, ozUpcharge, MEAL_PLANS, NONE, byId, nameOf, proteinLabel, money } from '../../lib/menu';
import { Flame, Grain, Leaf, Plus, X, Check } from '../../components/Icons';
import { Stepper } from './Controls';
import { useState } from 'react';
import { createPortal } from 'react-dom';

export default function MealBuilder({
  lang, t, soldOut, builderRef, editIdx, setEditIdx,
  bProtein, setBProtein, bFlavor, setBFlavor, bCarb, setBCarb, bVeg, setBVeg, bOz, setBOz,
  bP, builderUnit, builderMacros, builderAllergens, pickProtein, addSet,
  plan, setPlanId, planQty, setPlanQty, addN, mealCount, anyQty, setAnyQty, goCustom,
}) {
  const [noSides, setNoSides] = useState(false);
  const full = editIdx == null && addN <= 0;
  const ozRow = (kind, item) => {
    if (!item || item === NONE) return null;
    const cur = Number(bOz[kind]) || PORTIONS[kind];
    return (
      <div className="oz-row">
        <span className="muted small">{t('portion_size')}</span>
        <div className="chips">
          {OZ_CHOICES[kind].map((oz) => {
            const up = oz === PORTIONS[kind] ? 0 : ozUpcharge({ protein: bProtein, carb: bCarb, veg: bVeg, oz: { [kind]: oz } });
            return (
              <button key={oz} className={`chip chip-oz ${cur === oz ? 'on' : ''}`} onClick={() => setBOz((o) => { const n = { ...o }; if (oz === PORTIONS[kind]) delete n[kind]; else n[kind] = oz; return n; })}>
                {oz}oz
                {up ? <em>+{money(up)}</em> : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  const picking = editIdx == null && plan.meals && addN > 0 && addN < plan.setSize;
  return (
    <section className="builder" ref={builderRef}>
      <div className="builder-head">
        <span>{editIdx != null ? t('update_set') : t('every_meal_oz', PORTIONS.protein, PORTIONS.carb, PORTIONS.veg)}</span>
        <label className="plan-pick">
          <span className="muted small">{t('plan_label')}</span>
          <select className="input plan-select" value={plan.id} onChange={(e) => setPlanId(e.target.value)}>
            {MEAL_PLANS.map((p) => (
              <option key={p.id} value={p.id}>{t(`plan_${p.id}`)}</option>
            ))}
          </select>
        </label>
        {plan.meals && (
          <span className="plan-pick">
            <span className="muted small">{t('plan_qty')}</span>
            <Stepper value={planQty} onDec={() => setPlanQty((q) => Math.max(1, q - 1))} onInc={() => setPlanQty((q) => Math.min(5, q + 1))} incDisabled={planQty >= 5} />
          </span>
        )}
      </div>

      <div className="b-step">
        <h3><span className="b-num">1</span><Flame size={18} /> {t('step_protein')}</h3>
        <div className="protein-grid">
          {PROTEINS.map((p) => {
            const out = soldOut.has(p.id);
            return (
              <button
                key={p.id}
                disabled={out}
                className={`pcard ${bProtein === p.id ? 'on' : ''} ${out ? 'out' : ''}`}
                onClick={() => pickProtein(p.id)}
              >
                {p.smoked && <span className="smoke-tag">SMOKED</span>}
                <span className="pcard-name">{nameOf(p, lang)}</span>
                <span className="pcard-price">{out ? t('sold_out') : money(p.meal)}</span>
                {bProtein === p.id && <span className="pcard-check"><Check size={14} /></span>}
              </button>
            );
          })}
        </div>
        {bP?.flavors && (
          <div className="flavor-row">
            <span className="muted small">{t('flavor')}:</span>
            {bP.flavors.filter((f) => f.id !== 'plain').map((f) => (
              <button key={f.id} className={`chip ${bFlavor === f.id ? 'on' : ''}`} onClick={() => setBFlavor(bFlavor === f.id ? 'plain' : f.id)}>
                {lang === 'es' ? f.es : f.name}
                {f.extra ? <em>+${f.extra}</em> : null}
              </button>
            ))}
          </div>
        )}
        {ozRow('protein', bProtein)}
      </div>

      <div className="b-step">
        <h3><span className="b-num">2</span><Grain size={18} /> {t('step_carb')}</h3>
        <div className="chips">
          {CARBS.map((c) => (
            <button key={c.id} disabled={soldOut.has(c.id)} className={`chip ${bCarb === c.id ? 'on' : ''}`} onClick={() => setBCarb(c.id)}>
              {nameOf(c, lang)}
              {soldOut.has(c.id) ? <em>{t('sold_out')}</em> : c.mealExtra ? <em>+${c.mealExtra}</em> : null}
            </button>
          ))}
          <button className={`chip chip-none ${bCarb === NONE ? 'on' : ''} ${bVeg === NONE ? 'blocked' : ''}`} onClick={() => (bVeg === NONE ? setNoSides(true) : setBCarb(NONE))}>
            {t('na')}
          </button>
        </div>
        {ozRow('carb', bCarb)}
      </div>

      <div className="b-step">
        <h3><span className="b-num">3</span><Leaf size={18} /> {t('step_veg')}</h3>
        <div className="chips">
          {VEGGIES.map((v) => (
            <button key={v.id} disabled={soldOut.has(v.id)} className={`chip ${bVeg === v.id ? 'on' : ''}`} onClick={() => setBVeg(v.id)}>
              {nameOf(v, lang)}
              {soldOut.has(v.id) ? <em>{t('sold_out')}</em> : v.mealExtra ? <em>+${v.mealExtra}</em> : null}
            </button>
          ))}
          <button className={`chip chip-none ${bVeg === NONE ? 'on' : ''} ${bCarb === NONE ? 'blocked' : ''}`} onClick={() => (bCarb === NONE ? setNoSides(true) : setBVeg(NONE))}>
            {t('na')}
          </button>
        </div>
        {ozRow('veg', bVeg)}
        <p className="muted small side-rule">{t('one_side')}</p>
      </div>

      {(picking || (!plan.meals && editIdx == null)) && (
        <div className="plan-hint">
          <span>{picking ? t('pick_hint', addN) : t('any_hint')}</span>
          {!plan.meals && editIdx == null && (
            <span className="qty-pick">
              <span className="muted small">{t('qty')}</span>
              <Stepper value={anyQty} onDec={() => setAnyQty((q) => Math.max(1, q - 1))} onInc={() => setAnyQty((q) => Math.min(50, q + 1))} />
            </span>
          )}
        </div>
      )}

      <div className={`builder-foot ${builderUnit ? 'ready' : ''}`}>
        <div className="bf-info">
          {builderUnit ? (
            <>
              <div className="bf-combo">{[proteinLabel(bProtein, bFlavor, lang), nameOf(byId(CARBS, bCarb), lang), nameOf(byId(VEGGIES, bVeg), lang)].filter(Boolean).join(' + ')}</div>
              <div className="bf-meta">
                <b>{money(builderUnit)}</b> / {t('meal')}
                {builderMacros ? (
                  <span className="macros">{Math.round(builderMacros.cal)} cal · {Math.round(builderMacros.p)}P · {Math.round(builderMacros.c)}C · {Math.round(builderMacros.f)}F</span>
                ) : null}
              </div>
              {builderAllergens.length > 0 && (
                <div className="allergens">{t('contains')}: {builderAllergens.map((a) => ALLERGEN_LABELS[a]?.[lang] || a).join(', ')} · <span className="muted">{t('kitchen_short')}</span></div>
              )}
            </>
          ) : (
            <div className="muted">
              {[!bProtein && t('step_protein'), !bCarb && t('step_carb'), !bVeg && t('step_veg')].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div className="bf-actions">
          {editIdx != null && (
            <button className="btn btn-ghost" onClick={() => { setEditIdx(null); setBProtein(null); setBCarb(null); setBVeg(null); setBOz({}); }}>
              <X size={16} />
            </button>
          )}
          <button className="btn btn-red" disabled={!builderUnit || full} onClick={addSet}>
            {editIdx != null ? t('update_set') : full ? <><Check size={18} /> {t('box_full')}</> : <><Plus size={18} /> {t('add_n', addN)}{builderUnit ? ` · ${money(builderUnit * addN)}` : ''}</>}
          </button>
        </div>
      </div>
      {noSides && typeof document !== 'undefined' && createPortal(
        <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && setNoSides(false)}>
          <div className="sheet pop-card" role="dialog" aria-modal="true">
            <div className="pop-body">
              <h2>{t('nosides_title')}</h2>
              <p>{t('nosides_body')}</p>
            </div>
            <div className="pop-actions">
              <button className="btn btn-ghost" onClick={() => setNoSides(false)}>{t('nosides_keep')}</button>
              <button className="btn btn-red" onClick={() => { setNoSides(false); goCustom(); }}>{t('nosides_go')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
