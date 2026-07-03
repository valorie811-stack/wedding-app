-- ============================================================================
-- Two Weddings — Phase 1 schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL -> New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Membership & roles  (couple = owner, everyone else invited)
-- ----------------------------------------------------------------------------
create table if not exists members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  full_name   text,
  role        text not null default 'family'
              check (role in ('owner','planner','family','party','guest','vendor')),
  locale      text not null default 'en' check (locale in ('en','vi','zh')),
  created_at  timestamptz not null default now(),
  unique (user_id)
);

-- Pending invitations (invite-based roles). Accepted when the invitee signs in.
create table if not exists invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        text not null default 'family'
              check (role in ('owner','planner','family','party','guest','vendor')),
  token       text not null unique,
  invited_by  uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Helper predicates used by RLS policies below.
create or replace function is_member()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from members m where m.user_id = auth.uid());
$$;

create or replace function is_owner()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from members m where m.user_id = auth.uid() and m.role = 'owner');
$$;

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
  email       text,
  phone       text,
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

-- Seating (Phase 3 Table Planner): tables per wedding + guest assignments.
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

-- Mood boards (Phase 3): image (URL) + colour swatches per board/wedding.
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

-- Attire (Phase 3): outfit ideas per role + wedding, confirmed/inspiration.
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
-- Phase 1: any signed-in member of the workspace can read/write planning data.
-- Member/role administration is restricted to the owner. Finer per-role views
-- (family / bridal party / vendor) arrive with Phase 4 access control.
-- ----------------------------------------------------------------------------
alter table members      enable row level security;
alter table invites      enable row level security;
alter table weddings     enable row level security;
alter table events       enable row level security;
alter table guests       enable row level security;
alter table guest_events enable row level security;
alter table vendors      enable row level security;
alter table budget_categories enable row level security;
alter table budget_items enable row level security;
alter table tasks        enable row level security;
alter table seating_tables enable row level security;
alter table seating_assignments enable row level security;
alter table moodboard_items enable row level security;
alter table attire_items enable row level security;

-- members: everyone in the workspace can see the roster; only owner manages it.
drop policy if exists members_select on members;
create policy members_select on members for select to authenticated using (is_member());
drop policy if exists members_self_insert on members;
drop policy if exists members_owner_manage on members;
create policy members_owner_manage on members for update to authenticated using (is_owner());
drop policy if exists members_owner_delete on members;
create policy members_owner_delete on members for delete to authenticated using (is_owner());

-- invites: owner only.
drop policy if exists invites_owner_all on invites;
create policy invites_owner_all on invites for all to authenticated using (is_owner()) with check (is_owner());

-- Generic member read/write for the planning tables.
do $$
declare tbl text;
begin
  foreach tbl in array array['weddings','events','guests','guest_events','vendors','budget_categories','budget_items','tasks','seating_tables','seating_assignments','moodboard_items','attire_items']
  loop
    execute format('drop policy if exists %I_member_all on %I;', tbl, tbl);
    execute format(
      'create policy %I_member_all on %I for all to authenticated using (is_member()) with check (is_member());',
      tbl, tbl);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- First sign-in bootstrap: the very first authenticated user becomes the owner.
-- After that, new users join via the invites flow (handled in app code).
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from members) then
    insert into members (user_id, full_name, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'owner');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Invite acceptance: called by the app after sign-in (SECURITY DEFINER).
-- Assigns the invited role server-side; a user can never choose their own role.
-- ----------------------------------------------------------------------------
create or replace function accept_invite()
returns text language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  if exists (select 1 from members where user_id = auth.uid()) then
    return (select role from members where user_id = auth.uid());
  end if;
  select id, role into inv
  from invites
  where lower(email) = lower(auth.email()) and accepted_at is null
  order by created_at
  limit 1;
  if inv.id is null then
    return null;
  end if;
  insert into members (user_id, full_name, role) values (auth.uid(), auth.email(), inv.role);
  update invites set accepted_at = now() where id = inv.id;
  return inv.role;
end $$;

revoke all on function accept_invite() from public;
grant execute on function accept_invite() to authenticated;

-- ----------------------------------------------------------------------------
-- Sharing MVP (Phase 2): token-gated read-only links.
-- A signed-in member creates a share for a resource (+ optional wedding scope)
-- and an optional expiry. The public /share/[token] route reads it with the
-- service-role key (bypassing RLS); members manage their own shares here.
-- ----------------------------------------------------------------------------
create table if not exists shares (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  resource    text not null
              check (resource in ('guests','vendors','schedule','budget','rsvp')),
  scope       text not null default 'BOTH' check (scope in ('BOTH','HP','KK')),
  label       text,
  otp_required boolean not null default false,
  created_by  uuid references auth.users (id) on delete set null,
  expires_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists shares_token_idx on shares (token);

-- Add the column on older installs.
alter table shares add column if not exists otp_required boolean not null default false;

-- One-time codes for email-gated share links. Accessed only via the service
-- role in server actions, so RLS is enabled with no policies (locked to anon).
create table if not exists share_otps (
  id          uuid primary key default gen_random_uuid(),
  token       text not null,
  email       text not null,
  code        text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists share_otps_lookup on share_otps (token, email);
alter table share_otps enable row level security;

alter table shares enable row level security;

-- Members manage shares; the public route never uses this client (service role).
drop policy if exists shares_member_all on shares;
create policy shares_member_all on shares
  for all to authenticated using (is_member()) with check (is_member());

-- Allow the 'rsvp' resource on older installs (constraint added before it existed).
alter table shares drop constraint if exists shares_resource_check;
alter table shares add constraint shares_resource_check
  check (resource in ('guests','vendors','schedule','budget','rsvp'));
