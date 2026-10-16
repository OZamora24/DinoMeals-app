import { CARBS, VEGGIES, ALLERGEN_LABELS, MIN_MEALS, mealLineCount, byId, nameOf, proteinLabel, mealUnitPrice, ozTag, allergensFor, money } from '../../lib/menu';
import { Stepper, Meter } from './Controls';
import { mealMacros } from '../../lib/orderForm';

export default function MealBox({ lang, t, settings, meals, mealCount, plan, remaining, editSet, incMeal, decMeal }) {
  const target = plan.meals || MIN_MEALS;
  const label = plan.meals
    ? remaining > 0 ? t('plan_need', remaining, plan.meals) : remaining < 0 ? t('plan_over', -remaining) : t('plan_ok')
    : mealCount >= MIN_MEALS ? t('min_ok') : t('need_more', MIN_MEALS - mealCount);
  // Calories per line (one meal x how many) and for the whole box, from the saved macros.
  const cals = meals.map((m) => {
    const mm = mealMacros(m, settings.macros || {});
    return mm ? { each: Math.round(mm.cal), total: Math.round(mm.cal * mealLineCount(m)) } : null;
  });
  const boxCal = cals.reduce((a, c) => a + (c ? c.total : 0), 0);
  const someMissing = cals.some((c) => !c);
  return (
    <section className="box">
      <div className="box-head">
        <h2>{t('your_box')}</h2>
        <span className="box-count">{mealCount} {t('meals')}</span>
      </div>
      {boxCal > 0 && (
        <div className="box-cal">
          <span>{t('total_cal')}</span>
          <b>{boxCal.toLocaleString()}{someMissing ? '+' : ''} cal</b>
        </div>
      )}
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
                    {cals[i] && <span className="bi-cal">{cals[i].each} cal {t('each')} · {cals[i].total.toLocaleString()} cal</span>}
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
