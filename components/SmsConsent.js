import { SMS_CONSENT } from '../lib/legal';

// Text-message opt-in. Unchecked by default, separate from everything else,
// optional — exactly what the carriers' A2P 10DLC review requires.
export default function SmsConsent({ lang = 'en', checked, onChange, readOnly = false }) {
  const c = SMS_CONSENT[lang === 'es' ? 'es' : 'en'];
  return (
    <label className="sms-consent">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => !readOnly && onChange && onChange(e.target.checked)}
        readOnly={readOnly}
      />
      <span>
        <b>{c.label}</b>
        <small>
          {c.fine}{' '}
          <a href="/privacy" target="_blank" rel="noreferrer">{lang === 'es' ? 'Privacidad' : 'Privacy Policy'}</a>
          {' · '}
          <a href="/terms" target="_blank" rel="noreferrer">{lang === 'es' ? 'Términos' : 'Terms'}</a>
        </small>
      </span>
    </label>
  );
}
