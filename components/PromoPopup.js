// Promo / discount pop-ups written by hand in /admin -> Messages.
//  <PromoPopup />   customer side: shows the first active message the visitor hasn't closed yet
//                   (remembered per message + edit in localStorage, so an edited message shows again).
//  <PromoModal />   the card itself (also used for the admin "Preview" button).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '../lib/i18n';

const SEEN_KEY = 'dino_promos_seen';
const keyOf = (p) => `${p.id}:${p.updated}`;
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } };
const writeSeen = (list) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-40))); } catch {} };

export function PromoModal({ popup, lang = 'en', onClose, preview = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const es = lang === 'es';
  const title = (es && popup.title_es) || popup.title;
  const body = (es && popup.body_es) || popup.body;
  const ctaLabel = (es && popup.cta_label_es) || popup.cta_label;
  const internal = popup.cta_url && popup.cta_url.startsWith('/');
  return (
    <div className="promo-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="promo-card" role="dialog" aria-modal="true" aria-label={title || 'DinoMeals'}>
        {preview && <span className="promo-preview">PREVIEW</span>}
        <button className="promo-x" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'}>✕</button>
        <span className="nav-badge lg"><img src="/logo-mark.png" alt="" /></span>
        {title && <h2 className="display promo-title">{title}</h2>}
        {body && <p className="promo-body">{body}</p>}
        <div className="promo-actions">
          {popup.cta_url && ctaLabel && (internal
            ? <Link href={popup.cta_url} className="btn btn-red" onClick={onClose}>{ctaLabel}</Link>
            : <a href={popup.cta_url} className="btn btn-red" target="_blank" rel="noreferrer" onClick={onClose}>{ctaLabel}</a>)}
          <button className="btn btn-ghost" onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button>
        </div>
      </div>
    </div>
  );
}

export default function PromoPopup() {
  const { lang } = useLang();
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer;
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const seen = new Set(readSeen());
        const next = ((j.settings && j.settings.popups) || []).find((p) => !seen.has(keyOf(p)));
        if (next) timer = setTimeout(() => alive && setPopup(next), 1200);
      })
      .catch(() => {});
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  if (!popup) return null;
  const close = () => { writeSeen([...readSeen(), keyOf(popup)]); setPopup(null); };
  return <PromoModal popup={popup} lang={lang} onClose={close} />;
}
