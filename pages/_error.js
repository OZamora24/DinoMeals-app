// Error page: replaces Next's plain "Application error" / 404 screens.
// A crash (no status code) reports itself and reloads once, like CrashGuard.
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { CrashScreen } from '../components/CrashGuard';
import { reportClientError, canAutoReload, reloadNow } from '../lib/clientErrors';

function ErrorPage({ statusCode, message }) {
  const notFound = statusCode === 404;
  const [reloading, setReloading] = useState(false);
  useEffect(() => {
    if (notFound || statusCode) return;
    reportClientError({ message: message || 'client error page' }, 'error-page');
    if (canAutoReload()) {
      setReloading(true);
      setTimeout(() => reloadNow(), 300);
    }
  }, [notFound, statusCode, message]);
  return (
    <>
      <Head><title>DinoMeals</title><meta name="robots" content="noindex" /></Head>
      {notFound ? (
        <div className="crash">
          <span className="nav-badge lg"><img src="/logo-mark.png" alt="" /></span>
          <h1 className="display crash-title">Page not found 🦖</h1>
          <p className="crash-sub">Página no encontrada</p>
          <div className="crash-actions">
            <a className="btn btn-red btn-lg" href="/order">Order now · Ordena ya</a>
            <a className="btn btn-ghost" href="/">Home · Inicio</a>
          </div>
        </div>
      ) : (
        <CrashScreen reloading={reloading} />
      )}
    </>
  );
}

ErrorPage.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode: statusCode || null, message: err ? String(err.message || '').slice(0, 300) : '' };
};

export default ErrorPage;
