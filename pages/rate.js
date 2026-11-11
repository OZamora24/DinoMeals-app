// Opened from the Tuesday "How were your meals?" notification: finds this phone's latest order
// (from 🧾 My orders) whose review is open and goes to its review form.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Seo from '../components/Seo';
import SiteNav from '../components/SiteNav';
import { useLang } from '../lib/i18n';
import { readMyOrders, forgetOrders } from '../lib/orderView';
import { reviewOpensOn } from '../lib/reviews';

export default function RatePage() {
  const { lang, setLang, t } = useLang();
  const [none, setNone] = useState(false);
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const open = readMyOrders()
      .filter((x) => x.cook_date && reviewOpensOn(x.cook_date) <= today)
      .sort((a, b) => String(b.cook_date).localeCompare(String(a.cook_date)) || String(b.at || '').localeCompare(String(a.at || '')))
      .slice(0, 10);
    if (!open.length) { setNone(true); return; }
    // Check the codes still exist first: an order the kitchen deleted (a test or a duplicate) would
    // otherwise open "We couldn't find that order". Deleted ones are taken off this phone's list.
    fetch(`/api/track?t=${open.map((x) => x.token).join(',')}`)
      .then((r) => r.json())
      .then((j) => {
        const found = Array.isArray(j.orders) ? j.orders : null;
        if (!found || !j.ok) { window.location.replace(`/o/${open[0].token}#review`); return; } // lookup failed: old behavior
        forgetOrders(open.map((x) => x.token).filter((tk) => !found.some((o) => o.token === tk)));
        const pick = open.find((x) => found.some((o) => o.token === x.token && o.status !== 'cancelled'));
        if (pick) window.location.replace(`/o/${pick.token}#review`);
        else setNone(true);
      })
      .catch(() => window.location.replace(`/o/${open[0].token}#review`));
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
