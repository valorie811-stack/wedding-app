-- ============================================================================
-- guests: country, category, invite_or_not
--
-- These three columns were created by hand in the Supabase dashboard Table
-- Editor, so no migration was ever recorded for them. This file records that
-- change in migration history so a fresh install matches production; on the
-- live database every statement below is already a no-op.
--
-- All three are free text with no CHECK constraint, matching production — the
-- allowed values are enforced by the app's dropdowns, not the database.
-- ============================================================================

alter table guests add column if not exists country       text;
alter table guests add column if not exists category      text;
alter table guests add column if not exists invite_or_not text;

comment on column guests.country is
  'Country the guest travels from: Australia, Malaysia, Indonesia or Misc countries. Null if not recorded.';
comment on column guests.category is
  'How the guest knows the couple: Family, Friends, Work or Other. Null if not categorised.';
comment on column guests.invite_or_not is
  'Where the guest sits on the invite list: Invite, Not 100% or Don''t invite. Null until decided.';
