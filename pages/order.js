import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import { useLang } from '../lib/i18n';
import {
  PROTEINS, CARBS, VEGGIES, DIET_FLAGS, ALLERGEN_LABELS, MEAL_SET_SIZE, MIN_MEALS, MIN_LBS, PORTIONS,
  byId, nameOf, flavorOf, proteinLabel, mealUnitPrice, lbUnitPrice, priceCart, lineLabel,
  allergensFor, prettyDate, money,
} from '../lib/menu';
import { getSettings } from '../lib/db';
import { publicSettings } from '../lib/publicSettings';
import { isValidSession } from '../lib/adminSession';
import { Flame, Grain, Leaf, Plus, Minus, X, Check, Repeat, Truck, Pin, Card, Cash, Bolt, Arrow } from '../components/Icons';

export async function getServerSideProps({ req, query }) {
  const s = await getSettings();
  const adminMode = query.admin === '1' && isValidSession(req);
  return { props: { settings: publicSettings(s), adminMode } };
}

const DRAFT_KEY = 'dinoDraft';
const emptyInfo = {
  name: '', phone: '', email: '', fulfillment: 'pickup', address: '', zip: '', delivery_notes: '',
  payment_method: '', diet: [], allergy_notes: '', notes: '',
};

function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function sumMacros(parts) {
  if (parts.some((p) => !p || p.cal == null || p.cal === '')) return null;
  return parts.reduce(
    (a, p) => ({ cal: a.cal + +p.cal, p: a.p + +(p.p || 0), c: a.c + +(p.c || 0), f: a.f + +(p.f || 0) }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );
}

export default function OrderPage({ settings, adminMode }) {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const soldOut = useMemo(() => new Set(settings.sold_out || []), [settings.sold_out]);
  const macros = settings.macros || {};

  const [tab, setTab] = useState('meals');
  const [meals, setMeals] = useState([]); // [{protein, flavor, carb, veg, sets}]
  const [lbs, setLbs] = useState([]); // [{kind, item, flavor, lbs}]
  const [custom, setCustom] = useState('');
  const [info, setInfo] = useState(emptyInfo);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // builder
  const [bProtein, setBProtein] = useState(null);
  const [bFlavor, setBFlavor] = useState('plain');
  const [bCarb, setBCarb] = useState(null);
  const [bVeg, setBVeg] = useState(null);
  const [editIdx, setEditIdx] = useState(null);
  const [flash, setFlash] = useState(null);

  // checkout
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  // admin extras
  const [adm, setAdm] = useState({ source: 'dm', paid: false, cook_date: settings.cook_date });

  // usual
  const [usualPhone, setUsualPhone] = useState('');
  const [usual, setUsual] = useState(null);
  const [usualOpen, setUsualOpen] = useState(false);

  const builderRef = useRef(null);

  useEffect(() => {
    if (router.query.tab === 'lb') setTab('lb');
    else if (router.query.tab === 'custom') setTab('custom');
    if (typeof window !== 'undefined' && window.location.hash === '#usual') setUsualOpen(true);
  }, [router.query.tab]);

  // ---- draft persistence (customers only) ----
  useEffect(() => {
    if (adminMode) return setDraftLoaded(true);
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d) {
        if (Array.isArray(d.meals)) setMeals(d.meals);
        if (Array.isArray(d.lbs)) setLbs(d.lbs);
        if (typeof d.custom === 'string') setCustom(d.custom);
        if (d.info) setInfo({ ...emptyInfo, ...d.info });
        if (d.info?.phone) setUsualPhone(d.info.phone);
      }
    } catch {}
    setDraftLoaded(true);
  }, [adminMode]);
  useEffect(() => {
    if (!draftLoaded || adminMode) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ meals, lbs, custom, info }));
    } catch {}
  }, [meals, lbs, custom, info, draftLoaded, adminMode]);

  // ---- pricing ----
  const cart = { meals, lbs };
  const priced = priceCart(cart, []);
  const mealCount = meals.reduce((a, m) => a + m.sets * MEAL_SET_SIZE, 0);
  const lbCount = lbs.reduce((a, l) => a + (Number(l.lbs) || 0), 0);
  const hasItems = mealCount > 0 || lbCount > 0;
  const fee = info.fulfillment === 'delivery' && hasItems ? Number(settings.delivery_fee) || 0 : 0;
  const subtotal = hasItems ? Math.round(priced.subtotal * 100) / 100 : 0;
  const total = hasItems ? subtotal + fee : null;
  const mealsOk = mealCount === 0 || mealCount >= MIN_MEALS;
  const lbsOk = lbCount === 0 || lbCount >= MIN_LBS;
  const canCheckout = (hasItems && mealsOk && lbsOk) || (!hasItems && custom.trim().length > 3);

  // ---- builder helpers ----
  const bP = byId(PROTEINS, bProtein);
  const builderUnit = bProtein && bCarb && bVeg ? mealUnitPrice({ protein: bProtein, flavor: bFlavor, carb: bCarb, veg: bVeg }) : null;
  const builderMacros = bProtein && bCarb && bVeg ? sumMacros([macros[bProtein], macros[bCarb], macros[bVeg]]) : null;
  const builderAllergens = allergensFor(
    [bProtein, bProtein && `${bProtein}:${bFlavor}`, bCarb, bVeg].filter(Boolean),
    settings.allergens
  );

  function pickProtein(id) {
    setBProtein(id);
    const p = byId(PROTEINS, id);
    setBFlavor(p.flavors ? p.flavors[0].id : 'plain');
  }

  function addSet() {
    if (!builderUnit) return;
    const combo = { protein: bProtein, flavor: bP.flavors ? bFlavor : undefined, carb: bCarb, veg: bVeg };
    const same = (m) => m.protein === combo.protein && (m.flavor || '') === (combo.flavor || '') && m.carb === combo.carb && m.veg === combo.veg;
    setMeals((prev) => {
      if (editIdx != null) {
        const next = prev.slice();
        next[editIdx] = { ...combo, sets: prev[editIdx].sets };
        return next;
      }
      const i = prev.findIndex(same);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = { ...next[i], sets: next[i].sets + 1 };
        return next;
      }
      return [...prev, { ...combo, sets: 1 }];
    });
    setFlash(editIdx != null ? 'updated' : 'added');
    setTimeout(() => setFlash(null), 1300);
    setEditIdx(null);
    setBProtein(null);
    setBCarb(null);
    setBVeg(null);
  }

  function editSet(i) {
    const m = meals[i];
    setTab('meals');
    setEditIdx(i);
    setBProtein(m.protein);
    setBFlavor(m.flavor || 'plain');
    setBCarb(m.carb);
    setBVeg(m.veg);
    builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const setSets = (i, n) =>
    setMeals((prev) => (n <= 0 ? prev.filter((_, j) => j !== i) : prev.map((m, j) => (j === i ? { ...m, sets: n } : m))));

  function lbQty(kind, item, flavor) {
    const l = lbs.find((x) => x.kind === kind && x.item === item && (x.flavor || '') === (flavor || ''));
    return l ? l.lbs : 0;
  }
  function setLb(kind, item, flavor, qty) {
    setLbs((prev) => {
      const rest = prev.filter((x) => !(x.kind === kind && x.item === item && (x.flavor || '') === (flavor || '')));
      return qty > 0 ? [...rest, { kind, item, flavor: flavor || undefined, lbs: qty }] : rest;
    });
  }
  const [lbFlavor, setLbFlavor] = useState({});

  // ---- usual ----
  async function findUsual() {
    const d = usualPhone.replace(/\D/g, '');
    if (d.length !== 10) return;
    setUsual('loading');
    try {
      const r = await fetch(`/api/my-orders?phone=${d}`);
      const j = await r.json();
      setUsual(j.orders || []);
    } catch {
      setUsual([]);
    }
  }
  function loadUsual(o) {
    setMeals(o.cart.meals || []);
    setLbs(o.cart.lbs || []);
    setInfo((i) => ({ ...i, phone: usualPhone, fulfillment: o.fulfillment || i.fulfillment, payment_method: o.payment_method || i.payment_method }));
    setTab(o.cart.meals?.length ? 'meals' : 'lb');
    setUsualOpen(false);
    setFlash('loaded');
    setTimeout(() => setFlash(null), 1500);
  }

  // ---- submit ----
  async function place() {
    setErr('');
    setBusy(true);
    try {
      const body = {
        cart,
        custom_request: custom,
        ...info,
        total,
        lang,
        ...(adminMode ? { as_admin: true, source: adm.source, paid: adm.paid, cook_date: adm.cook_date } : {}),
      };
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) {
        setErr(t(`err_${j.error}`) !== `err_${j.error}` ? t(`err_${j.error}`) : t('err_generic'));
        return;
      }
      setDone({ ...j.order, name: info.name });
      setSheet(false);
      if (!adminMode) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ meals: [], lbs: [], custom: '', info: { ...info, notes: '', allergy_notes: info.allergy_notes } }));
        } catch {}
      }
      window.scrollTo({ top: 0 });
    } catch {
      setErr(t('err_generic'));
    } finally {
      setBusy(false);
    }
  }

  function resetAll() {
    setMeals([]);
    setLbs([]);
    setCustom('');
    setDone(null);
    setInfo((i) => ({ ...(adminMode ? emptyInfo : { ...i, notes: '' }) }));
  }

  // =================== DONE ===================
  if (done) {
    const quote = done.total == null;
    return (
      <div className="page order-page">
        <SiteNav lang={lang} setLang={setLang} t={t} cta={false} />
        <main className="done">
          <div className="done-check"><Check size={44} /></div>
          <h1 className="display">{t('done_title')}</h1>
          <p className="done-no">{t('done_sub')} <b>#{done.order_no}</b> · {t('cook_day')} {prettyDate(done.cook_date, lang)}</p>
          {quote ? (
            <div className="pay-card"><p>{t('quote_done')}</p></div>
          ) : (
            <div className="pay-card">
              <div className="pay-total">{money(done.total)}</div>
              {!adminMode && (
                <>
                  <h3>{t('pay_now')}</h3>
                  {done.payment_method === 'zelle' && (
                    <div className="pay-line"><Bolt size={18} /><div>{settings.zelle_info ? <>{t('pay_zelle')} <b>{settings.zelle_info}</b><br /><span className="muted">{t('memo')}: <b>#{done.order_no}</b></span></> : t('zelle_tbd')}</div></div>
                  )}
                  {done.payment_method === 'card' &&
                    (settings.card_link ? (
                      <a className="btn btn-red btn-block" href={settings.card_link} target="_blank" rel="noreferrer">
                        <Card size={18} /> {t('pay_card')} {money(done.total)}
                      </a>
                    ) : (
                      <div className="pay-line"><Card size={18} /><div>{t('card_tbd')}</div></div>
                    ))}
                  {done.payment_method === 'cash' && <div className="pay-line"><Cash size={18} /><div>{settings.cash_info}</div></div>}
                  <p className="muted small">{t('pay_after')}</p>
                </>
              )}
            </div>
          )}
          <div className="done-actions">
            {adminMode ? (
              <>
                <button className="btn btn-red" onClick={resetAll}>+ Enter another order</button>
                <Link href="/admin" className="btn btn-ghost">Back to dashboard</Link>
              </>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={resetAll}>{t('new_order')}</button>
                <Link href="/" className="btn btn-ghost">DinoMeals</Link>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  const closed = !settings.ordering_open && !adminMode;

  // =================== BUILDER ===================
  return (
    <div className="page order-page">
      <SiteNav lang={lang} setLang={setLang} t={t} cta={false} />

      {adminMode && (
        <div className="admin-strip">
          <b>Kitchen mode:</b> entering an order for a customer (DM / text / call). <Link href="/admin">← Dashboard</Link>
        </div>
      )}

      <header className="order-head">
        <h1 className="display">{tab === 'lb' ? t('by_lb') : tab === 'custom' ? t('custom_title') : t('build_meals')}</h1>
        <div className={`status-pill ${closed ? 'closed' : 'open'}`}>
          <span className="dot" />
          {closed ? t('closed') : <>{t('cook_day')}: <b>{prettyDate(settings.cook_date, lang)}</b></>}
        </div>
      </header>

      {settings.announcement ? <div className="announce">{settings.announcement}</div> : null}

      {!adminMode && (
        <section className={`usual ${usualOpen ? 'open' : ''}`} id="usual">
          <button className="usual-toggle" onClick={() => setUsualOpen((o) => !o)}>
            <Repeat size={20} /> <span>{t('usual_title')}</span>
            <span className="chev">{usualOpen ? '−' : '+'}</span>
          </button>
          {usualOpen && (
            <div className="usual-body">
              <p className="muted small">{t('usual_sub')}</p>
              <div className="row">
                <input
                  className="input"
                  inputMode="tel"
                  placeholder="(909) 555-0123"
                  value={usualPhone}
                  onChange={(e) => setUsualPhone(formatPhone(e.target.value))}
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
      )}

      <nav className="tabs" role="tablist">
        {[
          ['meals', t('meals_tab'), mealCount ? `${mealCount}` : null],
          ['lb', t('lb_tab'), lbCount ? `${lbCount} lb` : null],
          ['custom', t('custom_tab'), custom.trim() ? '✓' : null],
        ].map(([k, label, badge]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
            {badge && <span className="tab-badge">{badge}</span>}
          </button>
        ))}
      </nav>

      <main className="order-main">
        {/* ---------------- MEALS ---------------- */}
        {tab === 'meals' && (
          <>
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
          </>
        )}

        {/* ---------------- BY THE LB ---------------- */}
        {tab === 'lb' && (
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
        )}

        {/* ---------------- CUSTOM ---------------- */}
        {tab === 'custom' && (
          <section className="custom">
            <p>{t('custom_sub')}</p>
            <textarea className="input" rows={6} placeholder={t('custom_ph')} value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={1500} />
          </section>
        )}
      </main>

      {flash && (
        <div className="toast">
          <Check size={16} /> {flash === 'loaded' ? t('load') : flash === 'updated' ? t('update_set') : t('add_set_short')}
        </div>
      )}

      {/* ---------------- STICKY BAR ---------------- */}
      <div className="cart-bar">
        <div className="cb-info">
          <div className="cb-count">
            {mealCount > 0 && `${mealCount} ${t('meals')}`}
            {mealCount > 0 && lbCount > 0 && ' · '}
            {lbCount > 0 && `${lbCount} lb`}
            {!hasItems && (custom.trim() ? t('custom_tab') : t('your_box'))}
          </div>
          <div className="cb-total">{hasItems ? money(subtotal) : custom.trim() ? t('quote') : '$0'}</div>
        </div>
        <button className="btn btn-red btn-lg" disabled={!canCheckout || closed} onClick={() => { setErr(''); setSheet(true); }}>
          {t('checkout')} <Arrow size={18} />
        </button>
      </div>

      {/* ---------------- CHECKOUT SHEET ---------------- */}
      {sheet && (
        <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="sheet-head">
              <button className="btn btn-ghost btn-sm" onClick={() => setSheet(false)}>← {t('back')}</button>
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
      )}
    </div>
  );
}

function Stepper({ value, onDec, onInc, unit }) {
  return (
    <div className="stepper">
      <button aria-label="less" onClick={onDec} disabled={value <= 0}><Minus size={16} /></button>
      <span>{value}{unit ? <small> {unit}</small> : null}</span>
      <button aria-label="more" onClick={onInc}><Plus size={16} /></button>
    </div>
  );
}

function Meter({ value, min, step = 1, label, unit }) {
  const slots = Math.max(min, Math.ceil(value / step) * step);
  const n = Math.round(slots / step);
  const filled = Math.floor(value / step);
  return (
    <div className={`meter ${value >= min ? 'ok' : ''}`}>
      <div className="meter-bars" style={{ gridTemplateColumns: `repeat(${Math.min(n, 12)}, 1fr)` }}>
        {Array.from({ length: Math.min(n, 12) }).map((_, i) => (
          <span key={i} className={i < filled ? 'f' : ''} />
        ))}
      </div>
      <div className="meter-label">{label}</div>
    </div>
  );
}
