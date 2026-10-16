import { CARBS, VEGGIES, ALLERGEN_LABELS, MIN_MEALS, mealLineCount, byId, nameOf, proteinLabel, mealUnitPrice, ozTag, allergensFor, money } from '../../lib/menu';
import { Stepper, Meter } from './Controls';

export default function MealBox({ lang, t, settings, meals, mealCount, plan, remaining, editSet, incMeal, decMeal }) {
  const target = plan.meals || MIN_MEALS;
  const label = plan.meals
    ? remaining > 0 ? t('plan_need', remaining, plan.meals) : remaining < 0 ? t('plan_over', -remaining) : t('plan_ok')
    : mealCount >= MIN_MEALS ? t('min_ok') : t('need_more', MIN_MEALS - mealCount);
  return (
    <section className="box">
      <div className="box-head">
        <h2>{t('your_box')}</h2>
        <span className="box-count">{mealCount} {t('meals')}</span>
      </div>
      <Meter value={mealCount} min={target} step={1} label={label} over={plan.meals ? remaining < 0 : false} />
      {meals.length === 0 ? (
        <p className="muted empty">{t('empty_box')}</p>
      ) : (
        <ul className="box-list">
          {meals.map((m, i) => {
            const unit = mealUnitPrice(m);
            const n = mealLineCount(m);
            const al = allergensFor([m.protein, `${m.protein}:${m.flavor}`, m.carb, m.veg], settings.allergens);
            return (
              <li key={i} className="box-item">
                <div className="bi-main">
                  <div className="bi-title">{proteinLabel(m.protein, m.flavor, lang)}</div>
                  <div className="bi-sub">{nameOf(byId(CARBS, m.carb), lang) || t('no_carb')} · {nameOf(byId(VEGGIES, m.veg), lang) || t('no_veg')}</div>
                  {ozTag(m, lang) && <div className="bi-sub">{ozTag(m, lang)}</div>}
                  <div className="bi-meta">
                    {money(unit)} {t('each')}
                    {al.length > 0 && <span className="al-dot" title={al.join(', ')}>⚠ {al.map((a) => ALLERGEN_LABELS[a]?.[lang] || a).join(', ')}</span>}
                  </div>
                  <button className="link" onClick={() => editSet(i)}>{t('edit')}</button>
                </div>
                <div className="bi-side">
                  <Stepper value={n} onDec={() => decMeal(i)} onInc={() => incMeal(i)} incDisabled={plan.meals ? remaining <= 0 : false} />
                  <div className="bi-total">{money(unit * n)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
