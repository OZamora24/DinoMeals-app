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
        <p>{t('footer_delivery')}</p>
      </div>
      <div className="footer-fine">© {new Date().getFullYear()} DinoMeals · Juan Carlos</div>
    </footer>
  );
}
