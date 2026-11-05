// "Share & earn" card: the customer's personal referral link (10% off for a new friend,
// 5% credit for them once the friend's first order is paid). Shown on the confirmation
// screen and the private order page.
import { useState } from 'react';

const T = {
  en: {
    title: 'Share DinoMeals, earn 5% off',
    sub: (n, c) => `Friends get ${n}% off their first order with your link. You get ${c}% off your next order when they pay (up to 2 stack).`,
    share: 'Share my link', copy: 'Copy', copied: 'Copied!',
    msg: (url, n) => `🦖 Try DinoMeals meal prep! Use my link for ${n}% off your first order: ${url}`,
  },
  es: {
    title: 'Comparte DinoMeals y gana 5%',
    sub: (n, c) => `Tus amigos reciben ${n}% de descuento en su primera orden con tu enlace. Tú recibes ${c}% en tu próxima orden cuando paguen (se juntan hasta 2).`,
    share: 'Compartir mi enlace', copy: 'Copiar', copied: '¡Copiado!',
    msg: (url, n) => `🦖 ¡Prueba DinoMeals! Usa mi enlace y recibe ${n}% de descuento en tu primera orden: ${url}`,
  },
};

export default function ShareReferral({ code, lang = 'en', newPct = 10, creditPct = 5 }) {
  const [msg, setMsg] = useState('');
  if (!code) return null;
  const x = T[lang] || T.en;
  const url = `https://dinomeals.app/order?ref=${encodeURIComponent(code)}`;
  const text = x.msg(url, newPct);
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 1800); };
  async function share() {
    try {
      if (navigator.share) { await navigator.share({ text, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); flash(x.copied); } catch { flash(url); }
  }
  return (
    <div className="ref-card">
      <div className="ref-head"><span>🤝</span><b>{x.title}</b></div>
      <p className="ref-sub">{x.sub(newPct, creditPct)}</p>
      <div className="ref-link"><code>{url.replace('https://', '')}</code></div>
      <div className="ref-actions">
        <button type="button" className="btn btn-red" onClick={share}>{x.share}</button>
        <button type="button" className="btn btn-ghost" onClick={copy}>{msg || x.copy}</button>
      </div>
    </div>
  );
}
