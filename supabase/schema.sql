-- ============================================================
-- TWDGM — Supabase Schema
-- Run this entire file in the Supabase SQL editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "citext";   -- case-insensitive text type for usernames

-- ── Helpers ──────────────────────────────────────────────────
create or replace function generate_player_tag()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  tag   text := '#';
  i     int;
begin
  for i in 1..8 loop
    tag := tag || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return tag;
end;
$$;

-- ── Seasons ───────────────────────────────────────────────────
create table if not exists seasons (
  id         serial      primary key,
  name       text        not null default 'Season 1',
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  active     boolean     not null default true
);

-- Seed Season 1
insert into seasons (name, started_at, active)
values ('Season 1', now(), true)
on conflict do nothing;

-- ── Users ────────────────────────────────────────────────────
-- username is citext so "Alex" and "alex" are treated as the same username.
-- Passwords are managed entirely by Supabase Auth (auth.users); no hash stored here.
create table if not exists users (
  id              uuid        primary key default gen_random_uuid(),
  username        citext      not null unique,   -- case-insensitive unique
  player_tag      text        not null unique default generate_player_tag(),
  trophies        int         not null default 0,
  peak_trophies   int         not null default 0,
  avg_card_level  numeric(4,2) not null default 1.0,  -- reserved, all level 1 for now
  favourite_card  text,                                -- card id string
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

-- ── Sessions (active logins, for concurrent session detection) ──
create table if not exists sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references users(id) on delete cascade,
  in_game      boolean     not null default false,
  last_ping    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);

-- Auto-expire sessions not pinged in 60 seconds (enforced by Worker, not DB)
-- Worker deletes rows where last_ping < now() - interval '60 seconds'

-- ── Season Stats (per user per season) ───────────────────────
create table if not exists season_stats (
  id          serial  primary key,
  user_id     uuid    not null references users(id) on delete cascade,
  season_id   int     not null references seasons(id) on delete cascade,
  wins        int     not null default 0,
  losses      int     not null default 0,
  trophies    int     not null default 0,
  unique (user_id, season_id)
);

-- ── Match History ─────────────────────────────────────────────
create table if not exists matches (
  id              uuid        primary key default gen_random_uuid(),
  season_id       int         not null references seasons(id),
  player_a        uuid        not null references users(id),
  player_b        uuid        not null references users(id),
  winner          uuid        references users(id),   -- null = draw/abandoned
  trophies_a      int         not null,               -- trophies before match
  trophies_b      int         not null,
  delta_a         int         not null default 0,     -- trophy change for a
  delta_b         int         not null default 0,
  crowns_a        int         not null default 0,
  crowns_b        int         not null default 0,
  duration_secs   int,
  played_at       timestamptz not null default now()
);

create index if not exists matches_player_a_idx on matches(player_a);
create index if not exists matches_player_b_idx on matches(player_b);

-- ── Recent 50 games view (for rolling win rate) ───────────────
create or replace view recent_50 as
select
  m.id,
  p.user_id,
  case when m.winner = p.user_id then 1 else 0 end as won
from matches m
cross join lateral (
  values (m.player_a), (m.player_b)
) as p(user_id)
where m.winner is not null;

-- ── Arena brackets (250 trophies each) ───────────────────────
create table if not exists arenas (
  id          serial  primary key,
  name        text    not null,
  min_trophies int    not null,
  max_trophies int    not null
);

insert into arenas (name, min_trophies, max_trophies) values
  ('Training Grounds', 0,    249),
  ('Arena 1',          250,  499),
  ('Arena 2',          500,  749),
  ('Arena 3',          750,  999),
  ('Arena 4',          1000, 1249),
  ('Arena 5',          1250, 1499),
  ('Arena 6',          1500, 1749),
  ('Arena 7',          1750, 1999),
  ('Arena 8',          2000, 2249),
  ('Arena 9',          2250, 2499),
  ('Arena 10',         2500, 9999)
on conflict do nothing;

-- ── Trophy delta function ─────────────────────────────────────
-- Returns how many trophies to award winner / deduct from loser
-- Adjusted slightly for trophy difference (underdog gets more)
create or replace function calc_trophy_delta(
  winner_trophies int,
  loser_trophies  int
) returns int language plpgsql as $$
declare
  base  int := 10;
  diff  int := loser_trophies - winner_trophies;
  bonus int;
begin
  -- Underdog bonus: +1 per 50 trophy gap, capped at +5
  bonus := least(greatest(diff / 50, -5), 5);
  return greatest(base + bonus, 3);  -- minimum 3 trophies
end;
$$;

-- ── Row Level Security ────────────────────────────────────────
alter table users         enable row level security;
alter table sessions      enable row level security;
alter table season_stats  enable row level security;
alter table matches       enable row level security;

-- Users: anyone can read public profile fields, only owner can see password_hash
create policy "public profiles" on users
  for select using (true);

create policy "own user insert" on users
  for insert with check (auth.uid() = id);

create policy "own user write" on users
  for update using (auth.uid() = id);

-- Sessions: only the Worker (service role) manages these
-- Matches: readable by everyone, written only by Worker
create policy "matches readable" on matches
  for select using (true);

-- Season stats: readable by everyone
create policy "season stats readable" on season_stats
  for select using (true);
