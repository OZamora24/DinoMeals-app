import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { prettyDate, addDays, money } from '../lib/menu';
import { ORDERS_WARN, ORDERS_ACT } from '../lib/limits';
import { List, Flame, Money, Route, Users, Gear, Check, Repeat, Plus, X } from '../components/Icons';
import { api, smsHref, lineText, dietLabel, SOURCE_LABEL, Stat, CookTab, PayTab, RouteTab, RegularsTab, SettingsTab } from '../components/AdminTabs';

const TABS = [
  ['orders', 'Orders', List],
  ['cook', 'Cook sheet', Flame],
  ['pay', 'Payments', Money],
  ['route', 'Delivery', Route],
  ['regulars', 'Regulars', Users],
  ['settings', 'Menu & settings', Gear],
];
export default function Admin() {
  const [authed, setAuthed] = useState(null);
  const [pw, setPw] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState('orders');
  const [settings, setSettings] = useState(null);
  const [demo, setDemo] = useState(false);
  const [week, setWeek] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const say = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 1800);
  };

  const loadSettings = useCallback(async () => {
    try {
      const j = await api('/api/settings');
      if (!('kitchen_address' in j.settings)) return setAuthed(false); // public view = not logged in
      setSettings(j.settings);
      setDemo(!!j.demo);
      setWeek((w) => w || j.settings.cook_date);
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }, []);

  // silent = background refresh: no "Loading…" flash, and a toast if new orders arrived.
  const orderCount = useRef(0);
  const loadOrders = useCallback(async (silent = false) => {
    if (!week) return;
    if (!silent) setLoading(true);
    try {
      const j = await api(`/api/orders?week=${week}`);
      if (silent && j.orders.length > orderCount.current) say('New order in!');
      orderCount.current = j.orders.length;
      setOrders(j.orders);
    } catch (e) {
      if (e.status === 401) setAuthed(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [week]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  useEffect(() => {
    if (authed) loadOrders();
  }, [authed, loadOrders]);

  // Keep the order list fresh without a manual reload.
  useEffect(() => {
    if (!authed) return undefined;
    const tick = () => document.visibilityState === 'visible' && loadOrders(true);
    const id = setInterval(tick, 20000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [authed, loadOrders]);

  async function login(e) {
    e.preventDefault();
    setLoginErr('');
    try {
      await api('/api/login', { method: 'POST', body: { password: pw } });
      loadSettings();
    } catch (e2) {
      setLoginErr(e2.message);
    }
  }

  async function patch(id, p) {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...p } : o)));
    try {
      const j = await api('/api/orders', { method: 'PATCH', body: { id, ...p } });
      setOrders((os) => os.map((o) => (o.id === id ? j.order : o)));
    } catch {
      say('Could not save — refresh and try again');
      loadOrders();
    }
  }
  async function remove(id) {
    if (!window.confirm('Delete this order for good?')) return;
    await api(`/api/orders?id=${id}`, { method: 'DELETE' });
    setOrders((os) => os.filter((o) => o.id !== id));
    say('Order deleted');
  }
  async function repeat(ids, toWeek) {
    const j = await api('/api/orders/repeat', { method: 'POST', body: { ids, cook_date: toWeek } });
    say(`${j.orders.length} order${j.orders.length === 1 ? '' : 's'} added to ${prettyDate(toWeek)}`);
    if (toWeek === week) loadOrders();
  }
  async function saveSettings(p) {
    const j = await api('/api/settings', { method: 'POST', body: p });
    setSettings((s) => ({ ...s, ...j.settings }));
    say('Saved');
  }

  if (authed === null) return <div className="admin-wrap"><p className="muted pad">Loading…</p></div>;

  if (!authed) {
    return (
      <div className="admin-login">
        <form onSubmit={login} className="login-card">
          <span className="nav-badge xl"><img src="/logo-mark.png" alt="" /></span>
          <h1 className="display">Kitchen</h1>
          <input className="input" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          {loginErr && <div className="error">{loginErr}</div>}
          <button className="btn btn-red btn-block">Log in</button>
          <Link href="/" className="muted small">← DinoMeals</Link>
        </form>
      </div>
    );
  }

  const live = orders.filter((o) => o.status !== 'cancelled');

  return (
    <div className="admin-wrap">
      <header className="admin-top">
        <Link href="/" className="nav-brand">
          <span className="nav-badge"><img src="/logo-mark.png" alt="" /></span>
          <span className="nav-name">DINO<em>KITCHEN</em></span>
        </Link>
        <div className="week-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => setWeek(addDays(week, -7))}>‹</button>
          <div className="week-label">
            <small>Cook day</small>
            <b>{prettyDate(week)}</b>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeek(addDays(week, 7))}>›</button>
        </div>
        <Link href="/order?admin=1" className="btn btn-red btn-sm"><Plus size={16} /> DM order</Link>
      </header>
      {demo && <div className="demo-strip">Demo mode — sample orders, nothing is saved. Connect Supabase to go live.</div>}
      {week !== settings.cook_date && (
        <div className="week-warn">Viewing {week < settings.cook_date ? 'a past' : 'a future'} week · <button className="link" onClick={() => setWeek(settings.cook_date)}>Jump to current ({prettyDate(settings.cook_date)})</button></div>
      )}

      {orders.length >= ORDERS_WARN && (
        <div className={`vol-warn ${orders.length >= ORDERS_ACT ? 'act' : ''}`}>
          {orders.length >= ORDERS_ACT
            ? `${orders.length} orders this week — the list is getting too big. Time to switch to a compact/paged order list; tell your developer.`
            : `${orders.length} orders this week — busy! The order list will start to feel long. Worth planning a compact/paged view (at ${ORDERS_ACT}, change it).`}
        </div>
      )}

      <nav className="admin-tabs">
        {TABS.map(([k, label, I]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <I size={18} /> <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="admin-main">
        {tab === 'orders' && <OrdersTab orders={orders} loading={loading} patch={patch} remove={remove} repeat={repeat} week={week} />}
        {tab === 'cook' && <CookTab orders={live} week={week} />}
        {tab === 'pay' && <PayTab orders={live} patch={patch} settings={settings} />}
        {tab === 'route' && <RouteTab orders={live} patch={patch} settings={settings} />}
        {tab === 'regulars' && <RegularsTab week={week} weekOrders={orders} repeat={repeat} />}
        {tab === 'settings' && <SettingsTab settings={settings} save={saveSettings} week={week} />}
      </main>

      {toast && <div className="toast"><Check size={16} /> {toast}</div>}
    </div>
  );
}

/* =========================== ORDERS =========================== */
function OrdersTab({ orders, loading, patch, remove, repeat, week }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const live = orders.filter((o) => o.status !== 'cancelled');
  const stats = {
    orders: live.length,
    meals: live.reduce((a, o) => a + (o.meal_count || 0), 0),
    lbs: live.reduce((a, o) => a + Number(o.lb_total || 0), 0),
    revenue: live.reduce((a, o) => a + Number(o.total || 0), 0),
    owed: live.filter((o) => !o.paid).reduce((a, o) => a + Number(o.total || 0), 0),
  };
  const shown = orders.filter((o) => {
    if (filter === 'unpaid' && (o.paid || o.status === 'cancelled')) return false;
    if (filter === 'pickup' && o.fulfillment !== 'pickup') return false;
    if (filter === 'delivery' && o.fulfillment !== 'delivery') return false;
    if (filter === 'quote' && o.status !== 'quote') return false;
    if (q && !`${o.customer_name} ${o.phone} ${o.order_no}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="stat-row">
        <Stat label="Orders" value={stats.orders} />
        <Stat label="Meals" value={stats.meals} sub={stats.lbs ? `+ ${stats.lbs} lb bulk` : null} />
        <Stat label="Sales" value={money(stats.revenue)} />
        <Stat label="Still owed" value={money(stats.owed)} hot={stats.owed > 0} />
      </div>
      <div className="filter-row">
        {['all', 'unpaid', 'pickup', 'delivery', 'quote'].map((f) => (
          <button key={f} className={`chip sm ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'quote' ? 'Custom quotes' : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input className="input search" placeholder="Search name / phone / #" value={q} onChange={(e) => setQ(e.target.value)} />
        <a className="btn btn-ghost btn-sm" href={`/api/export?week=${week}`}>Export Excel</a>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {!loading && shown.length === 0 && <p className="muted empty">No orders here yet.</p>}
      <div className="order-cards">
        {shown.map((o) => (
          <OrderCard key={o.id} o={o} patch={patch} remove={remove} repeat={repeat} week={week} />
        ))}
      </div>
    </>
  );
}

function OrderCard({ o, patch, remove, repeat, week }) {
  const [quote, setQuote] = useState(o.total ?? '');
  const flags = [...(o.diet || []).map(dietLabel), o.allergy_notes].filter(Boolean);
  return (
    <article className={`ocard st-${o.status} ${o.paid ? 'is-paid' : 'is-unpaid'}`}>
      <header className="oc-head">
        <div>
          <div className="oc-no">#{o.order_no} <span className={`src src-${o.source}`}>{SOURCE_LABEL[o.source] || o.source}</span></div>
          <h3>{o.customer_name}</h3>
          <div className="oc-contact">
            <a href={`tel:${o.phone_digits}`}>{o.phone}</a> · <a href={smsHref(o.phone, `Hey ${o.customer_name.split(' ')[0]}! DinoMeals here about order #${o.order_no}.`)}>Text</a>
          </div>
        </div>
        <div className="oc-right">
          <div className="oc-total">{o.total == null ? 'Quote' : money(o.total)}</div>
          <button className={`paid-btn ${o.paid ? 'on' : ''}`} onClick={() => patch(o.id, { paid: !o.paid })}>
            {o.paid ? <><Check size={14} /> Paid</> : 'Unpaid'}
          </button>
          <div className="muted tiny">{o.payment_method}</div>
        </div>
      </header>

      {flags.length > 0 && <div className="oc-flags">⚠ {flags.join(' · ')}</div>}

      <ul className="oc-items">
        {(o.items || []).map((l, i) => <li key={i}>{lineText(l)}</li>)}
      </ul>
      {o.custom_request && <div className="oc-custom">✎ {o.custom_request}</div>}
      {o.status === 'quote' && (
        <div className="quote-row">
          <input className="input" inputMode="decimal" placeholder="Price $" value={quote} onChange={(e) => setQuote(e.target.value)} />
          <button className="btn btn-red btn-sm" onClick={() => patch(o.id, { total: quote, status: 'confirmed' })}>Set price</button>
        </div>
      )}
      {o.notes && <div className="oc-notes">{o.notes}</div>}

      <div className="oc-ful">
        {o.fulfillment === 'delivery' ? (
          <>🚚 <b>Delivery</b> · <a href={`https://maps.google.com/?q=${encodeURIComponent(`${o.address} ${o.zip}`)}`} target="_blank" rel="noreferrer">{o.address} {o.zip}</a>{o.delivery_notes ? ` · ${o.delivery_notes}` : ''}</>
        ) : (
          <>📍 <b>Pickup</b> Sunday</>
        )}
      </div>

      <footer className="oc-foot">
        <div className="status-pills">
          {['new', 'confirmed', 'cooking', 'ready', 'done'].map((s) => (
            <button key={s} className={`sp ${o.status === s ? 'on' : ''}`} onClick={() => patch(o.id, { status: s })}>{s}</button>
          ))}
        </div>
        <div className="oc-actions">
          <button className="btn btn-ghost btn-sm" title="Copy this order into next week" onClick={() => repeat([o.id], addDays(week, 7))}><Repeat size={14} /> Next week</button>
          {o.status !== 'cancelled' ? (
            <button className="btn btn-ghost btn-sm" onClick={() => patch(o.id, { status: 'cancelled' })}>Cancel</button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => remove(o.id)}><X size={14} /> Delete</button>
          )}
        </div>
      </footer>
    </article>
  );
}

