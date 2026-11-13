-- DinoMeals database — run once in Supabase: SQL Editor -> New query -> paste -> Run

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity (start with 1001),
  created_at timestamptz not null default now(),
  cook_date date not null,                 -- the Sunday this order gets cooked
  customer_name text not null,
  phone text not null,
  phone_digits text not null,
  email text default '',
  items jsonb not null default '[]',       -- priced lines (meal sets + by-the-lb)
  meal_count int not null default 0,
  lb_total numeric not null default 0,
  subtotal numeric,
  delivery_fee numeric not null default 0,
  total numeric,                           -- null = custom order waiting on a quote
  fulfillment text not null default 'pickup',  -- pickup | delivery
  address text default '',
  zip text default '',
  delivery_notes text default '',
  payment_method text not null,            -- zelle | cash | card | venmo
  paid boolean not null default false,
  paid_at timestamptz,
  status text not null default 'new',      -- new | quote | confirmed | cooking | ready | done | cancelled
  diet text[] not null default '{}',
  allergy_notes text default '',
  notes text default '',
  custom_request text default '',
  lang text default 'en',
  source text default 'web',               -- web | dm | text | call | repeat
  route_pos int,
  sms_opt_in boolean not null default false,   -- ticked the text-updates box at checkout
  sms_opt_in_at timestamptz,
  sms_sent jsonb not null default '{}'         -- {confirm|paid|ready: sent-at} so a text never repeats
);

create index if not exists orders_cook_date_idx on orders (cook_date);
create index if not exists orders_phone_idx on orders (phone_digits);

create table if not exists shop_settings (
  id int primary key,
  data jsonb not null default '{}'
);
insert into shop_settings (id, data) values (1, '{}') on conflict (id) do nothing;

-- RLS on, no public policies: the browser never talks to Supabase directly,
-- only the server (API routes) using the service role key.
alter table orders enable row level security;
alter table shop_settings enable row level security;

-- Weekly cutoff-reminder texts: one row per phone that ticked the separate reminder box.
alter table orders add column if not exists reminder_opt_in boolean not null default false;
create table if not exists sms_reminders (
  phone_digits text primary key,
  name text default '',
  lang text not null default 'en',
  opted_in_at timestamptz not null default now(),
  opted_out_at timestamptz,      -- set when they reply STOP
  last_sent_week date            -- cook week of the last reminder (never twice a week)
);
alter table sms_reminders enable row level security;

-- Private, unguessable code for the customer's order page (dinomeals.app/o/<code>).
-- Shown in the confirmation text and on the confirmation screen; never the address or phone.
alter table orders add column if not exists view_token text not null
  default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
create unique index if not exists orders_view_token_key on orders (view_token);

-- Customers who turned on notifications in the app / website (promo + reminder pop-ups from /admin -> Messages).
create table if not exists customer_push (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  lang text not null default 'en',
  created_at timestamptz not null default now()
);
alter table customer_push enable row level security;

-- Custom-quote orders: meals entered in the admin label editor (any oz/gram amounts),
-- used only to print labels. [{ protein, flavor, carb, veg, amt: {protein:[7,'oz'],...}, count }]
alter table orders add column if not exists label_lines jsonb not null default '[]'::jsonb;

-- Promo codes: the code an order used ({code, type, value}) and the $ taken off the food subtotal.
alter table orders add column if not exists promo jsonb;
alter table orders add column if not exists discount numeric not null default 0;

-- Customer Loyalty Rewards + Referral program (Nov 2026). Safe to run more than once.
alter table public.orders add column if not exists reward jsonb;
alter table public.orders add column if not exists referral jsonb;
alter table public.orders add column if not exists ref_credit jsonb;
create index if not exists orders_referral_by_idx on public.orders ((referral->>'by'));

-- Trainer Partner program + Monthly Plan (Nov 2026; applied to the live database Nov 7)
alter table public.orders add column if not exists trainer jsonb;         -- client's order: trainer code used { code, by, name, pct, first, discount }
alter table public.orders add column if not exists trainer_credit jsonb;  -- trainer's own order: $ meal credits used { ids, amount }
alter table public.orders add column if not exists monthly jsonb;         -- Monthly Plan week { id, week, of, pct, discount, plan_total }
alter table public.orders add column if not exists stripe jsonb;          -- online payment { paid, amount, session, payment_intent, livemode, at, short? }
create index if not exists orders_trainer_by_idx on public.orders ((trainer->>'by'));
create index if not exists orders_monthly_id_idx on public.orders ((monthly->>'id'));

-- Customer reviews (Nov 2026). One per order, from the customer's private order page. Safe to run more than once.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references public.orders(id) on delete cascade,
  order_no int,
  phone_digits text,
  display_name text,                                  -- "Maria L." (never the full name or phone)
  stars int not null check (stars between 1 and 5),
  meals jsonb not null default '[]'::jsonb,           -- [{ key: 'p:tritip', stars: 5 }]
  comment text not null default '',
  lang text not null default 'en',
  status text not null default 'published' check (status in ('published','hidden')),
  reply text not null default '',                     -- Juan's public reply
  reply_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
drop policy if exists "server only" on public.reviews;
create policy "server only" on public.reviews for all to anon, authenticated using (private.dino_authorized()) with check (private.dino_authorized());
create index if not exists reviews_phone_idx on public.reviews (phone_digits);
create index if not exists reviews_created_idx on public.reviews (created_at desc);
alter table public.orders add column if not exists review_asked_at timestamptz;  -- last time the Thursday text asked this order for a review

-- Food photos (Nov 2026). Juan uploads in Admin → Photos; shown on the home page and /photos.
-- Pictures are stored here (base64, already shrunk on the phone) and served from /api/photo/<id> with long caching.
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  caption text not null default '',
  sort int not null default 0,                  -- Juan's order (low first), then newest first
  hidden boolean not null default false,
  w int,
  h int,
  mime text not null default 'image/webp',
  thumb_mime text not null default 'image/webp',
  data text not null,                           -- full picture (about 1400 px), base64
  thumb text not null                           -- thumbnail (about 560 px), base64
);
alter table public.photos enable row level security;
drop policy if exists "server only" on public.photos;
create policy "server only" on public.photos for all to anon, authenticated using (private.dino_authorized()) with check (private.dino_authorized());
create index if not exists photos_order_idx on public.photos (hidden, sort, created_at desc);

-- Kitchen login lock (Nov 2026): 5 wrong passwords from one device lock it for 15 minutes (lib/loginGuard.js).
create table if not exists public.login_guard (
  key text primary key,                 -- hashed device IP, never the IP itself
  fails int not null default 0,
  last_fail_at timestamptz,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.login_guard enable row level security;
create policy "server only" on public.login_guard for all to anon, authenticated using (private.dino_authorized()) with check (private.dino_authorized());
