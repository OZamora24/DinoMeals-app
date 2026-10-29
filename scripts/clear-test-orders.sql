-- DinoMeals: clear TEST orders before launch (Nov 1, 2026).
-- Run in Supabase: SQL Editor -> New query. NOTHING here runs automatically.
--
-- What it deletes (all three must be true):
--   1. order_no 1046-1059  OR  cook_date = 2026-10-25  (the Oct 25 test batch)
--   2. created before 2026-10-28 00:00 Pacific time (safety cutoff)
--   3. order_no is NOT 1060  (Gabi joto, $239 Zelle, Nov 1 cook - not confirmed real)
--
-- Schema notes: order items live INSIDE orders.items (jsonb), so there is no
-- child table to clean. sms_reminders and customer_push are not linked to orders
-- and are NOT touched.

-- ============================================================
-- STEP 1: PREVIEW. Run this block ALONE first and read the list.
-- Expect 14 rows (1046-1059). Nothing else. #1060 must NOT appear.
-- ============================================================
select order_no, created_at at time zone 'America/Los_Angeles' as created_pt,
       cook_date, customer_name, total, payment_method, paid, status
from orders
where (order_no between 1046 and 1059 or cook_date = date '2026-10-25')
  and created_at < timestamptz '2026-10-28 00:00:00-07'
  and order_no <> 1060
order by order_no;

-- Everything that will REMAIN (check #1060 is here and nothing else looks like a test):
select order_no, created_at at time zone 'America/Los_Angeles' as created_pt,
       cook_date, customer_name, total, payment_method, paid, status
from orders
where not ((order_no between 1046 and 1059 or cook_date = date '2026-10-25')
  and created_at < timestamptz '2026-10-28 00:00:00-07'
  and order_no <> 1060)
order by order_no;

-- ============================================================
-- STEP 2: DELETE. Run this block ALONE, only after Step 1 looks right.
-- It is one transaction and ABORTS (deletes nothing) if:
--   - more than 20 rows would be deleted, or
--   - #1060 would be deleted, or
--   - any order created on/after the cutoff would be deleted.
-- Note: timestamptz cutoff uses -07 (Pacific daylight time; DST ends Nov 1).
-- ============================================================
begin;

create temp table _doomed on commit drop as
select id, order_no, created_at
from orders
where (order_no between 1046 and 1059 or cook_date = date '2026-10-25')
  and created_at < timestamptz '2026-10-28 00:00:00-07'
  and order_no <> 1060;

do $$
declare n int;
begin
  select count(*) into n from _doomed;
  if n = 0 or n > 20 then
    raise exception 'Abort: % rows matched (expected about 14). Nothing deleted.', n;
  end if;
  if exists (select 1 from _doomed where order_no = 1060
             or created_at >= timestamptz '2026-10-28 00:00:00-07') then
    raise exception 'Abort: #1060 or a post-cutoff order matched. Nothing deleted.';
  end if;
end $$;

delete from orders where id in (select id from _doomed);

commit;

-- ============================================================
-- STEP 3: VERIFY. Only the orders you meant to keep should be left (#1060 etc.).
-- ============================================================
select order_no, cook_date, customer_name, total, paid, status
from orders order by order_no;

-- LATER, once you confirm #1060 is a test, delete it separately:
--   delete from orders where order_no = 1060;
-- NOTE: order numbers are an identity counter and will NOT restart at 1001.
-- Live orders will continue from the next number. That is normal.
