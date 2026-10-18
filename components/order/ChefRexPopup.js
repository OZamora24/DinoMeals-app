// Chef Rex: pops in from the side right after an order is placed, says his line,
// hangs around ~3 seconds, then fades out. Decorative only (no clicks blocked).
import { useEffect, useState } from 'react';
import { playSizzle } from '../../lib/sizzle';

const TXT = {
  en: { q: 'RAWR! SEE YOU SOON!', s: "Order's in — we're firing up the grill 🦖" },
  es: { q: '¡RAWR! ¡RECIBIMOS TU ORDEN!', s: '¡Nos vemos pronto! 🦖' },
};
const SPARKS = ['✨', '🍗', '🥦', '✨'];

export default function ChefRexPopup({ lang = 'en', orderNo }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Once per order (a refresh of the same confirmation doesn't replay it).
    const key = `dino_rex_${orderNo || ''}`;
    try {
      if (orderNo && sessionStorage.getItem(key)) return undefined;
      if (orderNo) sessionStorage.setItem(key, '1');
    } catch {}
    setShow(true);
    playSizzle(); // grill sizzle as he slides in (only when sound is on)
    const id = setTimeout(() => setShow(false), 4900);
    return () => clearTimeout(id);
  }, [orderNo]);

  if (!show) return null;
  const t = TXT[lang] || TXT.en;
  let n = 0;
  return (
    <div className="rex-pop" aria-live="polite" role="status">
      <div className="rex-bub">
        <b aria-label={t.q}>
          {t.q.split(' ').map((w, wi) => (
            <span className="w" key={wi} aria-hidden="true">
              {[...w].map((c, ci) => (
                <span key={ci} style={{ animationDelay: `${(0.8 + n++ * 0.035).toFixed(2)}s` }}>{c}</span>
              ))}
              {wi < t.q.split(' ').length - 1 ? ' ' : ''}
            </span>
          ))}
        </b>
        <small>{t.s}</small>
      </div>
      <div className="rex-rx">
        <img src="/chef-rex.webp" alt="" width="390" height="461" />
        <svg className="rex-hat" viewBox="0 0 120 80" aria-hidden="true">
          <g stroke="#1a0c08" strokeWidth="3.5" strokeLinejoin="round">
            <path d="M14 52 C0 30 18 8 38 18 C42 0 74 -2 82 14 C100 4 122 24 106 50 Z" fill="#fff" />
            <path d="M14 50 C46 40 76 38 106 46 L104 66 C74 58 46 60 18 70 Z" fill="#f6efe3" />
            <path d="M40 22 C42 32 44 40 46 46 M74 18 C74 28 76 36 78 44" fill="none" stroke="#d8d0c2" strokeWidth="2.5" />
          </g>
        </svg>
      </div>
      {SPARKS.map((e, i) => (
        <span
          key={i}
          className="rex-spark"
          aria-hidden="true"
          style={{ right: `${20 + i * 12}%`, bottom: '38%', '--dx': `${-20 - i * 22}px`, '--dy': `${-60 - (i % 2) * 40}px`, animationDelay: `${(0.55 + i * 0.08).toFixed(2)}s` }}
        >{e}</span>
      ))}
    </div>
  );
}
