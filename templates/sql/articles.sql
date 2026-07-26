-- Standard PostgreSQL - run it once with whatever client you use: the
-- Supabase SQL Editor, psql, Neon/RDS console, anything. Using a different
-- database (MySQL, SQLite, an ORM schema)? Recreate the same columns - the
-- one thing the webhook relies on is the UNIQUE (slug, language_code) key it
-- upserts against. The RLS block at the bottom is only meaningful on
-- Supabase/Postgres - drop it elsewhere and protect writes your own way.
--
-- Matches the upsert snippet exactly, including the UNIQUE key it needs.
create table if not exists public.articles (
  id                   uuid primary key default gen_random_uuid(),
  vellumup_id          uuid,
  slug                 text not null,
  language_code        text not null default 'en',
  language_name        text,
  title                text not null,
  content              text not null,
  status               text not null default 'published',
  cover_image          text,
  cover_image_url      text,
  meta_description     text,
  focus_keyword        text,
  secondary_keywords   text[] default '{}',
  key_takeaways        jsonb  default '[]',
  internal_link_slugs  text[] default '{}',
  word_count           integer,
  reading_time_minutes integer,
  website_url          text,
  website_domain       text,
  og_title             text,
  og_description       text,
  og_type              text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique (slug, language_code)
);

-- Visitors may read published articles; only your webhook
-- (service role - bypasses RLS) can write.
alter table public.articles enable row level security;

create policy "Public read published articles"
  on public.articles for select
  using (status = 'published');