import Seo from './Seo';
import SiteNav from './SiteNav';
import Footer from './Footer';
import { useLang } from '../lib/i18n';
import { LEGAL } from '../lib/legal';

// Search-result snippet: whole words, about 155 characters max.
function shortText(v) {
  if (typeof v !== 'string') return '';
  if (v.length <= 158) return v;
  return `${v.slice(0, 155).replace(/\s+\S*$/, '')}…`;
}

// Shared shell for /privacy, /terms and /sms. `content` = { en: {title, intro, sections:[{h, p:[...]}]}, es: {...} }
// Paragraph strings may be React nodes (for links).
export default function LegalPage({ content, children }) {
  const { lang, setLang, t } = useLang();
  const c = content[lang === 'es' ? 'es' : 'en'];
  return (
    <div className="page legal-page">
      <Seo title={`${c.title} · DinoMeals`} description={shortText(c.intro) || `${c.title} for DinoMeals (Dino Meals LLC), Riverside, CA.`} lang={lang} />
      <SiteNav lang={lang} setLang={setLang} t={t} />
      <main className="legal">
        <h1 className="display">{c.title}</h1>
        <p className="muted small">{lang === 'es' ? 'Última actualización' : 'Last updated'}: {LEGAL.updated[lang === 'es' ? 'es' : 'en']}</p>
        {c.intro && <p className="legal-intro">{c.intro}</p>}
        {children}
        {c.sections.map((s, i) => (
          <section key={i}>
            <h2>{s.h}</h2>
            {s.p.map((p, j) => (Array.isArray(p) ? <ul key={j}>{p.map((li, k) => <li key={k}>{li}</li>)}</ul> : <p key={j}>{p}</p>))}
          </section>
        ))}
      </main>
      <Footer t={t} />
    </div>
  );
}
