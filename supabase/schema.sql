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
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  side          text default 'both' check (side in ('bride','groom','both')),
  plus_one      boolean not null default false,
  plus_one_name text,                            -- null unless plus_one is true
  dietary       text[] not null default '{}',    -- e.g. {halal,vegetarian}
  notes         text,
  country       text,                            -- Australia | Malaysia | Vietnam | Indonesia | Misc countries
  category      text,                            -- Family | Friends | Work | Other
  invite_or_not text,                            -- Invite | Not 100%
  party_size    int,                             -- ATTENDING heads this row brings, THIS GUEST INCLUDED; null = not recorded
  created_at    timestamptz not null default now()
);
-- Migrate older installs: the create above is `if not exists`, so on a database
-- that already has the table it is a no-op and these columns would never appear.
alter table guests add column if not exists plus_one_name text;
alter table guests add column if not exists country       text;
alter table guests add column if not exists category      text;
alter table guests add column if not exists invite_or_not text;
alter table guests add column if not exists party_size    int;

-- Constraints and defaults for these columns live in the RECONCILE section near
-- the end of this file, not here. See the note there for why.

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
  wedding_id      uuid not null references weddings (id) on delete cascade,
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

-- Migrate older installs: wedding_id used to be nullable here too. A vendor
-- belongs to exactly one wedding — the Vendors page groups by it and its
-- deposits are attributed to that wedding's budget — so a null leaves the
-- vendor unreachable in every scoped view while its money still counts.
-- Warn rather than abort, matching the budget tables below.
do $$
declare bad_vendors int;
begin
  select count(*) into bad_vendors from vendors where wedding_id is null;
  if bad_vendors > 0 then
    raise warning using message = format(
      'Skipped NOT NULL on vendors.wedding_id: %s row(s) have none. '
      'Assign each to a wedding (or delete it), then re-run this file.',
      bad_vendors);
  else
    alter table vendors alter column wedding_id set not null;
  end if;
end $$;

-- Per-category planned budget: ONE planned amount per wedding + category.
create table if not exists budget_categories (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references weddings (id) on delete cascade,
  category    text not null,
  planned     numeric(14,2) not null default 0,
  created_at  timestamptz not null default now(),
  unique (wedding_id, category)
);

-- Actual expense items. A category may have MANY actual line items; planned
-- now lives on budget_categories (not here).
create table if not exists budget_items (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references weddings (id) on delete cascade,
  category    text not null,
  label       text,
  actual      numeric(14,2) not null default 0,
  created_at  timestamptz not null default now()
);
-- Migrate older installs: planned moved to budget_categories.
alter table budget_items drop column if exists planned;

-- Migrate older installs: wedding_id used to be nullable on both budget tables.
--
-- Unlike `tasks`, a budget row has no "shared" meaning — the Budget page groups
-- every row under one wedding or the other, so a null wedding_id renders
-- nowhere while still counting toward the combined AUD rollup. That is money on
-- screen with no line to explain it, which is the whole bug class this closes.
--
-- Warn rather than abort when such rows already exist: this file is documented
-- as safe to re-run, and a hard failure here would stop the rest of it. The
-- warning names what to fix, and re-running applies the constraint afterwards.
do $$
declare
  bad_items int;
  bad_cats  int;
begin
  select count(*) into bad_items from budget_items where wedding_id is null;
  select count(*) into bad_cats  from budget_categories where wedding_id is null;

  if bad_items > 0 or bad_cats > 0 then
    raise warning using message = format(
      'Skipped NOT NULL on wedding_id: %s budget_items and %s budget_categories row(s) have none. '
      'Assign each to a wedding (or delete it), then re-run this file.',
      bad_items, bad_cats);
  else
    alter table budget_items      alter column wedding_id set not null;
    alter table budget_categories alter column wedding_id set not null;
  end if;
end $$;

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
  -- What this task is about. Both optional: plenty of tasks ("book flights")
  -- belong to neither. ON DELETE SET NULL rather than CASCADE — dropping a
  -- vendor should not silently delete the task reminding you to chase them,
  -- it should just leave the task unattached.
  vendor_id   uuid references vendors (id) on delete set null,
  event_id    uuid references events (id) on delete set null,
  created_at  timestamptz not null default now()
);
-- Migrate older installs: the create above is `if not exists`, so on a database
-- that already has the table these columns would never appear.
alter table tasks add column if not exists vendor_id uuid references vendors (id) on delete set null;
alter table tasks add column if not exists event_id  uuid references events  (id) on delete set null;

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
-- RECONCILE — the part of this file that can actually CHANGE an existing database
--
-- Everything above is additive. `create table if not exists` is a no-op the
-- moment the table exists, which means every inline `check (...)`, `default`
-- and `not null` in those bodies only ever applies to a FRESH install. On a
-- database that already exists they are documentation, nothing more.
--
-- That is not a quirk, it is the bug that bit us. guests.party_size was created
-- by hand as `not null default 1` while this file said nullable, and re-running
-- schema.sql — the documented fix for "pull new changes" — could never correct
-- it, because the column already existed. Every save with a blank party size
-- failed until it was found. The same is true of any default or check that
-- drifts.
--
-- So: anything whose value matters is re-asserted HERE, with `drop ... if
-- exists` followed by `add`, which is both idempotent and correcting. Re-running
-- this file now genuinely means "make the database match this repo".
--
-- Two consequences worth knowing:
--   * Adding a constraint FAILS LOUDLY if existing rows violate it. That is the
--     intended behaviour — a silent skip is what let the drift accumulate. If a
--     statement here errors, the data and this file genuinely disagree, and one
--     of them has to change.
--   * A constraint you rename is not dropped by this section. Drop the old name
--     explicitly, the way guests_party_size_chk is dropped below.
-- ----------------------------------------------------------------------------

-- Dropped by name: the original hand-applied constraint for this column. Its
-- replacement below adds the upper bound, so leaving both would mean two
-- overlapping checks saying almost the same thing.
alter table guests drop constraint if exists guests_party_size_chk;

-- guests ---------------------------------------------------------------------
-- guests_side_check is deliberately NOT reconciled here yet. It is the one
-- constraint where this file and the data genuinely disagree: the database
-- allows 'groom mom' and 'groom dad' and 100 rows use them, while the create
-- above allows only bride/groom/both. Asserting the narrow set would fail, as
-- it should. Resolving it means widening the app too, so it is its own change.

-- The guest list is imported by hand-written SQL rather than through the app's
-- form, so the UI's `min` is not in the path — a 0 would quietly claim an
-- invited household is nobody, and an unbounded int lets a fat-fingered 600
-- through into the seat and catering counts. 40 clears the largest real
-- household (9) and still stops a typo.
alter table guests drop constraint if exists guests_party_size_positive;
alter table guests add  constraint guests_party_size_positive
  check (party_size is null or party_size between 1 and 40);

alter table guests drop constraint if exists guests_invite_or_not_check;
alter table guests add  constraint guests_invite_or_not_check
  check (invite_or_not is null or invite_or_not in ('Invite','Not 100%'));

-- party_size is nullable with no default on purpose. Null means "not recorded"
-- and falls back to the plus-one rule; 1 asserts a party of one. A default of 1
-- makes those two states indistinguishable, and NOT NULL additionally rejects
-- the explicit null the guest form sends for a blank field.
alter table guests alter column party_size drop not null;
alter table guests alter column party_size drop default;

-- Both of these carried a default applied by hand and never recorded here.
-- `invite_or_not` had `default 'NULL'` — the four-character STRING, which its
-- own check constraint rejects, so any insert omitting the column failed.
-- `category` had `default 'Friends'`, which quietly invents a relationship for
-- a guest nobody has classified yet.
alter table guests alter column invite_or_not drop default;
alter table guests alter column category      drop default;

-- events ---------------------------------------------------------------------
alter table events drop constraint if exists events_event_type_check;
alter table events add  constraint events_event_type_check
  check (event_type in ('ceremony','reception','gathering','other'));

-- guest_events ---------------------------------------------------------------
alter table guest_events drop constraint if exists guest_events_rsvp_status_check;
alter table guest_events add  constraint guest_events_rsvp_status_check
  check (rsvp_status in ('confirmed','pending','declined'));

-- vendors --------------------------------------------------------------------
alter table vendors drop constraint if exists vendors_contract_status_check;
alter table vendors add  constraint vendors_contract_status_check
  check (contract_status in ('enquiry','quoted','booked','paid','cancelled'));

-- tasks ----------------------------------------------------------------------
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add  constraint tasks_status_check
  check (status in ('todo','in_progress','done'));

alter table tasks drop constraint if exists tasks_recur_freq_check;
alter table tasks add  constraint tasks_recur_freq_check
  check (recur_freq is null or recur_freq in ('daily','weekly','monthly'));

-- attire_items ---------------------------------------------------------------
alter table attire_items drop constraint if exists attire_items_role_check;
alter table attire_items add  constraint attire_items_role_check
  check (role in ('bride','groom','family','party','guest','other'));

alter table attire_items drop constraint if exists attire_items_status_check;
alter table attire_items add  constraint attire_items_status_check
  check (status in ('confirmed','inspiration'));

-- ----------------------------------------------------------------------------
-- Drift detection support
--
-- `npm run db:check` compares the live database against
-- supabase/schema.snapshot.json and fails when they disagree. It reaches the
-- catalogs through this function because PostgREST does not expose
-- information_schema — there is no other way to introspect with only the
-- service-role key, and adding a direct Postgres connection would mean shipping
-- the database password to CI as well.
--
-- SECURITY DEFINER so it can read the catalogs, then execute is revoked from
-- everyone and granted back to service_role alone: the anon key must not be
-- able to enumerate the schema.
-- ----------------------------------------------------------------------------
create or replace function public.schema_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $fn$
  select jsonb_build_object(
    'columns', coalesce((
      -- Ordered by name rather than ordinal position: a column added in the
      -- middle of a table should read as one added line in the snapshot diff,
      -- not reshuffle every line below it.
      select jsonb_agg(
               jsonb_build_object(
                 'table',    c.table_name,
                 'column',   c.column_name,
                 'type',     c.data_type,
                 'nullable', c.is_nullable,
                 'default',  c.column_default
               ) order by c.table_name, c.column_name)
      from information_schema.columns c
      where c.table_schema = 'public'
    ), '[]'::jsonb),
    'checks', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'table',      con.conrelid::regclass::text,
                 'name',       con.conname,
                 'definition', pg_get_constraintdef(con.oid)
               ) order by con.conrelid::regclass::text, con.conname)
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      where con.connamespace = 'public'::regnamespace
        and con.contype = 'c'
        and rel.relkind = 'r'
    ), '[]'::jsonb)
  );
$fn$;

revoke all on function public.schema_snapshot() from public;
revoke all on function public.schema_snapshot() from anon, authenticated;
grant execute on function public.schema_snapshot() to service_role;

-- PostgREST caches which functions are callable; without this the first
-- db:check after a fresh install gets "function not found".
notify pgrst, 'reload schema';

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
