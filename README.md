# DinoMeals — Meal Prep Ordering App

Customer website + installable phone app + kitchen dashboard for **DinoMeals** (Juan Carlos · IG @dino.meals).
Built with Next.js (pages router) + Supabase, deployed on Vercel — same stack as the Fresas app, all-new design.

## What's in it

**Customer side**
- `/` — home: splash loader, hero, how it works, full menu (Meal prep / By the lb toggle), EN/ES.
- `/order` — order builder:
  - **Meal prep**: pick protein (+ flavor), carb, veggie → "Add 4 meals". 8-meal minimum (2 sets of 4). Live price, macros (once entered), allergen warnings.
  - **By the lb**: mix & match, 4 lb minimum.
  - **Custom**: free-text request → goes to the kitchen as a quote.
  - "Order your usual": type phone number → reload a past order in one tap.
  - Checkout: name/phone, Sunday pickup or Monday delivery (address + ZIP), Zelle/Cash/Card, allergies & diet.
  - Confirmation shows order # and how to pay (Zelle info / card link / cash note from settings).

**Kitchen side** — `/admin` (password)
- **Orders** — by cook week (Sunday). Paid/unpaid toggle, status, custom-quote pricing, cancel/delete, copy to next week, CSV export.
- **Cook sheet** — exactly how many lbs of each protein/carb/veggie to cook, meal container count, printable packing list with allergy flags.
- **Payments** — collected vs owed, one-tap "Mark paid", pre-written text reminders.
- **Delivery** — Monday stops sorted by ZIP, reorder ▲▼, "Open route" in Google Maps, "on the way" text.
- **Regulars** — anyone with 2+ weeks; one tap (or "add all") copies their usual into this week.
- **+ DM order** — enter orders that came in by IG DM / text / call so everything lives in one place.
- **Menu & settings** — open/close ordering, weekly cutoff, banner, sold-out toggles, macros, allergen labels, payment info, pickup/delivery windows, delivery fee, allowed ZIPs.

## Run it

Demo mode (no database, sample orders, admin password `dinodemo`):

```
npm install
npm run dev
```

## Go live
1. Create a Supabase project → SQL Editor → run `supabase-schema.sql`.
2. Create a Vercel project from this folder/repo and add env vars from `.env.example`
   (`SUPABASE_URL`, `SUPABASE_KEY`, `DINO_DB_SECRET`, `ADMIN_PASSWORD`, `SESSION_SECRET` — see .env.example).
3. Deploy, open `/admin`, fill in **Menu & settings** (Zelle, kitchen address, macros, ZIPs).

## Where things live
- Prices & menu items: `lib/menu.js` (server recomputes every total from here).
- Text (English/Spanish): `lib/i18n.js`.
- Look & feel: `styles/globals.css`. Loader: `components/SplashScreen.js`.
- Data layer (Supabase or demo): `lib/db.js`. APIs: `pages/api/*`.

## To confirm with Juan Carlos
- Allergen labels pre-filled as a starting point (shrimp: shellfish/dairy, tilapia: fish, mashed: dairy, teriyaki: soy/wheat, Korean BBQ: soy/wheat/sesame) — verify in admin.
- Macros: enter per-portion numbers in admin.
- Weekly cutoff defaults to Friday 8 PM. Delivery fee defaults to $0.
- "Burgers" by the lb: Classic $22, Smashed/Smoked +$1. "Seasoned" ground beef and "Classic" chicken are the no-upcharge options.
- Logo was cropped from the menu photo — send the original logo file for a sharper version.

## Live
- Site: https://dinomeals.vercel.app (order page `/order`, kitchen `/admin`)
- Hosted on Vercel project `dinomeals`; database is the Supabase project "DinoMeals".
- Deployed by direct upload (no GitHub). To auto-deploy on changes, push this folder
  to a GitHub repo and connect it in Vercel → Project → Settings → Git.
