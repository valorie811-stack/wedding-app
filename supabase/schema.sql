-- ============================================================================
-- Two Weddings — single-owner schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL -> New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
--
-- Auth model: the app is a single-owner (bride & groom) tool unlocked by a
-- shared PIN. There are no Supabase Auth users, members, roles, invites, or
-- share links. All data access happens server-side with the SERVICE-ROLE key,
-- so RLS is enabled on every table with NO policies (locked to the service
-- role). Set SUPABASE_SERVICE_ROLE_KEY in the app environment.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Remove legacy multi-user / sharing objects (idempotent).
-- Dropping the helper functions with CASCADE also removes every RLS policy that
-- referenced them (the old *_member_all / owner policies).
-- ----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;
drop function if exists accept_invite() cascade;
drop function if exists is_owner() cascade;
drop function if exists is_member() cascade;

drop table if exists share_otps cascade;
drop table if exists shares cascade;
drop table if exists invites cascade;
drop table if exists members cascade;

-- ----------------------------------------------------------------------------
-- App settings: single row holding the hashed owner PIN. Touched only by the
-- service-role client in server code. RLS on, no policies.
-- ----------------------------------------------------------------------------
create table if not exists app_settings (
  id          smallint primary key default 1,
  pin_hash    text,
  pin_salt    text,
  updated_at  timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

-- ----------------------------------------------------------------------------
-- Core data models: weddings, events, guests, vendors
-- ----------------------------------------------------------------------------
create table if not exists weddings (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,            -- 'HP' | 'KK'
  city        text not null,
  country     text not null,
  event_date  date not null,
  currency    text not null,                   -- 'VND' | 'MYR'
  accent      text not null default 'hp',      -- theme key
  created_at  timestamptz not null default now()
);

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid references weddings (id) on delete cascade, -- null = shared
  name_en     text not null,
  name_vi     text,
  name_zh     text,
  event_date  date,
  start_time  time,
  end_time    time,
  location    text,
  event_type  text default 'ceremony'
              check (event_type in ('ceremony','reception','gathering','other')),
  dress_code  text,
  is_halal    boolean not null default false,
  sort_order  int not null default 0,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists guests (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  side        text default 'both' check (side in ('bride','groom','both')),
  plus_one    boolean not null default false,
  dietary     text[] not null default '{}',    -- e.g. {halal,vegetarian}
  notes       text,
  created_at  timestamptz not null default now()
);

-- Per-event RSVP status (a guest can be invited to many events across weddings)
create table if not exists guest_events (
  guest_id    uuid not null references guests (id) on delete cascade,
  event_id    uuid not null references events (id) on delete cascade,
  rsvp_status text not null default 'pending'
              check (rsvp_status in ('confirmed','pending','declined')),
  primary key (guest_id, event_id)
);

create table if not exists vendors (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid references weddings (id) on delete cascade,
  name            text not null,
  category        text,                        -- photographer, caterer, ...
  contact_name    text,
  email           text,
  phone           text,
  contract_status text default 'enquiry'
                  check (contract_status in ('enquiry','quoted','booked','paid','cancelled')),
  total_cost      numeric(14,2) default 0,
  deposit_paid    numeric(14,2) default 0,
  is_halal_certified boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Per-category planned budget: ONE planned amount per wedding + category.
create table if not exists budget_categories (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid references weddings (id) on delete cascade,
  category    text not null,
  planned     numeric(14,2) not null default 0,
  created_at  timestamptz not null default now(),
  unique (wedding_id, category)
);

-- Actual expense items. A category may have MANY actual line items; planned
-- now lives on budget_categories (not here).
create table if not exists budget_items (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid references weddings (id) on delete cascade,
  category    text not null,
  label       text,
  actual      numeric(14,2) not null default 0,
  created_at  timestamptz not null default now()
);
-- Migrate older installs: planned moved to budget_categories.
alter table budget_items drop column if exists planned;

create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid references weddings (id) on delete cascade, -- null = shared
  title       text not null,
  due_date    date,
  status      text not null default 'todo'
              check (status in ('todo','in_progress','done')),
  assignee    text,
  recur_freq  text
              check (recur_freq in ('daily','weekly','monthly')), -- null = one-off
  recur_until date,           -- optional last occurrence (inclusive)
  remind_days_before int,     -- in-app reminder lead time; null = no reminder
  created_at  timestamptz not null default now()
);

-- Seating (Table Planner): tables per wedding + guest assignments.
create table if not exists seating_tables (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid references weddings (id) on delete cascade,
  name        text not null,
  capacity    int not null default 8,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists seating_assignments (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references seating_tables (id) on delete cascade,
  guest_id    uuid not null references guests (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (table_id, guest_id)
);

-- Mood boards: image (URL) + colour swatches per board/wedding.
create table if not exists moodboard_items (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid references weddings (id) on delete cascade, -- null = shared
  board       text not null default 'General',
  title       text,
  image_url   text,
  swatches    text[] not null default '{}',
  notes       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Attire: outfit ideas per role + wedding, confirmed/inspiration.
create table if not exists attire_items (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid references weddings (id) on delete cascade,
  role        text not null default 'bride'
              check (role in ('bride','groom','family','party','guest','other')),
  title       text,
  image_url   text,
  status      text not null default 'inspiration'
              check (status in ('confirmed','inspiration')),
  notes       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- Every table has RLS enabled with NO policies. The service-role key (used by
-- the server) bypasses RLS; the anon/authenticated roles have no access. This
-- keeps the database locked while the app talks to it server-side only.
-- ----------------------------------------------------------------------------
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'app_settings','weddings','events','guests','guest_events','vendors',
    'budget_categories','budget_items','tasks','seating_tables',
    'seating_assignments','moodboard_items','attire_items'
  ]
  loop
    execute format('alter table %I enable row level security;', tbl);
  end loop;
end $$;
