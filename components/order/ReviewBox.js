// "How was order #1093?" on the customer's private order page (lib/reviews.js).
// Opens the Tuesday after cook day; one review per order. After sending: thank you + Google button.
import { useState } from 'react';
import Link from 'next/link';
import { keyLabel } from '../../lib/reviews';

const ICON = { p: '🔥', c: '🍚', v: '🥦' };
const WORD = { en: ['', 'Not good', 'Could be better', 'Good', 'Really good', 'Loved it!'], es: ['', 'No me gustó', 'Puede mejorar', 'Bien', 'Muy bien', '¡Me encantó!'] };

function Stars({ value, onPick, size = 'md', label }) {
  return (
    <span className={`rv-stars ${size}`} role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}`} className={n <= value ? 'on' : ''} onClick={() => onPick(n === value && size !== 'lg' ? 0 : n)}>★</button>
      ))}
    </span>
  );
}

export default function ReviewBox({ order, review, t, lang }) {
  const [stars, setStars] = useState(0);
  const [meals, setMeals] = useState({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null); // the saved review text, for "Copy my review"
  const [copied, setCopied] = useState(false);
  if (!review || (!review.open && !review.done)) return null;

  if (review.done && !done) {
    return (
      <section className="rv-box rv-thanks small">
        <b>⭐ {t('rv_already')}</b>
        <a className="btn btn-ghost btn-sm" href="/review" target="_blank" rel="noreferrer">{t('rv_google')}</a>
      </section>
    );
  }

  async function send() {
    setErr('');
    if (!stars) { setErr(t('rv_need_stars')); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: order.token, stars, meals: Object.entries(meals).filter(([, s]) => s > 0).map(([key, s]) => ({ key, stars: s })), comment, lang }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok || j.error === 'already') setDone({ text: comment.trim(), stars });
      else setErr(t('err_generic'));
    } catch {
      setErr(t('err_generic'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const copyText = `${'★'.repeat(done.stars)} ${done.text}`.trim();
    return (
      <section className="rv-box rv-thanks">
        <img src="/chef-rex.webp" alt="" className="rv-rex" />
        <h2 className="display">{t('rv_thanks')}</h2>
        <p className="muted">{t('rv_thanks_sub')}</p>
        <div className="rv-google">
          <b>{t('rv_google_q')}</b>
          <p className="muted small">{done.text ? t('rv_google_sub') : t('rv_google_sub2')}</p>
          {done.text && (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => { try { navigator.clipboard.writeText(copyText); setCopied(true); } catch {} }}>
              {copied ? `✓ ${t('rv_copied')}` : `📋 ${t('rv_copy')}`}
            </button>
          )}
          <a className="btn btn-google btn-block" href="/review" target="_blank" rel="noreferrer"><b>G</b> {t('rv_google')}</a>
        </div>
        <Link href="/order" className="btn btn-ghost btn-block">{t('rv_order')} →</Link>
      </section>
    );
  }

  return (
    <section className="rv-box" id="review">
      <h2 className="display">{t('rv_title', order.order_no)}</h2>
      <p className="muted small"><span className="rv-verified">✓ {t('rv_verified')}</span></p>
      <div className="rv-overall">
        <b>{t('rv_overall')}</b>
        <Stars value={stars} onPick={setStars} size="lg" label={t('rv_overall')} />
        <span className="muted small">{WORD[lang === 'es' ? 'es' : 'en'][stars] || t('rv_tap')}</span>
      </div>
      {review.items.length > 0 && (
        <>
          <b className="rv-h">{t('rv_meals')}</b>
          {review.items.map((k) => (
            <div className={`rv-meal ${meals[k] ? 'on' : ''}`} key={k}>
              <span>{ICON[k[0]]} {keyLabel(k, lang)}</span>
              <Stars value={meals[k] || 0} onPick={(n) => setMeals((m) => ({ ...m, [k]: n }))} label={keyLabel(k, lang)} />
            </div>
          ))}
        </>
      )}
      <textarea className="input rv-text" rows={3} maxLength={600} placeholder={t('rv_ph')} value={comment} onChange={(e) => setComment(e.target.value)} />
      <p className="muted small">{t('rv_shows_as', review.name)}</p>
      {err && <div className="error">{err}</div>}
      <button type="button" className="btn btn-red btn-block" disabled={busy} onClick={send}>{busy ? '…' : t('rv_send')}</button>
    </section>
  );
}
