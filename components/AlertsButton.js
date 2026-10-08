import { useCallback, useEffect, useState } from 'react';
import {
  enableAlerts, disableAlerts, sendTestAlert, getAlertState, getServerStatus, healSubscription,
  soundEnabled, setSoundEnabled, playChime,
} from '../lib/alerts';

const REASONS = {
  denied: 'Notifications are blocked for this site. Allow them in the browser or phone settings, then try again.',
  unsupported: 'This browser cannot show notifications.',
  no_push: 'This browser cannot receive background notifications. Sound and pop-ups still work while this page is open.',
  server_not_configured: 'Phone/computer push is not set up on the server yet (the VAPID keys are missing in Vercel). Sound and pop-ups still work while this page is open.',
  logged_out: 'You were logged out. Log in again, then turn alerts on.',
  save_failed: 'Could not save this device on the server.',
  subscribe_failed: 'Your browser could not register for background notifications.',
};

// Bell button for the admin header: turn new-order sound + pop-ups on/off.
export default function AlertsButton() {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState(null);
  const [server, setServer] = useState(null);
  const [sound, setSound] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getAlertState();
    setSt(s);
    setServer(await getServerStatus());
    return s;
  }, []);

  useEffect(() => {
    (async () => {
      const s = await refresh();
      if (s.subscribed && (await healSubscription())) setServer(await getServerStatus());
    })();
    setSound(soundEnabled());
  }, [refresh]);

  const on = !!st && st.permission === 'granted';

  async function turnOn() {
    setBusy(true);
    setMsg('');
    try {
      const r = await enableAlerts();
      await refresh();
      if (r.ok && r.push) setMsg('Alerts are on for this device. Tap "Send test" to check.');
      else setMsg(`${REASONS[r.reason] || 'Something went wrong.'}${r.detail ? ` (${r.detail})` : ''}`);
    } catch (e) {
      setMsg(`Something went wrong (${e?.message || e}).`);
    }
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
    try {
      const r = await sendTestAlert();
      await refresh();
      if (!r.ok) setMsg(r.error || 'Test failed.');
      else if (r.sent) setMsg(`Test sent to ${r.sent} device(s). If no pop-up appears, check this device's notification settings (Focus / Do Not Disturb).`);
      else if (r.failed) setMsg(`The push service refused the test (${(r.errors || []).map((e) => e.status || e.message).join(', ')}).`);
      else setMsg('No device is registered for alerts yet. Tap "Turn on alerts" first.');
    } catch (e) {
      setMsg(`Test failed (${e?.message || e}).`);
    }
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
            <p className="small"><b>iPhone steps:</b> Safari tabs cannot show notifications. Tap Share, then <b>Add to Home Screen</b>. Open <b>Kitchen</b> from your home screen, log in, and turn alerts on there.</p>
          )}
          {!st.hasNotif && !st.iosNeedsInstall && <p className="muted small">This browser does not support notifications.</p>}
          {st.permission === 'denied' && <p className="muted small">Notifications are blocked for this site. Allow them in the browser's site settings.</p>}
          <ul className="alerts-status small">
            <li>This device: <b>{st.subscribed ? 'registered for background alerts' : 'not registered (alerts only while this page is open)'}</b></li>
            {server && <li>Devices the server will alert: <b>{server.devices}</b>{server.configured ? '' : ' (push not set up on server)'}</li>}
          </ul>
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
              <button className="btn btn-red btn-sm" disabled={busy || !st.hasNotif} onClick={turnOn}>{busy ? 'Working…' : 'Turn on alerts'}</button>
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
