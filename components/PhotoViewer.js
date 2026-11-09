// Food photos for customers (lib/photos.js):
//   <PhotoStrip>  home page "Fresh off the smoker" strip (swipe sideways, tap to open big)
//   <PhotoGrid>   the /photos page grid
//   <Lightbox>    full-screen viewer: swipe or arrows, Esc / tap outside to close
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export function Lightbox({ photos, index, onClose, onIndex, t }) {
  const touch = useRef(null);
  const n = photos.length;
  const go = (d) => onIndex((index + d + n) % n);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  });
  const p = photos[index];
  if (!p) return null;
  return (
    <div
      className="lb"
      role="dialog"
      aria-modal="true"
      aria-label={p.caption || t('ph_page')}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 45 && n > 1) go(dx < 0 ? 1 : -1);
      }}
    >
      <button type="button" className="lb-x" aria-label={t('ph_close')} onClick={onClose}>✕</button>
      <figure className="lb-fig" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <img key={p.id} src={p.src} alt={p.caption || ''} width={p.w} height={p.h} />
        {(p.caption || n > 1) && (
          <figcaption>
            {p.caption && <span>{p.caption}</span>}
            {n > 1 && <small>{index + 1} / {n}</small>}
          </figcaption>
        )}
      </figure>
      {n > 1 && (
        <>
          <button type="button" className="lb-nav prev" aria-label={t('ph_prev')} onClick={() => go(-1)}>‹</button>
          <button type="button" className="lb-nav next" aria-label={t('ph_next')} onClick={() => go(1)}>›</button>
        </>
      )}
    </div>
  );
}

export function PhotoStrip({ data, t }) {
  const [open, setOpen] = useState(-1);
  const items = (data && data.items) || [];
  if (!items.length) return null;
  return (
    <section className="section ph-section" id="photos">
      <div className="ph-head">
        <div>
          <h2 className="section-title">{t('ph_title')}</h2>
          <p className="muted">{t('ph_sub')}</p>
        </div>
        <Link href="/photos" className="ph-all">{t('ph_all')} →</Link>
      </div>
      <div className="ph-strip">
        {items.map((p, i) => (
          <button type="button" className="ph-tile" key={p.id} onClick={() => setOpen(i)} aria-label={p.caption || t('ph_page')}>
            <img src={p.thumb} alt={p.caption || ''} loading="lazy" width={p.w} height={p.h} />
            {p.caption && <span>{p.caption}</span>}
          </button>
        ))}
        {data.total > items.length && (
          <Link href="/photos" className="ph-tile ph-more"><b>+{data.total - items.length}</b><span>{t('ph_all')}</span></Link>
        )}
      </div>
      {open >= 0 && <Lightbox photos={items} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} t={t} />}
    </section>
  );
}

export function PhotoGrid({ photos, t }) {
  const [open, setOpen] = useState(-1);
  if (!photos.length) return <p className="muted empty">{t('ph_empty')}</p>;
  return (
    <>
      <div className="ph-grid">
        {photos.map((p, i) => (
          <button type="button" className="ph-cell" key={p.id} onClick={() => setOpen(i)} aria-label={p.caption || t('ph_page')}>
            <img src={p.thumb} alt={p.caption || ''} loading={i < 6 ? 'eager' : 'lazy'} width={p.w} height={p.h} />
            {p.caption && <span>{p.caption}</span>}
          </button>
        ))}
      </div>
      {open >= 0 && <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} t={t} />}
    </>
  );
}
