import { PROTEINS, CARBS, VEGGIES, ALLERGEN_LABELS, PORTIONS, byId, nameOf, proteinLabel, money } from '../../lib/menu';
import { Flame, Grain, Leaf, Plus, X, Check } from '../../components/Icons';

export default function MealBuilder({
  lang, t, soldOut, builderRef, editIdx, setEditIdx,
  bProtein, setBProtein, bFlavor, setBFlavor, bCarb, setBCarb, bVeg, setBVeg,
  bP, builderUnit, builderMacros, builderAllergens, pickProtein, addSet,
}) {
  return (
    <section className="builder" ref={builderRef}>
      <div className="builder-head">
        <span>{editIdx != null ? t('update_set') : `${t('every_meal')}: ${PORTIONS.protein}oz · ${PORTIONS.carb}oz · ${PORTIONS.veg}oz`}</span>
        <span className="muted small">{t('min_meals')}</span>
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
            {bP.flavors.map((f) => (
              <button key={f.id} className={`chip ${bFlavor === f.id ? 'on' : ''}`} onClick={() => setBFlavor(f.id)}>
                {lang === 'es' ? f.es : f.name}
                {f.extra ? <em>+${f.extra}</em> : null}
              </button>
            ))}
          </div>
        )}
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
        </div>
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
        </div>
      </div>

      <div className={`builder-foot ${builderUnit ? 'ready' : ''}`}>
        <div className="bf-info">
          {builderUnit ? (
            <>
              <div className="bf-combo">{proteinLabel(bProtein, bFlavor, lang)} + {nameOf(byId(CARBS, bCarb), lang)} + {nameOf(byId(VEGGIES, bVeg), lang)}</div>
              <div className="bf-meta">
                <b>{money(builderUnit)}</b> / {t('meal')}
                {builderMacros ? (
                  <span className="macros">{Math.round(builderMacros.cal)} cal · {Math.round(builderMacros.p)}P · {Math.round(builderMacros.c)}C · {Math.round(builderMacros.f)}F</span>
                ) : null}
              </div>
              {builderAllergens.length > 0 && (
                <div className="allergens">{t('contains')}: {builderAllergens.map((a) => ALLERGEN_LABELS[a]?.[lang] || a).join(', ')}</div>
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
            <button className="btn btn-ghost" onClick={() => { setEditIdx(null); setBProtein(null); setBCarb(null); setBVeg(null); }}>
              <X size={16} />
            </button>
          )}
          <button className="btn btn-red" disabled={!builderUnit} onClick={addSet}>
            {editIdx != null ? t('update_set') : <><Plus size={18} /> {t('add_set')}{builderUnit ? ` · ${money(builderUnit * 4)}` : ''}</>}
          </button>
        </div>
      </div>
    </section>
  );
}
