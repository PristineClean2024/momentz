-- Momentz database schema
-- Run this in your Supabase project's SQL Editor (Project > SQL Editor > New query)

create extension if not exists "uuid-ossp";

create table if not exists guests (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references guests(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz default now()
);

create table if not exists post_allowed_guests (
  post_id uuid references posts(id) on delete cascade,
  guest_id uuid references guests(id) on delete cascade,
  primary key (post_id, guest_id)
);

create table if not exists likes (
  post_id uuid references posts(id) on delete cascade,
  guest_id uuid references guests(id) on delete cascade,
  primary key (post_id, guest_id)
);

create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  author_id uuid references guests(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- Row Level Security
-- NOTE (read this): guests in this MVP are not authenticated Supabase users --
-- they just type a name to join, same as the prototype. That means these
-- policies allow any request with your public anon key to read/write.
-- "Private" posts are hidden by the app's UI, but a technically savvy person
-- calling the API directly could still read them. Fine for a wedding shared
-- with people you trust; if you later want privacy enforced at the database
-- level, add Supabase Auth (e.g. magic-link or anonymous sign-in) and rewrite
-- these policies to check auth.uid() instead of "true".

alter table guests enable row level security;
alter table posts enable row level security;
alter table post_allowed_guests enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;

create policy "public read guests" on guests for select using (true);
create policy "public insert guests" on guests for insert with check (true);

create policy "public read posts" on posts for select using (true);
create policy "public insert posts" on posts for insert with check (true);

create policy "public read allowed" on post_allowed_guests for select using (true);
create policy "public insert allowed" on post_allowed_guests for insert with check (true);

create policy "public read likes" on likes for select using (true);
create policy "public write likes" on likes for insert with check (true);
create policy "public delete likes" on likes for delete using (true);

create policy "public read comments" on comments for select using (true);
create policy "public insert comments" on comments for insert with check (true);

create table if not exists settings (
  id int primary key default 1,
  reminders_email boolean not null default true,
  reminders_sms boolean not null default false
);
insert into settings (id) values (1) on conflict (id) do nothing;

alter table settings enable row level security;
create policy "public read settings" on settings for select using (true);
create policy "public update settings" on settings for update using (true);

-- Realtime: let the app subscribe to live changes
alter publication supabase_realtime add table guests, posts, likes, comments, post_allowed_guests, settings;
