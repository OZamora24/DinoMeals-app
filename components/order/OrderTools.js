// Status tracker + receipt buttons (save as image, share link) + "Order this again".
import { useState } from 'react';
import { useRouter } from 'next/router';
import { VIEW_TXT, trackOf } from '../../lib/orderView';
import { linesToCart } from '../../lib/cart';
import { mealLineCount, planForCount } from '../../lib/menu';
import { DRAFT_KEY } from '../../lib/orderForm';
import { TEXT_NUMBER } from '../../lib/vcard';

export const orderUrl = (token) => (typeof window !== 'undefined' ? `${window.location.origin}/o/${token}` : `https://dinomeals.app/o/${token}`);

export function Tracker({ order, lang = 'en' }) {
  const x = VIEW_TXT[lang] || VIEW_TXT.en;
  const tr = trackOf(order);
  if (!tr) return null;
  const icons = ['📥', '💳', '🔥', '📦'];
  const banner = tr.key === 'ready' ? x.banner[order.fulfillment === 'delivery' ? 'ready_delivery' : 'ready_pickup'] : x.banner[tr.key];
  return (
    <>
      {tr.key !== 'cancelled' && (
        <ol className="otrack" aria-label={x.chip[tr.key]}>
          {x.steps.map((s, i) => (
            <li key={s} className={i < tr.done ? 'st-done' : i === tr.now ? 'st-now' : ''}>
              <i aria-hidden="true">{i < tr.done ? '✓' : icons[i]}</i>
              {s}
            </li>
          ))}
        </ol>
      )}
      {banner && <div className={`otrack-banner ${tr.key}`}>{banner}</div>}
    </>
  );
}

export function ReceiptButtons({ order, lang = 'en' }) {
  const x = VIEW_TXT[lang] || VIEW_TXT.en;
  const [msg, setMsg] = useState('');
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 1800); };

  async function save() {
    try {
      const { receiptBlob } = await import('../../lib/receiptImage');
      const blob = await receiptBlob(order, lang);
      if (!blob) return;
      const file = new File([blob], `DinoMeals-order-${order.order_no}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: `DinoMeals #${order.order_no}` }); return; } catch (e) { if (e?.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {}
  }

  async function share() {
    const url = orderUrl(order.token);
    if (navigator.share) {
      try { await navigator.share({ title: `DinoMeals #${order.order_no}`, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); flash(x.copied); } catch { window.prompt('', url); }
  }

  return (
    <div className="rc-btns">
      <button type="button" className="btn btn-ghost" onClick={save}>📸 {x.save}</button>
      <button type="button" className="btn btn-ghost" onClick={share}>🔗 {msg || x.share}</button>
    </div>
  );
}

// Loads this order into the order builder (prices are re-checked there) and opens it.
export function OrderAgain({ order, lang = 'en', className = 'btn btn-red btn-block' }) {
  const x = VIEW_TXT[lang] || VIEW_TXT.en;
  const router = useRouter();
  if (!order.items?.length) return null;
  const go = () => {
    const cart = linesToCart(order.items);
    const n = cart.meals.reduce((a, m) => a + mealLineCount(m), 0);
    try {
      const prev = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || {};
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        ...prev, meals: cart.meals, lbs: cart.lbs, extras: cart.extras, custom: '',
        plan: n ? planForCount(n).id : prev.plan, planQty: 1,
        info: { ...(prev.info || {}), fulfillment: order.fulfillment || prev.info?.fulfillment, payment_method: order.payment_method || prev.info?.payment_method },
      }));
    } catch {}
    router.push(cart.meals.length ? '/order' : '/order?tab=lb');
  };
  return <button type="button" className={className} onClick={go}>🔁 {x.again}</button>;
}

// "Add DinoMeals to contacts" — downloads the contact card (/api/contact) so the
// order texts come from a saved contact and their links are tappable.
export function SaveContact({ lang = 'en' }) {
  const x = VIEW_TXT[lang] || VIEW_TXT.en;
  return (
    <div className="save-contact">
      <span className="sc-ic" aria-hidden="true"><img src="/logo-mark.png" alt="" /></span>
      <div className="sc-tx">
        <b>{x.contact_t}</b>
        <small>{x.contact_s(TEXT_NUMBER.replace(' ', '\u00a0').replace('-', '\u2011'))}</small>
        <a className="btn btn-ghost btn-sm" href="/api/contact" download="DinoMeals.vcf">📇 {x.contact_btn}</a>
      </div>
    </div>
  );
}
