import { Insta } from './Icons';

export default function Footer({ t, settings = {} }) {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <span className="nav-badge lg"><img src="/logo-mark.png" alt="" /></span>
        <div>
          <div className="nav-name">DINO<em>MEALS</em></div>
          <a className="ig" href="https://instagram.com/dino.meals" target="_blank" rel="noreferrer">
            <Insta size={16} /> @dino.meals
          </a>
        </div>
      </div>
      <div className="footer-info">
        <p><b>{t('footer_pay')}</b></p>
        <p>{settings.pickup_window ? `${t('pickup')}: ${settings.pickup_window}` : t('footer_pickup')}</p>
        <p>{settings.delivery_window ? `${t('delivery')}: ${settings.delivery_window}${settings.delivery_fee_note ? ` · ${settings.delivery_fee_note}` : ''}` : t('footer_delivery')}</p>
      </div>
      {/* Credit for the app's maker (asked for by the client). */}
      <div className="credit">
        <span className="credit-mk" aria-hidden="true">BO</span>
        <span className="credit-tx"><small>{t('credit_by')}</small><b>Built by Orlando</b></span>
        <span className="credit-lk">
          <a href="https://built-by-orlando.app" target="_blank" rel="noopener" aria-label="Built by Orlando website">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg> {t('credit_site')}
          </a>
          <a href="https://instagram.com/builtbyorlando.apps" target="_blank" rel="noopener" aria-label="Built by Orlando on Instagram">
            <Insta size={15} /> IG
          </a>
        </span>
      </div>
      <div className="footer-fine">
        © {new Date().getFullYear()} DinoMeals · Juan Carlos
        <span className="footer-links"><a href="/privacy">{t('privacy')}</a> · <a href="/terms">{t('terms')}</a> · <a href="/sms">{t('sms_link')}</a></span>
      </div>
    </footer>
  );
}
