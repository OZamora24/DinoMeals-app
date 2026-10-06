import Link from 'next/link';
import { useState } from 'react';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import { useLang } from '../lib/i18n';
import { PROTEINS, CARBS, VEGGIES, nameOf, prettyDate, money, PORTIONS } from '../lib/menu';
import { getSettings } from '../lib/db';
import { publicSettings } from '../lib/publicSettings';
import { Flame, Grain, Leaf, Box, Card, Truck, Arrow, Repeat } from '../components/Icons';

export async function getServerSideProps() {
  const s = await getSettings();
  return { props: { settings: publicSettings(s) } };
}

const TICKER = [
  'Smoked Tri-tip', 'Garlic Butter Shrimp', 'Cilantro Lime Rice', 'Southwest Smoked Chicken',
  'Korean BBQ Beef', 'Roasted Sweet Potatoes', 'Lemon Pepper Tilapia', 'Teriyaki Chicken', 'Brussels Sprouts',
];

export default function Home({ settings }) {
  const { lang, setLang, t } = useLang();
  const [mode, setMode] = useState('meal');
  const soldOut = new Set(settings.sold_out || []);
  const open = settings.ordering_open;

  return (
    <div className="page home">
      <SiteNav lang={lang} setLang={setLang} t={t} />

      {settings.announcement ? <div className="announce">{settings.announcement}</div> : null}

      {/* ---------- HERO ---------- */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-glow" />
          <div className="hero-claws">
            <span /><span /><span />
          </div>
        </div>
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="kicker"><Flame size={16} /> {t('hero_kicker')}</div>
            <h1 className="hero-title">
              <span>{t('hero_1')}</span>
              <span className="red">{t('hero_2')}</span>
            </h1>
            <p className="hero-sub">{t('hero_sub')}</p>
            <div className="hero-ctas">
              <Link href="/order" className="btn btn-red btn-lg">
                {t('build_meals')} <Arrow size={18} />
              </Link>
              <Link href="/order?tab=lb" className="btn btn-ghost btn-lg">{t('by_lb')}</Link>
            </div>
            <div className={`status-pill ${open ? 'open' : 'closed'}`}>
              <span className="dot" />
              {open ? (
                <>
                  {t('open_for')} <b>{prettyDate(settings.cook_date, lang)}</b>
                </>
              ) : (
                t('closed')
              )}
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-badge">
              <div className="hero-ring" />
              <div className="hero-badge-inner">
                <img src="/logo-mark.png" alt="" className="hb-mark" />
                <img src="/logo-word.png" alt="DinoMeals" className="hb-word" />
              </div>
            </div>
            <div className="portion-tags">
              <div className="ptag"><Flame size={16} /><b>{PORTIONS.protein}oz</b><span>{t('step_protein')}</span></div>
              <div className="ptag"><Grain size={16} /><b>{PORTIONS.carb}oz</b><span>{t('step_carb')}</span></div>
              <div className="ptag"><Leaf size={16} /><b>{PORTIONS.veg}oz</b><span>{t('step_veg')}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TICKER ---------- */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...TICKER, ...TICKER].map((x, i) => (
            <span key={i}>{x}<i>✦</i></span>
          ))}
        </div>
      </div>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="section">
        <h2 className="section-title">{t('how_title')}</h2>
        <div className="steps">
          {[
            { I: Box, tt: 'how_1_t', d: 'how_1_d' },
            { I: Card, tt: 'how_2_t', d: 'how_2_d' },
            { I: Truck, tt: 'how_3_t', d: 'how_3_d' },
          ].map(({ I, tt, d }, i) => (
            <div className="step" key={tt}>
              <div className="step-num">0{i + 1}</div>
              <div className="step-icon"><I size={26} /></div>
              <h3>{t(tt)}</h3>
              <p>{t(d)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- MENU ---------- */}
      <section className="section" id="menu">
        <div className="menu-head">
          <h2 className="section-title">{t('menu_title')}</h2>
          <div className="seg">
            <button className={mode === 'meal' ? 'on' : ''} onClick={() => setMode('meal')}>{t('meals_tab')}</button>
            <button className={mode === 'lb' ? 'on' : ''} onClick={() => setMode('lb')}>{t('lb_tab')}</button>
          </div>
        </div>
        <p className="menu-rule">{mode === 'meal' ? t('min_meals') : t('min_lbs')}</p>

        <div className="menu-grid">
          <div className="menu-col menu-proteins">
            <h3 className="menu-cat"><Flame size={18} /> {t('proteins')}</h3>
            <ul className="menu-list">
              {PROTEINS.filter((p) => mode === 'meal' || p.lb != null).map((p) => {
                const flavors = mode === 'lb' ? p.lbFlavors || p.flavors : p.flavors;
                return (
                  <li key={p.id} className={soldOut.has(p.id) ? 'is-out' : ''}>
                    <div className="mi-name">
                      {mode === 'lb' && p.lbName ? (lang === 'es' ? p.lbEs : p.lbName) : nameOf(p, lang)}
                      {p.smoked && <span className="smoke-tag">SMOKED</span>}
                      {flavors && (
                        <small>{flavors.filter((f) => f.extra).map((f) => (lang === 'es' ? f.es : f.name)).join(' / ')} +$1</small>
                      )}
                    </div>
                    <div className="mi-dots" />
                    <div className="mi-price">{soldOut.has(p.id) ? t('sold_out') : money(mode === 'meal' ? p.meal : p.lb)}</div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="menu-col">
            <h3 className="menu-cat"><Grain size={18} /> {t('carbs')}</h3>
            <ul className="menu-list">
              {CARBS.map((c) => (
                <li key={c.id} className={soldOut.has(c.id) ? 'is-out' : ''}>
                  <div className="mi-name">{nameOf(c, lang)}</div>
                  <div className="mi-dots" />
                  <div className="mi-price">
                    {mode === 'meal' ? (c.mealExtra ? `+${money(c.mealExtra)}` : '✓') : money(c.lb)}
                  </div>
                </li>
              ))}
            </ul>
            <h3 className="menu-cat"><Leaf size={18} /> {t('veggies')}</h3>
            <ul className="menu-list">
              {VEGGIES.filter((v) => mode === 'meal' || v.lb != null).map((v) => (
                <li key={v.id} className={soldOut.has(v.id) ? 'is-out' : ''}>
                  <div className="mi-name">{nameOf(v, lang)}</div>
                  <div className="mi-dots" />
                  <div className="mi-price">
                    {mode === 'meal' ? (v.mealExtra ? `+${money(v.mealExtra)}` : '✓') : money(v.lb)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="menu-cta">
          <Link href={mode === 'meal' ? '/order' : '/order?tab=lb'} className="btn btn-red btn-lg">
            {mode === 'meal' ? t('build_meals') : t('by_lb')} <Arrow size={18} />
          </Link>
        </div>
      </section>

      {/* ---------- REGULARS ---------- */}
      <section className="section">
        <Link href="/order#usual" className="regular-band">
          <div className="rb-icon"><Repeat size={28} /></div>
          <div>
            <h3>{t('regular_title')}</h3>
            <p>{t('regular_sub')}</p>
          </div>
          <Arrow size={22} />
        </Link>
      </section>

      <Footer t={t} settings={settings} />

      <div className="mobile-cta">
        <Link href="/order" className="btn btn-red btn-block">{t('build_meals')} <Arrow size={18} /></Link>
      </div>
    </div>
  );
}
