-- ============================================================
-- Run this once in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- POSTS TABLE
-- ============================================================
create table if not exists posts (
  id          uuid primary key default uuid_generate_v4(),
  author_id   uuid references auth.users(id) on delete cascade not null,
  title       text not null default '',
  slug        text unique not null,
  excerpt     text default '',
  content     text default '',
  cover_image text default null,
  tags        text[] default '{}',
  published   boolean not null default false,
  is_public   boolean not null default true,
  read_time   int not null default 1,
  views       bigint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table posts enable row level security;

-- Public can only read published + public posts
create policy "Public read published posts"
  on posts for select
  using (published = true and is_public = true);

-- Authenticated author has full access to their own posts
create policy "Author full access"
  on posts for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- ============================================================
-- AUTO-UPDATE updated_at ON SAVE
-- ============================================================
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_posts_updated
  before update on posts
  for each row execute procedure handle_updated_at();

-- ============================================================
-- VIEW COUNTER RPC (callable without auth)
-- ============================================================
create or replace function increment_views(post_id uuid)
returns void language sql security definer as $$
  update posts set views = views + 1 where id = post_id;
$$;

-- ============================================================
-- PROJECTS TABLE
-- ============================================================
create table if not exists projects (
  id           uuid primary key default uuid_generate_v4(),
  author_id    uuid references auth.users(id) on delete cascade not null,
  title        text not null default '',
  description  text default '',
  github_url   text default null,
  demo_url     text default null,
  tech_stack   text[] default '{}',
  cover_image  text default null,
  is_completed boolean default false,
  display_order int default 999,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table projects enable row level security;

create policy "Public read projects"
  on projects for select
  using (true);

create policy "Author full access projects"
  on projects for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- ============================================================
-- SITE SETTINGS TABLE (For Active Resume & Global Configs)
-- ============================================================
create table if not exists site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

create policy "Public read site_settings"
  on site_settings for select
  using (true);

create policy "Authenticated upsert site_settings"
  on site_settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- SUPABASE STORAGE BUCKET: resumes (Optional)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('resumes', 'resumes', true) on conflict (id) do nothing;
-- create policy "Public Read Resumes" on storage.objects for select using (bucket_id = 'resumes');
-- create policy "Authenticated Upload Resumes" on storage.objects for insert with check (bucket_id = 'resumes' and auth.role() = 'authenticated');

-- ============================================================
-- SETUP INSTRUCTIONS
-- ============================================================
-- After running this SQL:
-- 1. Go to Authentication → Users in the Supabase Dashboard
-- 2. Click "Invite user" or "Add user" → add your email + password
-- 3. This becomes your author account for Studio login
-- 4. Open studio/studio.html locally and sign in with those credentials
