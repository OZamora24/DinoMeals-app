import Seo from '../components/Seo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SiteNav from '../components/SiteNav';
import { useLang } from '../lib/i18n';
import {
  PROTEINS, NONE, MIN_MEALS, proteinLabel, MIN_LBS, MEAL_PLANS, planById, planForCount, mealLineCount, byId, mealUnitPrice, cleanOz, mealOz, PORTIONS, priceCart, allergensFor, prettyDate, money, cartNeedsFlavor } from '../lib/menu';
import { getSettings } from '../lib/db';
import { publicSettingsWithCapacity } from '../lib/publicSettings';
import { isValidSession } from '../lib/adminSession';
import { Check, Arrow } from '../components/Icons';
import { sumMacros, emptyInfo, DRAFT_KEY } from '../lib/orderForm';
import OrderDone from '../components/order/OrderDone';
import { primeSizzle } from '../lib/sizzle';
import UsualPanel from '../components/order/UsualPanel';
import MealBuilder from '../components/order/MealBuilder';
import MealBox from '../components/order/MealBox';
import LbMenu from '../components/order/LbMenu';
import ExtrasPanel from '../components/order/ExtrasPanel';
import CheckoutSheet from '../components/order/CheckoutSheet';
import { promoDiscount, normCode } from '../lib/promo';
import { allDiscounts, pctOff } from '../lib/referral';
import { useTrainerCredits } from '../lib/trainer';
import { MONTHLY_SIZES, monthlyWeeks } from '../lib/monthly';
import MonthlyBar from '../components/order/MonthlyBar';

export async function getServerSideProps({ req, query }) {
  const s = await getSettings();
  const adminMode = query.admin === '1' && isValidSession(req);
  return { props: { settings: await publicSettingsWithCapacity(s), adminMode } };
}

export default function OrderPage({ settings, adminMode }) {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const soldOut = useMemo(() => new Set(settings.sold_out || []), [settings.sold_out]);
  const macros = settings.macros || {};

  const [tab, setTab] = useState('meals');
  const [meals, setMeals] = useState([]); // [{protein, flavor, carb, veg, count}]
  const [planId, setPlanId] = useState(MEAL_PLANS[0].id);
  const [planQty, setPlanQty] = useState(1); // how many of the chosen plan are in this order
  const [anyQty, setAnyQty] = useState(4); // 'any amount': meals per combo
  const [lbs, setLbs] = useState([]); // [{kind, item, flavor, lbs}]
  const [extras, setExtras] = useState([]); // [{kind, item, qty}] add-on portions
  const [custom, setCustom] = useState('');
  const [info, setInfo] = useState(emptyInfo);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // builder
  const [bProtein, setBProtein] = useState(null);
  const [bFlavor, setBFlavor] = useState(null); // must be picked for proteins with flavors
  const [bCarb, setBCarb] = useState(null);
  const [bVeg, setBVeg] = useState(null);
  const [bOz, setBOz] = useState({}); // non-standard oz picks: { protein?, carb?, veg? }
  const [editIdx, setEditIdx] = useState(null);
  const [flash, setFlash] = useState(null);

  // checkout
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [promo, setPromo] = useState(null); // { code, type, value } once a code checks out
  const [promoMsg, setPromoMsg] = useState('');
  const [loyalty, setLoyalty] = useState(null); // Customer Loyalty Rewards for the phone typed at checkout
  const [credits, setCredits] = useState(null); // referral credits this customer earned (up to 2 used)
  const [tcredit, setTcredit] = useState(null); // a trainer's own $ meal credits { available, amount, each }
  // Monthly Plan: null, or { week: 0-3, weeks: [{ meals, lbs, extras, planId } × 4] } (the open
  // week lives in the normal cart state and is copied back in when switching weeks).
  const [monthly, setMonthly] = useState(null);
  const [refCode, setRefCode] = useState(''); // friend's referral code from ?ref= (kept on this phone)
  const [refState, setRefState] = useState(null); // { ok, name, pct, note }
  const [refBanner, setRefBanner] = useState(null); // shown at the top when a friend's link was opened
  useEffect(() => {
    if (!refCode || adminMode) { setRefBanner(null); return; }
    fetch(`/api/referral?code=${encodeURIComponent(refCode)}`).then((r) => r.json()).then(setRefBanner).catch(() => setRefBanner(null));
  }, [refCode, adminMode]);
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
        if (d.plan && MEAL_PLANS.some((p) => p.id === d.plan)) setPlanId(d.plan);
        if (Number.isInteger(d.planQty) && d.planQty >= 1 && d.planQty <= 5) setPlanQty(d.planQty);
        if (Array.isArray(d.lbs)) setLbs(d.lbs);
        if (Array.isArray(d.extras)) setExtras(d.extras);
        if (typeof d.custom === 'string') setCustom(d.custom);
        if (d.info) setInfo({ ...emptyInfo, ...d.info, sms_opt_in: false, reminder_opt_in: false });
        if (d.info?.phone) setUsualPhone(d.info.phone);
      }
    } catch {}
    setDraftLoaded(true);
  }, [adminMode]);
  useEffect(() => {
    if (!draftLoaded || adminMode) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ meals, lbs, extras, custom, info, plan: planId, planQty }));
    } catch {}
  }, [meals, lbs, extras, custom, info, planId, planQty, draftLoaded, adminMode]);

  // ---- pricing ----
  const cart = { meals, lbs, extras };
  const priced = priceCart(cart, []);
  const mealCount = meals.reduce((a, m) => a + mealLineCount(m), 0);
  // 2 x the 8-meal plan = a 16-meal plan; sets of the same combo stay the plan's size.
  const basePlan = planById(planId);
  const plan = basePlan.meals ? { ...basePlan, meals: basePlan.meals * planQty } : basePlan;
  const planTarget = plan.meals; // null = any amount
  const remaining = planTarget ? planTarget - mealCount : Infinity;
  // How many meals the builder's Add button adds right now: a full set, or
  // the leftover "your pick" meals once the sets are filled.
  const addN = planTarget ? Math.max(0, Math.min(plan.setSize, remaining)) : anyQty;
  const lbCount = lbs.reduce((a, l) => a + (Number(l.lbs) || 0), 0);
  const hasItems = mealCount > 0 || lbCount > 0;
  const fee = info.fulfillment === 'delivery' && hasItems ? Number(settings.delivery_fee) || 0 : 0;
  const subtotal = hasItems ? Math.round(priced.subtotal * 100) / 100 : 0;
  const cardFee = info.payment_method === 'card' && hasItems ? Number(settings.card_fee) || 0 : 0;
  // A trainer's code: 10% on a brand-new customer's first order, else 5% (the server decides;
  // the page shows the smaller one until it knows the phone is new).
  const trainerShownPct = promo && promo.trainer ? (loyalty && loyalty.new_customer ? promo.trainer.first_pct : promo.trainer.pct) : 0;
  const discount = monthly ? 0 : hasItems ? (promo && promo.trainer ? pctOff(trainerShownPct, subtotal) : promoDiscount(promo, subtotal)) : 0;
  const reward = !monthly && loyalty && loyalty.on && loyalty.available ? loyalty.available : null;
  const refPct = !monthly && refState && refState.ok && refState.pct ? refState.pct : 0;
  const creditPct = !monthly && !refPct && credits && credits.pct ? credits.pct : 0;
  const parts = allDiscounts(hasItems ? subtotal : 0, { promoDisc: discount, reward, refPct, creditPct });
  const tcUse = !monthly && hasItems && tcredit && tcredit.available > 0
    ? useTrainerCredits(Array.from({ length: tcredit.available }, (_, i) => i), tcredit.each, subtotal - parts.total)
    : { ids: [], amount: 0 };
  const rewardDisc = hasItems ? parts.reward : 0;
  const refDisc = hasItems ? parts.referral : 0;
  const creditDisc = hasItems ? parts.credit : 0;
  const total = hasItems ? Math.round((subtotal - parts.total - tcUse.amount + fee + cardFee) * 100) / 100 : null;
  const mealsOk = mealCount === 0 || (planTarget ? mealCount === planTarget : mealCount >= MIN_MEALS) && (!monthly || MONTHLY_SIZES.includes(String(mealCount)));
  const lbsOk = lbCount === 0 || lbCount >= MIN_LBS;
  const flavorNeeded = cartNeedsFlavor({ meals, lbs });
  const weekOk = hasItems && mealsOk && lbsOk && !flavorNeeded;
  const canCheckout = monthly ? false : ((hasItems && mealsOk && lbsOk) || (!hasItems && custom.trim().length > 3)) && !flavorNeeded;

  // ---- Monthly Plan: 4 weekend carts ----
  const curCart = () => ({ meals, lbs, extras, planId: MONTHLY_SIZES.includes(planId) ? planId : '8' });
  const loadCart = (c) => {
    setMeals(c.meals || []); setLbs(c.lbs || []); setExtras(c.extras || []);
    setPlanId(c.planId || '8'); setPlanQty(1); setEditIdx(null);
  };
  const emptyWeek = { meals: [], lbs: [], extras: [], planId: '8' };
  const mWeeks = monthly ? monthly.weeks.map((w, i) => (i === monthly.week ? curCart() : w)) : [];
  const weekPrice = (c) => {
    const p = priceCart(c, []);
    const n = (c.meals || []).reduce((a, m) => a + mealLineCount(m), 0);
    const lb = (c.lbs || []).reduce((a, l) => a + (Number(l.lbs) || 0), 0);
    const ok = (n > 0 || lb > 0) && p.ok && (n === 0 || MONTHLY_SIZES.includes(String(n))) && (lb === 0 || lb >= MIN_LBS) && !cartNeedsFlavor(c);
    return { ok, n, lb, sub: p.ok ? Math.round(p.subtotal * 100) / 100 : 0 };
  };
  const mPct = (settings.monthly && settings.monthly.pct) || 10;
  const mInfo = monthly ? (() => {
    const ws = mWeeks.map(weekPrice);
    const dates = monthlyWeeks(settings.cook_date, ws.length);
    const sub = ws.reduce((a, w) => a + w.sub, 0);
    const off = ws.reduce((a, w) => a + pctOff(mPct, w.sub), 0);
    const delivery = info.fulfillment === 'delivery' ? (Number(settings.delivery_fee) || 0) * ws.length : 0;
    const card = info.payment_method === 'card' ? Number(settings.card_fee) || 0 : 0;
    const r2 = (v) => Math.round(v * 100) / 100;
    return { ws, dates, sub: r2(sub), off: r2(off), delivery: r2(delivery), card, total: r2(sub - off + delivery + card), allOk: ws.every((w) => w.ok), pct: mPct };
  })() : null;
  function startMonthly() {
    const c = curCart();
    setMonthly({ week: 0, weeks: [c, emptyWeek, emptyWeek, emptyWeek] });
    loadCart(c);
    setTab((c.lbs || []).length && !(c.meals || []).length ? 'lb' : 'meals');
    setPromo(null); setPromoMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function goWeek(i) {
    if (!monthly || i === monthly.week) return;
    const weeks = mWeeks.slice();
    setMonthly({ week: i, weeks });
    loadCart(weeks[i]);
    setTab((weeks[i].lbs || []).length && !(weeks[i].meals || []).length ? 'lb' : 'meals');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function copyWeekToRest() {
    if (!monthly) return;
    const c = curCart();
    setMonthly({ week: monthly.week, weeks: mWeeks.map((w, i) => (i > monthly.week ? JSON.parse(JSON.stringify(c)) : w)) });
    setFlash('copied');
    setTimeout(() => setFlash(null), 1500);
  }
  function exitMonthly() {
    setMonthly(null);
    if (!MONTHLY_SIZES.includes(planId)) setPlanId(MEAL_PLANS[0].id);
  }

  // ---- builder helpers ----
  const bP = byId(PROTEINS, bProtein);
  const flavorMissing = !!(bProtein && byId(PROTEINS, bProtein)?.flavors && !bFlavor);
  const builderUnit = bProtein && bCarb && bVeg && !flavorMissing ? mealUnitPrice({ protein: bProtein, flavor: bFlavor, carb: bCarb, veg: bVeg, oz: bOz }) : null;
  // Flavor rows (e.g. groundbeef:taco) can have their own macros; else the base protein's.
  const proteinMacros = bProtein ? macros[`${bProtein}:${bFlavor}`] || macros[bProtein] : null;
  // Macros are saved per standard portion; bigger portions scale them.
  const ozNow = mealOz({ oz: bOz });
  const scaleMacro = (m, kind) => {
    if (!m) return m;
    const k = ozNow[kind] / PORTIONS[kind];
    return k === 1 ? m : { cal: (+m.cal || 0) * k, p: (+m.p || 0) * k, c: (+m.c || 0) * k, f: (+m.f || 0) * k };
  };
  const builderMacros = builderUnit
    ? sumMacros([
        scaleMacro(proteinMacros, 'protein'),
        ...[['carb', bCarb], ['veg', bVeg]].filter(([, x]) => x && x !== NONE).map(([kind, x]) => scaleMacro(macros[x], kind)),
      ])
    : null;
  const builderAllergens = allergensFor(
    [bProtein, bProtein && `${bProtein}:${bFlavor}`, bCarb, bVeg].filter(Boolean),
    settings.allergens
  );

  function pickProtein(id) {
    setBProtein(id);
    const p = byId(PROTEINS, id);
    setBFlavor(null); // no default: the customer has to tap a flavor
  }

  function addSet() {
    if (!builderUnit) return;
    if (editIdx == null && addN <= 0) return;
    const cz = cleanOz({ carb: bCarb, veg: bVeg, oz: bOz }).oz;
    const combo = { protein: bProtein, flavor: bP.flavors ? bFlavor : undefined, carb: bCarb, veg: bVeg, ...(cz ? { oz: cz } : {}) };
    const ozSig = (o) => JSON.stringify([o?.protein || 0, o?.carb || 0, o?.veg || 0]);
    const same = (m) => m.protein === combo.protein && (m.flavor || '') === (combo.flavor || '') && m.carb === combo.carb && m.veg === combo.veg && ozSig(m.oz) === ozSig(combo.oz);
    setMeals((prev) => {
      if (editIdx != null) {
        const next = prev.slice();
        next[editIdx] = { ...combo, count: mealLineCount(prev[editIdx]) };
        return next;
      }
      const i = prev.findIndex(same);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = { ...combo, count: mealLineCount(next[i]) + addN };
        return next;
      }
      return [...prev, { ...combo, count: addN }];
    });
    setFlash(editIdx != null ? 'updated' : { added: addN });
    setTimeout(() => setFlash(null), 1300);
    setEditIdx(null);
    // After adding a set, jump back up to the builder for the next one; once the box is complete
    // (plan size reached, or the 8-meal minimum on "any amount") stay down by the box + checkout bar.
    if (editIdx == null) {
      const after = mealCount + addN;
      const complete = planTarget ? after >= planTarget : after >= MIN_MEALS;
      if (!complete) setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
    setBProtein(null);
    setBCarb(null);
    setBVeg(null);
    setBOz({});
  }

  function editSet(i) {
    const m = meals[i];
    setTab('meals');
    setEditIdx(i);
    setBProtein(m.protein);
    setBFlavor(m.flavor || null);
    setBCarb(m.carb);
    setBVeg(m.veg);
    setBOz(m.oz || {});
    builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Protein-only meals (no carb AND no veggie) go through the Custom tab.
  function goCustom() {
    const p = bProtein ? proteinLabel(bProtein, bFlavor, lang) : '';
    const line = p ? `${t('nosides_prefill', p)}\n` : '';
    if (line && !custom.includes(line.trim())) setCustom((c) => (c.trim() ? `${c.trim()}\n${line}` : line));
    setTab('custom');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const setCount = (i, n) =>
    setMeals((prev) => (n <= 0 ? prev.filter((_, j) => j !== i) : prev.map((m, j) => (j === i ? { protein: m.protein, flavor: m.flavor, carb: m.carb, veg: m.veg, ...(m.oz ? { oz: m.oz } : {}), count: n } : m))));
  // Box steppers move by a whole set (or 1 meal on "any amount"), never past the plan size.
  const incMeal = (i) => {
    const c = mealLineCount(meals[i]);
    const step = planTarget ? Math.min(plan.setSize, remaining) : 1;
    if (step > 0) setCount(i, c + step);
  };
  const decMeal = (i) => {
    const c = mealLineCount(meals[i]);
    const step = planTarget ? (c % plan.setSize || plan.setSize) : 1;
    setCount(i, c - step);
  };

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
  function setExtraQty(kind, item, qty) {
    setExtras((prev) => {
      const rest = prev.filter((e) => !(e.kind === kind && e.item === item));
      return qty > 0 ? [...rest, { kind, item, qty }] : rest;
    });
  }

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
    const n = (o.cart.meals || []).reduce((a, m) => a + mealLineCount(m), 0);
    if (n) setPlanId(planForCount(n).id);
    setLbs(o.cart.lbs || []);
    setExtras(o.cart.extras || []);
    setInfo((i) => ({ ...i, phone: usualPhone, fulfillment: o.fulfillment || i.fulfillment, payment_method: o.payment_method || i.payment_method }));
    setTab(o.cart.meals?.length ? 'meals' : 'lb');
    setUsualOpen(false);
    setFlash('loaded');
    setTimeout(() => setFlash(null), 1500);
  }

  // ---- promo code ----
  async function applyPromo(raw, quiet = false) {
    const code = normCode(raw);
    if (!code) return;
    setPromoMsg('');
    try {
      const r = await fetch(`/api/promo-code?code=${encodeURIComponent(code)}`);
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.promo) { setPromo(j.promo); return; }
      if (r.ok && j.trainer) { setPromo({ code: j.trainer.code, trainer: j.trainer }); return; }
      if (!quiet) setPromoMsg(r.status === 429 ? t('err_generic') : t('promo_bad'));
    } catch {
      if (!quiet) setPromoMsg(t('err_generic'));
    }
  }
  // Links like dinomeals.app/order?code=LAUNCH10 apply the code automatically.
  useEffect(() => {
    if (router.isReady && router.query.code) applyPromo(String(router.query.code), true);
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- loyalty rewards: look up the phone typed at checkout ----
  const phoneDigits = String(info.phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  useEffect(() => {
    if (!sheet || phoneDigits.length !== 10 || adminMode) { setLoyalty(null); setCredits(null); setTcredit(null); setRefState(null); return undefined; }
    let alive = true;
    const tm = setTimeout(async () => {
      try {
        const r = await fetch(`/api/rewards?phone=${phoneDigits}&lang=${lang}`);
        const j = await r.json().catch(() => ({}));
        if (alive) { setLoyalty(r.ok && settings.loyalty_on !== false ? j.loyalty : null); setCredits(r.ok ? j.credits : null); setTcredit(r.ok ? j.trainer_credit : null); }
      } catch { if (alive) { setLoyalty(null); setCredits(null); setTcredit(null); } }
      if (refCode && settings.referral_on !== false) {
        try {
          const r = await fetch(`/api/referral?code=${encodeURIComponent(refCode)}&phone=${phoneDigits}`);
          const j = await r.json().catch(() => ({}));
          if (alive) setRefState(r.ok ? j : null);
        } catch { if (alive) setRefState(null); }
      } else if (alive) setRefState(null);
    }, 350);
    return () => { alive = false; clearTimeout(tm); };
  }, [sheet, phoneDigits, lang, settings.loyalty_on, settings.referral_on, refCode, adminMode]);
  // Referral links: dinomeals.app/order?ref=MARCUS-7Q2K (remembered on this phone until they order).
  useEffect(() => {
    if (adminMode) return;
    let c = router.isReady && router.query.ref ? String(router.query.ref).slice(0, 30) : '';
    try {
      if (c) localStorage.setItem('dino_ref', c);
      else c = localStorage.getItem('dino_ref') || '';
    } catch {}
    setRefCode(c);
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- submit ----
  async function place() {
    if (!adminMode) primeSizzle(); // unlock Chef Rex's sizzle while we still have the tap
    setErr('');
    setBusy(true);
    try {
      const body = {
        cart,
        ...(monthly ? { monthly_weeks: mWeeks.map(({ meals: m, lbs: l, extras: x }) => ({ meals: m, lbs: l, extras: x })) } : {}),
        custom_request: monthly ? '' : custom,
        ...info,
        total,
        promo_code: promo && !monthly ? promo.code : '',
        ref_code: !monthly && !adminMode && refState && refState.ok ? refCode : '',
        lang,
        ...(adminMode ? { as_admin: true, source: adm.source, paid: adm.paid, cook_date: adm.cook_date } : {}),
      };
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) {
        if (j.error === 'promo_invalid') { setPromo(null); setPromoMsg(t('promo_bad')); }
        if (j.error === 'trainer_self') { setPromo(null); setPromoMsg(t('err_trainer_self')); }
        if (monthly && j.week && ['monthly_size', 'monthly_week_full'].includes(j.error)) { setErr(t(`err_${j.error}`, j.week)); return; }
        setErr(t(`err_${j.error}`) !== `err_${j.error}` ? t(`err_${j.error}`) : t('err_generic'));
        return;
      }
      setDone({ ...j.order, name: info.name, loyalty: j.loyalty || null, monthly_summary: j.monthly || null });
      if (monthly) setMonthly(null);
      if (!adminMode && j.order && j.order.referral) { try { localStorage.removeItem('dino_ref'); } catch {} setRefCode(''); }
      setSheet(false);
      if (!adminMode) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ meals: [], lbs: [], extras: [], custom: '', info: { ...info, notes: '', allergy_notes: info.allergy_notes } }));
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
    setExtras([]);
    setCustom('');
    setDone(null);
    setMonthly(null);
    setInfo((i) => ({ ...(adminMode ? emptyInfo : { ...i, notes: '' }) }));
  }

  // Customer "oops" button: empties the box (contact info is kept).
  function resetCart() {
    if (!window.confirm(t('reset_confirm'))) return;
    setMeals([]);
    setLbs([]);
    setExtras([]);
    setCustom('');
    setPlanId(MEAL_PLANS[0].id);
    setPlanQty(1);
    setAnyQty(4);
    setLbFlavor({});
    setBProtein(null);
    setBFlavor(null);
    setBCarb(null);
    setBVeg(null);
    setBOz({});
    setEditIdx(null);
    setTab('meals');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (done) {
    return <OrderDone done={done} adminMode={adminMode} settings={settings} lang={lang} setLang={setLang} t={t} resetAll={resetAll} />;
  }

  const full = !!settings.week_full && !adminMode;
  const closed = (!settings.ordering_open || full) && !adminMode;

  // =================== BUILDER ===================
  return (
    <div className="page order-page">
      <Seo
        title={lang === 'es' ? 'Ordena tu meal prep · DinoMeals Riverside' : 'Order Meal Prep Online · DinoMeals Riverside'}
        description={lang === 'es'
          ? 'Arma tu caja de meal prep: elige proteína, carbohidrato y verdura, o compra por libra. Planes de 8 a 16 comidas, recoge el domingo o pide entrega en Riverside, CA.'
          : 'Build your meal prep box: pick a protein, carb and veggie, or shop by the pound. Plans of 8 to 16 meals, Sunday pickup or delivery in Riverside, CA.'}
        path="/order"
        lang={lang}
        noindex={adminMode}
      />
      <SiteNav lang={lang} setLang={setLang} t={t} cta={false} spin />

      {adminMode && (
        <div className="admin-strip">
          <b>Kitchen mode:</b> entering an order for a customer (DM / text / call). <Link href="/admin">← Dashboard</Link>
        </div>
      )}

      <header className="order-head">
        <h1 className="display">{tab === 'lb' ? t('by_lb') : tab === 'custom' ? t('custom_title') : t('build_meals')}</h1>
        <div className={`status-pill ${closed ? 'closed' : 'open'}`}>
          <span className="dot" />
          {full && settings.ordering_open ? t('week_full') : closed ? t('closed') : <>{t('cook_day')}: <b>{prettyDate(settings.cook_date, lang)}</b></>}
        </div>
      </header>

      {settings.announcement ? <div className="announce">{settings.announcement}</div> : null}
      {refBanner && refBanner.valid ? <div className="announce ref-banner">🤝 {t('ref_banner', refBanner.name, refBanner.pct || settings.referral_new_pct || 10)}</div> : null}
      {full && settings.ordering_open ? <div className="announce">{t('week_full_note')}</div> : null}
      {!closed && !adminMode && settings.spots_left ? <div className="announce spots-left">🔥 {t('spots_left', settings.spots_left)}</div> : null}
      {!closed && settings.monthly && settings.monthly.on && (settings.monthly.open || monthly) && (
        <MonthlyBar t={t} lang={lang} monthly={monthly} info={mInfo} start={startMonthly} goWeek={goWeek} copyToRest={copyWeekToRest} exit={exitMonthly} weekOk={weekOk} />
      )}

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
        ].filter(([k]) => !(monthly && k === 'custom')).map(([k, label, badge]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
            {badge && <span className="tab-badge">{badge}</span>}
          </button>
        ))}
        <button className="tab-reset" disabled={!hasItems && !custom.trim()} onClick={resetCart}>{t('reset')}</button>
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
              flavorMissing={flavorMissing}
              setBFlavor={setBFlavor}
              bCarb={bCarb}
              setBCarb={setBCarb}
              bVeg={bVeg}
              setBVeg={setBVeg}
              bOz={bOz}
              setBOz={setBOz}
              bP={bP}
              builderUnit={builderUnit}
              builderMacros={builderMacros}
              builderAllergens={builderAllergens}
              pickProtein={pickProtein}
              addSet={addSet}
              plan={plan}
              setPlanId={setPlanId}
              planQty={planQty}
              setPlanQty={setPlanQty}
              addN={addN}
              mealCount={mealCount}
              anyQty={anyQty}
              setAnyQty={setAnyQty}
              goCustom={goCustom}
              planIds={monthly ? MONTHLY_SIZES : null}
            />

            <MealBox lang={lang} t={t} settings={settings} meals={meals} mealCount={mealCount} plan={plan} remaining={remaining} editSet={editSet} incMeal={incMeal} decMeal={decMeal} />
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
        {/* ---------------- EXTRAS (meals + by-the-lb tabs) ---------------- */}
        {(tab === 'meals' || tab === 'lb') && hasItems && (
          <ExtrasPanel lang={lang} t={t} soldOut={soldOut} extras={extras} setExtraQty={setExtraQty} />
        )}
      </main>

      {flash && (
        <div className="toast">
          <Check size={16} /> {flash === 'loaded' ? t('load') : flash === 'copied' ? t('m_copied') : flash === 'updated' ? t('update_set') : t('added_n', flash.added || 1)}
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
          {flavorNeeded && <div className="cb-warn">{t('pick_flavor_box')}</div>}
          <div className="cb-total">{hasItems ? money(subtotal) : custom.trim() ? t('quote') : '$0'}</div>
        </div>
        {monthly ? (
          monthly.week < 3 ? (
            <button className="btn btn-red btn-lg" disabled={!weekOk} onClick={() => goWeek(monthly.week + 1)}>{t('m_next_week', monthly.week + 2)} <Arrow size={18} /></button>
          ) : (
            <button className="btn btn-red btn-lg" disabled={!mInfo.allOk} onClick={() => { setErr(''); setSheet(true); }}>{t('checkout')} <Arrow size={18} /></button>
          )
        ) : (
        <button className="btn btn-red btn-lg" disabled={!canCheckout || closed} onClick={() => { setErr(''); setSheet(true); }}>
          {closed ? (full && settings.ordering_open ? t('week_full') : t('closed_btn')) : <>{t('checkout')} <Arrow size={18} /></>}
        </button>
        )}
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
          cardFee={cardFee}
          subtotal={subtotal}
          total={total}
          discount={discount}
          loyalty={loyalty}
          rewardDisc={rewardDisc}
          refState={refState}
          refDisc={refDisc}
          credits={monthly ? null : credits}
          creditDisc={creditDisc}
          tcUse={tcUse}
          trainerPct={trainerShownPct}
          monthly={mInfo}
          promo={promo}
          promoMsg={promoMsg}
          applyPromo={applyPromo}
          removePromo={() => { setPromo(null); setPromoMsg(''); }}
          err={err}
          busy={busy}
          place={place}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  );
}
