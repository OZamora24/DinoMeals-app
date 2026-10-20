// The message card a customer sees AFTER tapping a notification (the dino transition plays first).
// It shows the same text that was in the notification, in the customer's language.
import { useEffect } from 'react';
import { useLang } from '../lib/i18n';

export function PromoModal({ promo, onClose }) {
  const { lang } = useLang();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const es = lang === 'es';
  const title = (es && promo.title_es) || promo.title;
  const body = (es && promo.body_es) || promo.body;
  return (
    <div className="promo-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="promo-card" role="dialog" aria-modal="true" aria-label={title || 'DinoMeals'}>
        <button className="promo-x" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'}>✕</button>
        <span className="nav-badge lg"><img src="/logo-mark.png" alt="" /></span>
        {title && <h2 className="display promo-title">{title}</h2>}
        {body && <p className="promo-body">{body}</p>}
        <div className="promo-actions">
          <button className="btn btn-red" onClick={onClose}>{es ? 'Entendido' : 'Got it'}</button>
        </div>
      </div>
    </div>
  );
}
