-- ---------------------------------------------------------------------------
-- Хаалт: ажилтны апп-ын хүснэгтүүдийг нэвтрээгүй хүнээс хаах
--
-- Нийтийн anon түлхүүр хөтчид ил байдаг тул хүснэгтийн RLS/эрх хаалттай биш бол
-- хэн ч reports, customers, staff… бүгдийг REST-ээр уншиж, бичиж, устгаж чадна.
-- Баталгаатай: 188 тайлан, 116 үйлчлүүлэгч, 14 ажилтан нэвтрэлтгүй уншигдаж байсан.
--
-- ЯАГААД ӨМНӨХ ХУВИЛБАР АЖИЛЛААГҮЙ ВЭ
-- Хуучин RLS-тэй, нэг permissive policy ("бүгдэд унших эрхтэй") байсан хүснэгтүүд
-- байсан. Өмнөх скрипт зөвхөн өөрийн нэрлэсэн policy-г устгадаг байсан тул тэр
-- хуучин policy үлдэж anon уншсаар байв. Одоо БҮХ хуучин policy-г устгаж, anon-ий
-- эрхийг шууд хураана — policy алдаатай ч anon уншиж чадахгүй.
--
-- ҮНДСЭН ЗАРЧИМ
--  • anon (нэвтрээгүй)  → хэзээ ч эрхгүй. Нийтийн асуулга зөвхөн
--                          register_funnel_lead() функцээр customers-д мөр нэмнэ.
--  • батлагдаагүй (pending) бүртгэл → өгөгдөл харахгүй (auth_role() = null).
--  • идэвхтэй ажилтан → унших/бичих. staff-ийн жагсаалтыг бүгд уншина, зөвхөн
--                          админ өөрчилнө.
--  • salary_payments    → зөвхөн админ.
--
-- АЖИЛЛУУЛАХ: Supabase → SQL Editor → бүгдийг нь хуулаад Run. Дахин ажиллуулж болно.
-- ---------------------------------------------------------------------------

-- 0. Аюулгүйн шалгалт: идэвхтэй админ байхгүй бол ЮУ Ч ӨӨРЧЛӨХГҮЙ зогсоно.
--    (Үгүй бол хаалт асаахад админ өөрөө системээс гарч, ороход бүх хүн түгжигдэнэ.)
do $$
declare n int;
begin
  select count(*) into n from public.profiles where role = 'admin' and status = 'active';
  if n = 0 then
    raise exception 'ЗОГСЛОО: public.profiles дотор идэвхтэй (status=active) админ алга. Хаалт асаавал бүгд түгжигдэнэ. Юу ч өөрчлөгдөөгүй.';
  end if;
end $$;

-- 1. auth_role(): нэвтэрсэн хүний үүрэг, ЗӨВХӨН бүртгэл нь идэвхтэй үед.
--    Байхгүй үед л үүсгэнэ (байгаа функцийн төрөлтэй зөрчилдөхгүйн тулд).
do $$
begin
  if to_regprocedure('public.auth_role()') is null then
    execute $f$
      create function public.auth_role()
      returns text language sql security definer stable
      set search_path = public
      as 'select role from public.profiles where id = auth.uid() and status = ''active'' limit 1'
    $f$;
  end if;
end $$;

-- 2. Хүснэгт бүрийг тусад нь хаана. Нэг нь унасан ч бусад нь үргэлжилнэ
--    (унасан хүснэгтийн өөрчлөлт бүхлээрээ буцна — хагас хийгдэхгүй).
do $$
declare
  t text;
  p record;
  errs text := '';
begin
  foreach t in array array['drafts','expenses','messages','reports','schedule','services',
                           'customers','staff','salary_payments']
  loop
    begin
      if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
        errs := errs || t || ': хүснэгт байхгүй; ';
        continue;
      end if;

      -- хуучин бүх policy (нуугдмал permissive-ийг оролцуулан)
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', p.policyname, t);
      end loop;

      execute format('alter table public.%I enable row level security', t);
      -- anon-ий бүх эрхийг хураана: policy алдаатай байсан ч уншиж чадахгүй
      execute format('revoke all on table public.%I from anon, public', t);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

      if t = 'salary_payments' then
        create policy "Admin only" on public.salary_payments
          for all to authenticated
          using ((select public.auth_role()) = 'admin')
          with check ((select public.auth_role()) = 'admin');
      elsif t = 'staff' then
        create policy "Active staff read roster" on public.staff
          for select to authenticated
          using ((select public.auth_role()) is not null);
        create policy "Admin manage roster" on public.staff
          for all to authenticated
          using ((select public.auth_role()) = 'admin')
          with check ((select public.auth_role()) = 'admin');
      else
        execute format(
          'create policy %I on public.%I for all to authenticated '
          'using ((select public.auth_role()) is not null) '
          'with check ((select public.auth_role()) is not null)',
          'Active staff', t);
      end if;
    exception when others then
      errs := errs || t || ': ' || sqlerrm || '; ';
    end;
  end loop;
  perform set_config('lock.errors', errs, false);
end $$;

-- 3. Нийтийн асуулгад үлдээсэн ганц нарийн хаалга: зөвхөн шинэ үйлчлүүлэгч нэмнэ,
--    унших/засах/устгах чадваргүй. SECURITY DEFINER тул anon-д хүснэгтийн эрх хэрэггүй.
create or replace function public.register_funnel_lead(p_name text, p_note jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if p_name is null or btrim(p_name) = '' then
    return;
  end if;
  loop
    v_code := 'SLA-' || (1000 + floor(random() * 9000))::int;
    exit when not exists (select 1 from public.customers where code = v_code);
  end loop;
  insert into public.customers (id, code, name, notes)
  values ('cu' || (extract(epoch from now()) * 1000)::bigint::text,
          v_code, p_name, jsonb_build_array(p_note));
end;
$$;

revoke all on function public.register_funnel_lead(text, jsonb) from public;
grant execute on function public.register_funnel_lead(text, jsonb) to anon, authenticated;

-- 4. ШАЛГАЛТ — энэ нэг хүснэгт гарна. Бүх 9 мөрөнд:
--      rls_on = true,  anon_can_read = false,  errors = хоосон
--    anon_can_read = true эсвэл errors-т текст байвал тэр хүснэгт хаагдаагүй.
select t.tablename,
       t.rowsecurity as rls_on,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = t.tablename) as policies,
       has_table_privilege('anon', 'public.' || t.tablename, 'select') as anon_can_read,
       nullif(current_setting('lock.errors', true), '') as errors
from pg_tables t
where t.schemaname = 'public'
  and t.tablename in ('drafts','expenses','messages','reports','schedule','services',
                      'customers','staff','salary_payments')
order by anon_can_read desc, t.rowsecurity, t.tablename;
