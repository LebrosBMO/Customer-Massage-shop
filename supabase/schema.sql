-- Run this in the Supabase SQL editor to create the reservations table.
-- Dashboard: your project > SQL Editor > New query > paste > Run.

create table if not exists public.salon_reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text,
  location_id text,
  service text,
  masseuse text,
  preferred_date date,
  preferred_time time,
  notes text,
  status text not null default 'new'
);

-- Enable Row Level Security.
alter table public.salon_reservations enable row level security;

-- Allow anonymous visitors to submit a reservation (INSERT only).
-- They cannot read, update, or delete rows.
create policy "Public can create reservations"
  on public.salon_reservations
  for insert
  to anon
  with check (true);

-- NOTE: Reading reservations is intentionally NOT granted to the anon role.
-- View submissions in the Supabase Table Editor, or use the built-in admin
-- panel at /admin (sign in with a Supabase Auth user).

-- Admin access: any signed-in (authenticated) user may read and update
-- reservations. Create staff logins in the Supabase dashboard:
--   Authentication > Users > Add user (email + password).
create policy "Staff can read reservations"
  on public.salon_reservations
  for select
  to authenticated
  using (true);

create policy "Staff can update reservations"
  on public.salon_reservations
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Staff can delete reservations"
  on public.salon_reservations
  for delete
  to authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- Services: editable from the admin panel (/admin > Үйлчилгээ tab).
-- ---------------------------------------------------------------------------
create table if not exists public.salon_services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sort_order int not null default 0,
  name text not null,
  duration text,
  price_60 text,
  price_90 text,
  blurb text,
  image text,
  active boolean not null default true
);

alter table public.salon_services enable row level security;

-- Public visitors can read only active services (for the public site).
create policy "Public can read active services"
  on public.salon_services
  for select
  to anon
  using (active = true);

-- Signed-in staff can read all services (including hidden) and edit them.
create policy "Staff can read all services"
  on public.salon_services for select to authenticated using (true);
create policy "Staff can insert services"
  on public.salon_services for insert to authenticated with check (true);
create policy "Staff can update services"
  on public.salon_services for update to authenticated using (true) with check (true);
create policy "Staff can delete services"
  on public.salon_services for delete to authenticated using (true);

-- Seed the table with the starter services so a fresh site is not empty.
insert into public.salon_services (sort_order, name, duration, price_60, price_90, blurb, image)
values
  (0, 'Сонгодог тайвшруулах массаж', '60–90 мин', '150,000₮', '200,000₮', 'Бүх биеийг хамарсан, дулаахан тосоор хийх уян урсгалтай массаж нь хурцадлыг тайлж, тав тухыг сэргээнэ.', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=70'),
  (1, 'Тантрик массаж', '90 мин', '200,000₮', '280,000₮', 'Амьсгалыг чиглүүлж, мэдрэхүйг сэрээн, гүн амралтад хүргэх удаан, ухамсартай зан үйл.', 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=70'),
  (2, 'Бие-биеийн массаж', '60 мин', '240,000₮', '320,000₮', 'Дулаан, ойр дотно байдал, зөөлөн хөдөлгөөнд тулгуурласан халуун дотно мэдрэмж.', 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=70'),
  (3, 'Хосуудын массаж', '90 мин', '360,000₮', '480,000₮', 'Хажуу хажуугаа орших — хоёр хүний дотно холбоог сэргээх тайван зан үйл.', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=70'),
  (4, 'Анхилуун үнэрт эмчилгээ', '75 мин', '180,000₮', '240,000₮', 'Таны сэтгэл санаанд тохируулан сонгосон эфирийн тосны хольц, тайвшруулах даралттай хослуулсан зан үйл.', 'https://images.unsplash.com/photo-1556760544-74068565f05c?w=800&q=70'),
  (5, 'Халуун чулуун эмчилгээ', '80 мин', '190,000₮', '260,000₮', 'Гөлгөр халуун чулуу нь булчингийн гүн хурцадлыг тайлж, бүх биед амар амгаланг авчирна.', 'https://images.unsplash.com/photo-1591343395082-e120087004b4?w=800&q=70')
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- Funnel questions: the step-by-step questionnaire, editable in /admin.
-- `choices` is JSON: [{ "label": "...", "disqualifies": false }, ...]
-- ---------------------------------------------------------------------------
create table if not exists public.salon_funnel_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sort_order int not null default 0,
  question text not null,
  choices jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

alter table public.salon_funnel_questions enable row level security;

create policy "Public can read active questions"
  on public.salon_funnel_questions for select to anon using (active = true);
create policy "Staff can read all questions"
  on public.salon_funnel_questions for select to authenticated using (true);
create policy "Staff can insert questions"
  on public.salon_funnel_questions for insert to authenticated with check (true);
create policy "Staff can update questions"
  on public.salon_funnel_questions for update to authenticated using (true) with check (true);
create policy "Staff can delete questions"
  on public.salon_funnel_questions for delete to authenticated using (true);

-- Seeded linear (no branching). Add branching per-answer in /admin > Асуулга —
-- the admin stores each choice's `next` as the real question id.
insert into public.salon_funnel_questions (sort_order, question, choices) values
  (0, 'Та урьд нь манай үйлчилгээг авч байсан уу?',
      '[{"label":"Тийм, өмнө нь","disqualifies":false},{"label":"Үгүй, анх удаа","disqualifies":false}]'::jsonb),
  (1, 'Таны нас?',
      '[{"label":"18-аас доош","disqualifies":true},{"label":"18 – 25","disqualifies":false},{"label":"26 – 40","disqualifies":false},{"label":"40-өөс дээш","disqualifies":false}]'::jsonb),
  (2, 'Ямар үйлчилгээ сонирхож байна?',
      '[{"label":"Сонгодог тайвшруулах","disqualifies":false},{"label":"Тантрик массаж","disqualifies":false},{"label":"Хосуудын массаж","disqualifies":false},{"label":"Бусад / Мэдэхгүй","disqualifies":false}]'::jsonb),
  (3, 'Хэзээ зочлохыг хүсэж байна?',
      '[{"label":"Өнөөдөр","disqualifies":false},{"label":"Энэ долоо хоногт","disqualifies":false},{"label":"Дараа нь төлөвлөж байна","disqualifies":false}]'::jsonb),
  (4, 'Захиалгаа баталгаажуулахын тулд бага хэмжээний урьдчилгаа төлөхөд бэлэн үү?',
      '[{"label":"Тийм, бэлэн","disqualifies":false},{"label":"Үгүй","disqualifies":true}]'::jsonb)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- Funnel submissions: a completed questionnaire (with answers + contact).
-- ---------------------------------------------------------------------------
create table if not exists public.salon_funnel_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  phone text,
  answers jsonb,
  qualified boolean,
  payment_status text not null default 'pending',
  amount int
);

alter table public.salon_funnel_submissions enable row level security;

-- Anyone can submit; only staff can read/manage.
create policy "Public can create submissions"
  on public.salon_funnel_submissions for insert to anon with check (true);
create policy "Staff can read submissions"
  on public.salon_funnel_submissions for select to authenticated using (true);
create policy "Staff can update submissions"
  on public.salon_funnel_submissions for update to authenticated using (true) with check (true);
