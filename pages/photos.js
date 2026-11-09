// dinomeals.app/photos: every food photo Juan has posted (Admin → Photos).
import Link from 'next/link';
import Seo from '../components/Seo';
import SiteNav from '../components/SiteNav';
import Footer from '../components/Footer';
import { PhotoGrid } from '../components/PhotoViewer';
import { useLang } from '../lib/i18n';

export async function getServerSideProps({ res }) {
  const { photoList } = await import('../lib/photosData');
  const { getSettings } = await import('../lib/db');
  const { publicSettings } = await import('../lib/publicSettings');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return { props: { photos: await photoList(), settings: publicSettings(await getSettings()) } };
}

export default function Photos({ photos = [], settings = {} }) {
  const { lang, setLang, t } = useLang();
  return (
    <div className="page">
      <Seo
        title={lang === 'es' ? 'Fotos · DinoMeals' : 'Photos · DinoMeals'}
        description={lang === 'es' ? 'Fotos reales de las comidas de DinoMeals: tri-tip ahumado, pollo a la parrilla y más.' : 'Real photos of DinoMeals meals: smoked tri-tip, grilled chicken and more.'}
        path="/photos"
        lang={lang}
      />
      <SiteNav lang={lang} setLang={setLang} t={t} />
      <section className="section ph-page">
        <h1 className="section-title">{t('ph_page')}</h1>
        <p className="muted">{t('ph_page_sub')}</p>
        <PhotoGrid photos={photos} t={t} />
        <div className="ph-cta">
          <b className="display">{t('ph_hungry')}</b>
          <Link href="/order" className="btn btn-red">{t('rv_order')} →</Link>
        </div>
      </section>
      <Footer t={t} settings={settings} />
    </div>
  );
}
