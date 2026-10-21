import Head from 'next/head';
import { useRouter } from 'next/router';
import { CONTACT_PHONE } from '../lib/orderForm';

// Search + link-preview tags for customer pages. One official address
// (SITE_URL) so Google treats dinomeals.app as the real site, even when
// someone arrives through the old dinomeals.vercel.app link.
export const SITE_URL = 'https://dinomeals.app';
export const SITE_NAME = 'DinoMeals';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export default function Seo({ title, description, path, noindex = false, jsonLd = null, lang = 'en' }) {
  const router = useRouter();
  const p = path || (router.asPath || '/').split(/[?#]/)[0] || '/';
  const url = `${SITE_URL}${p === '/' ? '/' : p}`;
  return (
    <Head>
      <title key="title">{title}</title>
      {description ? <meta key="description" name="description" content={description} /> : null}
      {noindex ? (
        <meta key="robots" name="robots" content="noindex, nofollow" />
      ) : (
        <link key="canonical" rel="canonical" href={url} />
      )}
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:locale" property="og:locale" content={lang === 'es' ? 'es_US' : 'en_US'} />
      <meta key="og:title" property="og:title" content={title} />
      {description ? <meta key="og:description" property="og:description" content={description} /> : null}
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:image" property="og:image" content={OG_IMAGE} />
      <meta key="og:image:width" property="og:image:width" content="1200" />
      <meta key="og:image:height" property="og:image:height" content="630" />
      <meta key="og:image:alt" property="og:image:alt" content="DinoMeals — smoked and grilled meal prep in Riverside, CA" />
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={title} />
      {description ? <meta key="twitter:description" name="twitter:description" content={description} /> : null}
      <meta key="twitter:image" name="twitter:image" content={OG_IMAGE} />
      {jsonLd ? (
        <script
          key="ld-json"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      ) : null}
    </Head>
  );
}

// "(909) 436-6621" -> "+1-909-436-6621"
function e164(phone) {
  const d = String(phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `+1-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : undefined;
}

// Business card for Google: name, phone, city, Instagram, menu link.
export function businessJsonLd(settings) {
  const phone = e164((settings && settings.business_phone) || CONTACT_PHONE);
  return {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    '@id': `${SITE_URL}/#business`,
    name: SITE_NAME,
    alternateName: 'Dino Meals',
    legalName: 'Dino Meals LLC',
    description:
      'Weekly meal prep with bite in Riverside, CA — smoked tri-tip, grilled chicken, garlic butter shrimp and more, portioned and packed. Build your box, pay ahead, Sunday pickup or delivery.',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/logo-mark.png`,
    image: [`${SITE_URL}/og-image.png`, `${SITE_URL}/logo-mark.png`],
    ...(phone ? { telephone: phone } : {}),
    email: 'dinomealsllc@gmail.com',
    servesCuisine: ['Meal prep', 'BBQ', 'American'],
    priceRange: '$$',
    hasMenu: `${SITE_URL}/#menu`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Riverside',
      addressRegion: 'CA',
      addressCountry: 'US',
    },
    areaServed: 'Riverside, CA',
    sameAs: ['https://instagram.com/dino.meals'],
  };
}
