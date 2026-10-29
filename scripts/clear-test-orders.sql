-- DinoMeals: clear TEST orders before the Nov 1, 2026 launch.
-- Run by hand in Supabase: SQL Editor -> New query -> paste -> run STEP 1 first, check it, then STEP 2.
--
-- What counts as a test order (Orlando confirmed):
--   * order_no 1046 to 1059
--   * order_no 1060 (Gabi joto, $239, Nov 1 cook) - TEST order, confirmed Oct 28
--   * every order with cook_date 2026-10-25 (the fake Oct 25 batch)
--
-- Safety rules built in:
--   * CUTOFF: only orders created BEFORE 2026-10-28 00:00 Pacific can ever match.
--     Anything created after that (including every real order) is untouchable.
--   * #1060 is matched by order_no only, NOT by its Nov 1 cook_date, so a real
--     Nov 1 order can never match. It must also be named Gabi... or it is skipped.
--   * cook_date matching is the single day 2026-10-25, never a range.
--   * Everything runs in one transaction with a guard that aborts if the count
--     or the order numbers look wrong. It ends in ROLLBACK by default.
--   * Orders table only: items are a jsonb column, there is no child table.
--   * The order_no counter does NOT reset (first live order will be #1061 or higher). That is fine.

-- ===================== STEP 1: PREVIEW (read only) =====================
-- Expect to see #1046 to #1060 and the Oct 25 batch. #1060 MUST be in this list.
-- If anything looks like a real customer, STOP.
select order_no, created_at at time zone 'America/Los_Angeles' as created_pt,
       cook_date, customer_name, total, payment_method, paid, status
from orders
where created_at < (timestamp '2026-10-28 00:00' at time zone 'America/Los_Angeles')
  and (
        order_no between 1046 and 1059
     or (order_no = 1060 and customer_name ilike 'gabi%')
     or cook_date = date '2026-10-25'
  )
order by order_no;

-- Same preview as a count (compare with the number of rows above):
select count(*) as will_delete,
       count(*) filter (where order_no = 1060) as includes_1060,
       count(*) filter (where cook_date >= date '2026-11-01' and order_no <> 1060) as real_nov1_matches_must_be_0
from orders
where created_at < (timestamp '2026-10-28 00:00' at time zone 'America/Los_Angeles')
  and (
        order_no between 1046 and 1059
     or (order_no = 1060 and customer_name ilike 'gabi%')
     or cook_date = date '2026-10-25'
  );

-- ===================== STEP 2: DELETE (one transaction) =====================
-- Run this whole block at once. It ends with ROLLBACK so nothing is deleted until
-- you are happy with the output: change the last line from ROLLBACK to COMMIT and run again.
begin;

do $$
declare
  n int;
  bad int;
begin
  select count(*) into n
  from orders
  where created_at < (timestamp '2026-10-28 00:00' at time zone 'America/Los_Angeles')
    and (
          order_no between 1046 and 1059
       or (order_no = 1060 and customer_name ilike 'gabi%')
       or cook_date = date '2026-10-25'
    );

  -- Guard 1: nothing outside the test window may match.
  select count(*) into bad
  from orders
  where created_at < (timestamp '2026-10-28 00:00' at time zone 'America/Los_Angeles')
    and (
          order_no between 1046 and 1059
       or (order_no = 1060 and customer_name ilike 'gabi%')
       or cook_date = date '2026-10-25'
    )
    and (order_no > 1060 or (cook_date >= date '2026-11-01' and order_no <> 1060));
  if bad > 0 then
    raise exception 'Aborting: % matched order(s) are outside the test window', bad;
  end if;

  -- Guard 2: sanity cap. Expected is about 15 to 30 test orders.
  if n = 0 or n > 60 then
    raise exception 'Aborting: % orders matched, expected between 1 and 60', n;
  end if;
end $$;

delete from orders
where created_at < (timestamp '2026-10-28 00:00' at time zone 'America/Los_Angeles')
  and (
        order_no between 1046 and 1059
     or (order_no = 1060 and customer_name ilike 'gabi%')
     or cook_date = date '2026-10-25'
  )
returning order_no, customer_name, cook_date, total;

-- Check what is left: should only be orders created on/after the cutoff (or none yet).
select order_no, created_at at time zone 'America/Los_Angeles' as created_pt, cook_date, customer_name
from orders order by order_no;

rollback;  -- change to: commit;  once the output above looks right
