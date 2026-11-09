// Opened from the Tuesday "How were your meals?" notification: finds this phone's latest order
// (from 🧾 My orders) whose review is open and goes to its review form.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Seo from '../components/Seo';
import SiteNav from '../components/SiteNav';
import { useLang } from '../lib/i18n';
import { readMyOrders } from '../lib/orderView';
import { reviewOpensOn } from '../lib/reviews';

export default function RatePage() {
  const { lang, setLang, t } = useLang();
  const [none, setNone] = useState(false);
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const o = readMyOrders()
      .filter((x) => x.cook_date && reviewOpensOn(x.cook_date) <= today)
      .sort((a, b) => String(b.cook_date).localeCompare(String(a.cook_date)))[0];
    if (o) window.location.replace(`/o/${o.token}#review`);
    else setNone(true);
  }, []);
  return (
    <div className="page order-page">
      <Seo title="DinoMeals" path="/rate" lang={lang} noindex />
      <SiteNav lang={lang} setLang={setLang} t={t} cta={false} />
      <main className="done">
        {none ? (
          <>
            <h1 className="display">⭐</h1>
            <p className="done-no">{t('rv_rate_none')}</p>
            <div className="done-actions"><Link href="/order" className="btn btn-red">{t('rv_order')}</Link></div>
          </>
        ) : <p className="muted">…</p>}
      </main>
    </div>
  );
}
