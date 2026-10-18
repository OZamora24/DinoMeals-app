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
  payment_method text not null,            -- zelle | cash | card
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
