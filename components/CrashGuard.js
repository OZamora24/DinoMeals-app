// Catches a crash anywhere on a customer page. Instead of the blank "Application error"
// screen, it reports the error, reloads once to get the latest version, and if it
// still fails shows a friendly screen with Reload, an "open in your browser" tip and Juan's number.
import { Component } from 'react';
import { reportClientError, canAutoReload, reloadNow, inAppBrowser } from '../lib/clientErrors';
import { CONTACT_NAME, CONTACT_PHONE } from '../lib/orderForm';

export function CrashScreen({ reloading = false }) {
  const app = typeof navigator !== 'undefined' ? inAppBrowser(navigator.userAgent) : '';
  const appName = app ? app[0].toUpperCase() + app.slice(1) : '';
  const tel = CONTACT_PHONE.replace(/\D/g, '');
  return (
    <div className="crash" role="alert">
      <span className="nav-badge lg"><img src="/logo-mark.png" alt="" /></span>
      {reloading ? (
        <>
          <h1 className="display crash-title">Loading…</h1>
          <p className="crash-sub">Getting the latest menu · Cargando el menú</p>
        </>
      ) : (
        <>
          <h1 className="display crash-title">Something went wrong 🦖</h1>
          <p className="crash-sub">Algo salió mal</p>
          <p className="crash-text">Tap <b>Reload</b> to try again. · Toca <b>Recargar</b> para intentar de nuevo.</p>
          {app && (
            <p className="crash-tip">
              Opened from {appName}? Tap <b>•••</b> at the top and choose <b>Open in browser</b>.<br />
              ¿Lo abriste desde {appName}? Toca <b>•••</b> arriba y elige <b>Abrir en el navegador</b>.
            </p>
          )}
          <div className="crash-actions">
            <button type="button" className="btn btn-red btn-lg" onClick={() => reloadNow({ clearGuard: true })}>Reload · Recargar</button>
            <a className="btn btn-ghost" href="/">Home · Inicio</a>
          </div>
          <p className="crash-contact">Still stuck? Call or text {CONTACT_NAME} <a href={`sms:${tel}`}>{CONTACT_PHONE}</a></p>
        </>
      )}
    </div>
  );
}

export default class CrashGuard extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, reloading: false };
  }

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error) {
    reportClientError(error, this.props.where || 'page');
    if (canAutoReload()) {
      this.setState({ reloading: true });
      setTimeout(() => reloadNow(), 300);
    }
  }

  render() {
    if (this.state.crashed) return <CrashScreen reloading={this.state.reloading} />;
    return this.props.children;
  }
}

// Test switch: add ?crashtest=1 to any customer page to see the safety net work.
export function CrashTest() {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('crashtest') === '1') {
    throw new Error('crashtest: test crash (safe to ignore)');
  }
  return null;
}
