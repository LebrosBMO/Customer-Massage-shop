-- ---------------------------------------------------------------------------
-- Lock down the shop-manager app's tables (customers, staff, reports, etc).
-- These pre-date this schema and currently have NO row-level security, so
-- the public anon key (shipped in every visitor's browser, same as any
-- client-side Supabase key) can read/write/delete them directly via the
-- REST API. Confirmed live: anon could read plaintext staff passwords and
-- freely insert/delete rows in `customers`.
--
-- Run this whole file once in the Supabase SQL Editor. Safe to re-run.
--
-- IMPORTANT — do this first, before running this file:
--   Deploy the updated index.html (the `sb` object now attaches the logged
--   -in user's own session token instead of always using the anon key).
--   Log in as each role once and confirm the dashboard still loads data.
--   If you skip this, every staff member gets locked out the moment RLS
--   goes live, because their requests would still be sent as anon.
-- ---------------------------------------------------------------------------

-- Reads the current logged-in user's role from `profiles` (only if their
-- account is active — pending/rejected accounts get no role at all).
create or replace function public.auth_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and status = 'active' limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Plain "any logged-in staff member" tables — no anon access needed at all.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['drafts','expenses','messages','reports','schedule','services']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Staff can manage %1$s" on public.%1$I', t);
    execute format(
      'create policy "Staff can manage %1$s" on public.%1$I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- staff — everyone logged in can view the roster (needed for scheduling /
-- messaging), but only admins can add/edit/remove staff rows. This matches
-- what the approval-panel UI already assumes, now enforced at the DB level
-- too instead of only in the client.
-- ---------------------------------------------------------------------------
alter table public.staff enable row level security;
drop policy if exists "Staff can view roster" on public.staff;
create policy "Staff can view roster" on public.staff for select to authenticated using (true);
drop policy if exists "Admin can manage roster" on public.staff;
create policy "Admin can manage roster" on public.staff for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- salary_payments — sensitive; admin only, both read and write.
-- ---------------------------------------------------------------------------
alter table public.salary_payments enable row level security;
drop policy if exists "Admin can manage salary" on public.salary_payments;
create policy "Admin can manage salary" on public.salary_payments for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- customers — shared between this app and the public salon-site funnel.
-- Staff (logged in) get full access. The public funnel no longer touches
-- this table directly at all — it calls register_funnel_lead() below, which
-- runs with elevated rights internally but only exposes a narrow, safe
-- "create or append a note" operation. Update Funnel.jsx's
-- createJournalCustomer() to call this RPC (already done in this session).
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
drop policy if exists "Staff can manage customers" on public.customers;
create policy "Staff can manage customers" on public.customers for all to authenticated using (true) with check (true);

create or replace function public.register_funnel_lead(p_name text, p_note jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_notes jsonb;
  v_code text;
begin
  if p_name is null or btrim(p_name) = '' then
    return;
  end if;

  select id, notes into v_id, v_notes from public.customers where name ilike p_name limit 1;

  if v_id is not null then
    update public.customers
      set notes = coalesce(v_notes, '[]'::jsonb) || jsonb_build_array(p_note)
      where id = v_id;
    return;
  end if;

  loop
    v_code := 'SLA-' || (1000 + floor(random() * 9000))::int;
    exit when not exists (select 1 from public.customers where code = v_code);
  end loop;

  insert into public.customers (id, code, name, notes)
  values ('cu' || (extract(epoch from now()) * 1000)::bigint::text, v_code, p_name, jsonb_build_array(p_note));
end;
$$;

revoke all on function public.register_funnel_lead(text, jsonb) from public;
grant execute on function public.register_funnel_lead(text, jsonb) to anon, authenticated;
