// Home page "What customers say": overall score (once there are 3+ reviews) + the newest reviews
// with Juan's replies. More load from /api/reviews.
import { useState } from 'react';
import { keyLabel } from '../lib/reviews';

const Stars = ({ n }) => <span className="rv-show-stars" aria-label={`${n} / 5`}>{'★'.repeat(n)}<i>{'★'.repeat(5 - n)}</i></span>;

export default function ReviewsSection({ data, t, lang }) {
  const [items, setItems] = useState((data && data.latest) || []);
  const [more, setMore] = useState(!!data && data.total > items.length);
  const [busy, setBusy] = useState(false);
  if (!data || !items.length) return null;
  const s = data.summary;
  async function loadMore() {
    setBusy(true);
    try {
      const j = await fetch(`/api/reviews?offset=${items.length}`).then((r) => r.json());
      setItems((x) => [...x, ...(j.items || [])]);
      setMore(!!j.more);
    } catch { setMore(false); } finally { setBusy(false); }
  }
  return (
    <section className="section rv-section" id="reviews">
      <h2 className="section-title">{t('rv_section')}</h2>
      {s.show && (
        <div className="rv-score">
          <div><div className="rv-big">{s.avg.toFixed(1)}</div><Stars n={Math.round(s.avg)} /><div className="muted small">{t('rv_count', s.count)}</div></div>
          <div className="rv-bars">
            {s.dist.map((c, i) => (
              <div key={i}><span>{5 - i}</span><em><i style={{ width: `${s.count ? (c / s.count) * 100 : 0}%` }} /></em></div>
            ))}
          </div>
        </div>
      )}
      <div className="rv-list">
        {items.map((r) => (
          <article className="rv-card" key={r.id}>
            <div className="rv-card-h"><b>{r.name} <span className="rv-verified">✓</span></b><Stars n={r.stars} /></div>
            {r.comment && <p>{r.comment}</p>}
            {r.meals.length > 0 && <div className="rv-loved">{r.meals.slice(0, 4).map((k) => <span key={k}>❤ {keyLabel(k, lang)}</span>)}</div>}
            {r.reply && <div className="rv-reply"><b>{t('rv_reply')}</b> {r.reply}</div>}
          </article>
        ))}
      </div>
      {more && <button className="btn btn-ghost rv-more" disabled={busy} onClick={loadMore}>{t('rv_more')}</button>}
    </section>
  );
}
