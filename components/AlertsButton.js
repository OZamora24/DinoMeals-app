import { useCallback, useEffect, useState } from 'react';
import { enableAlerts, disableAlerts, sendTestAlert, getAlertState, soundEnabled, setSoundEnabled, playChime } from '../lib/alerts';

// Bell button for the admin header: turn new-order sound + pop-ups on/off.
export default function AlertsButton() {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState(null);
  const [sound, setSound] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => setSt(await getAlertState()), []);
  useEffect(() => {
    refresh();
    setSound(soundEnabled());
  }, [refresh]);

  const on = !!st && st.permission === 'granted';

  async function turnOn() {
    setBusy(true);
    setMsg('');
    const r = await enableAlerts();
    await refresh();
    if (!r.ok) setMsg(r.reason === 'denied' ? 'Notifications are blocked. Allow them in your browser settings for this site, then try again.' : 'This browser cannot show notifications.');
    else if (!r.push) setMsg(r.reason === 'server_not_configured' ? 'Sound and pop-ups work while this page is open. Phone push is not set up on the server yet.' : 'Sound and pop-ups work while this page is open. This browser does not support background push.');
    else setMsg('Alerts are on for this device.');
    setBusy(false);
  }

  async function turnOff() {
    setBusy(true);
    await disableAlerts();
    await refresh();
    setMsg('Alerts are off for this device.');
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    const r = await sendTestAlert();
    setMsg(r.ok ? (r.sent ? 'Test sent. A pop-up should appear now.' : 'Chime played. No phone/computer is subscribed for push yet.') : r.error || 'Test failed.');
    setBusy(false);
  }

  return (
    <div className="alerts">
      <button className={`btn btn-ghost btn-sm alerts-btn ${on ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span aria-hidden="true">{on ? '🔔' : '🔕'}</span><span className="alerts-label"> Alerts{st?.subscribed ? ' on' : ''}</span>
      </button>
      {open && st && (
        <div className="alerts-pop" role="dialog" aria-label="Order alerts">
          <b>New-order alerts</b>
          {st.iosNeedsInstall && (
            <p className="muted small">On iPhone: tap Share, then <b>Add to Home Screen</b>, open DinoMeals from the home screen, go to /admin and turn alerts on there.</p>
          )}
          {!st.hasNotif && <p className="muted small">This browser does not support notifications.</p>}
          {st.permission === 'denied' && <p className="muted small">Notifications are blocked for this site. Allow them in the browser's site settings.</p>}
          <label className="check">
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => {
                setSound(e.target.checked);
                setSoundEnabled(e.target.checked);
                if (e.target.checked) playChime();
              }}
            />{' '}
            Play a sound when an order comes in
          </label>
          <div className="alerts-actions">
            {!st.subscribed ? (
              <button className="btn btn-red btn-sm" disabled={busy || !st.hasNotif} onClick={turnOn}>Turn on alerts</button>
            ) : (
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={turnOff}>Turn off</button>
            )}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={test}>Send test</button>
          </div>
          {msg && <p className="muted small">{msg}</p>}
        </div>
      )}
    </div>
  );
}
