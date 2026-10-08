import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import { useLang } from '../lib/i18n';
import {
  PROTEINS, MEAL_SET_SIZE, MIN_MEALS, MIN_LBS, byId, mealUnitPrice, priceCart, allergensFor, prettyDate, money,
} from '../lib/menu';
import { getSettings } from '../lib/db';
import { publicSettings } from '../lib/publicSettings';
import { isValidSession } from '../lib/adminSession';
import { Check, Arrow } from '../components/Icons';
import { sumMacros, emptyInfo, DRAFT_KEY } from '../lib/orderForm';
import OrderDone from '../components/order/OrderDone';
import UsualPanel from '../components/order/UsualPanel';
import MealBuilder from '../components/order/MealBuilder';
import MealBox from '../components/order/MealBox';
import LbMenu from '../components/order/LbMenu';
import CheckoutSheet from '../components/order/CheckoutSheet';

export async function getServerSideProps({ req, query }) {
  const s = await getSettings();
  const adminMode = query.admin === '1' && isValidSession(req);
  return { props: { settings: publicSettings(s), adminMode } };
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

  if (done) {
    return <OrderDone done={done} adminMode={adminMode} settings={settings} lang={lang} setLang={setLang} t={t} resetAll={resetAll} />;
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
        <UsualPanel
          lang={lang}
          t={t}
          open={usualOpen}
          setOpen={setUsualOpen}
          phone={usualPhone}
          setPhone={setUsualPhone}
          usual={usual}
          findUsual={findUsual}
          loadUsual={loadUsual}
        />
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
            <MealBuilder
              lang={lang}
              t={t}
              soldOut={soldOut}
              builderRef={builderRef}
              editIdx={editIdx}
              setEditIdx={setEditIdx}
              bProtein={bProtein}
              setBProtein={setBProtein}
              bFlavor={bFlavor}
              setBFlavor={setBFlavor}
              bCarb={bCarb}
              setBCarb={setBCarb}
              bVeg={bVeg}
              setBVeg={setBVeg}
              bP={bP}
              builderUnit={builderUnit}
              builderMacros={builderMacros}
              builderAllergens={builderAllergens}
              pickProtein={pickProtein}
              addSet={addSet}
            />

            <MealBox lang={lang} t={t} settings={settings} meals={meals} mealCount={mealCount} editSet={editSet} setSets={setSets} />
          </>
        )}

        {/* ---------------- BY THE LB ---------------- */}
        {tab === 'lb' && (
          <LbMenu
            lang={lang}
            t={t}
            soldOut={soldOut}
            lbs={lbs}
            lbCount={lbCount}
            lbFlavor={lbFlavor}
            setLbFlavor={setLbFlavor}
            lbQty={lbQty}
            setLb={setLb}
          />
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
        <CheckoutSheet
          lang={lang}
          t={t}
          settings={settings}
          adminMode={adminMode}
          adm={adm}
          setAdm={setAdm}
          info={info}
          setInfo={setInfo}
          custom={custom}
          priced={priced}
          hasItems={hasItems}
          fee={fee}
          subtotal={subtotal}
          total={total}
          err={err}
          busy={busy}
          place={place}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  );
}
