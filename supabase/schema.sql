-- =========================================================================
-- LIFE.EXE — esquema de Supabase
-- Ejecuta este archivo en: Supabase Dashboard → SQL Editor → New query → Run
-- Todo está protegido con Row Level Security: cada usuario solo ve lo suyo.
-- =========================================================================

-- ---------- Perfil del personaje ----------
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------- Items: notas, ideas, metas, proyectos, outfits, eventos... ----------
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null,
  title       text not null default '',
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists items_user_kind_idx on public.items (user_id, kind);

-- ---------- Conexiones entre nodos (mapa mental) ----------
create table if not exists public.edges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source      uuid not null references public.items(id) on delete cascade,
  target      uuid not null references public.items(id) on delete cascade,
  label       text,
  created_at  timestamptz not null default now()
);
create index if not exists edges_user_idx on public.edges (user_id);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.items    enable row level security;
alter table public.edges    enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own items" on public.items;
create policy "own items" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own edges" on public.edges;
create policy "own edges" on public.edges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Storage privado para PDFs / archivos / fotos de outfits ----------
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do nothing;

-- Los archivos se guardan en  vault/<user_id>/<archivo>
drop policy if exists "vault read own"   on storage.objects;
drop policy if exists "vault insert own" on storage.objects;
drop policy if exists "vault delete own" on storage.objects;

create policy "vault read own" on storage.objects for select
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vault insert own" on storage.objects for insert
  with check (bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vault delete own" on storage.objects for delete
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text);
