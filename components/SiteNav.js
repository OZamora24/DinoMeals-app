import Link from 'next/link';

export default function SiteNav({ lang, setLang, t, cta = true }) {
  return (
    <header className="nav">
      <Link href="/" className="nav-brand" aria-label="DinoMeals home">
        <span className="nav-badge"><img src="/logo-mark.png" alt="" /></span>
        <span className="nav-name">DINO<em>MEALS</em></span>
      </Link>
      <div className="nav-right">
        <div className="lang-toggle" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
        </div>
        {cta && (
          <Link href="/order" className="btn btn-red btn-sm">{t('order_now')}</Link>
        )}
      </div>
    </header>
  );
}
