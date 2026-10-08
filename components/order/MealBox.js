import { CARBS, VEGGIES, ALLERGEN_LABELS, MIN_MEALS, byId, nameOf, proteinLabel, mealUnitPrice, allergensFor, money } from '../../lib/menu';
import { Stepper, Meter } from './Controls';

export default function MealBox({ lang, t, settings, meals, mealCount, editSet, setSets }) {
  return (
    <section className="box">
      <div className="box-head">
        <h2>{t('your_box')}</h2>
        <span className="box-count">{mealCount} {t('meals')}</span>
      </div>
      <Meter value={mealCount} min={MIN_MEALS} step={1} label={mealCount >= MIN_MEALS ? t('min_ok') : t('need_more', MIN_MEALS - mealCount)} />
      {meals.length === 0 ? (
        <p className="muted empty">{t('empty_box')}</p>
      ) : (
        <ul className="box-list">
          {meals.map((m, i) => {
            const unit = mealUnitPrice(m);
            const al = allergensFor([m.protein, `${m.protein}:${m.flavor}`, m.carb, m.veg], settings.allergens);
            return (
              <li key={i} className="box-item">
                <div className="bi-main">
                  <div className="bi-title">{proteinLabel(m.protein, m.flavor, lang)}</div>
                  <div className="bi-sub">{nameOf(byId(CARBS, m.carb), lang)} · {nameOf(byId(VEGGIES, m.veg), lang)}</div>
                  <div className="bi-meta">
                    {money(unit)} {t('each')}
                    {al.length > 0 && <span className="al-dot" title={al.join(', ')}>⚠ {al.map((a) => ALLERGEN_LABELS[a]?.[lang] || a).join(', ')}</span>}
                  </div>
                  <button className="link" onClick={() => editSet(i)}>{t('edit')}</button>
                </div>
                <div className="bi-side">
                  <Stepper value={m.sets * 4} onDec={() => setSets(i, m.sets - 1)} onInc={() => setSets(i, m.sets + 1)} />
                  <div className="bi-total">{money(unit * m.sets * 4)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
