-- ============================================================================
-- guests: party_size
--
-- The guest list is kept as invite units, not individuals — one row per
-- invitation, whether it goes to one person or to a household of six. Until now
-- the only way to say "more than one" was the plus_one boolean, which tops out
-- at two.
--
-- party_size is how many people the row actually brings: the ATTENDING head
-- count, THE NAMED GUEST INCLUDED. It is not the size of the invitation. A
-- household of six that replies "only four of us can make it" is stored as
-- four, and seating, catering and the confirmed totals all follow from that
-- one number — which is why there is no separate invited count beside it.
--
-- Where it is set it is the head count and plus_one is not added on top; where
-- it is null (every row that predates this migration) the old rule still
-- applies — one head, or two with a plus one. See headcount() in lib/guests.js,
-- which is the single definition the app counts by.
--
-- Null rather than a default of 1 on purpose: "not recorded" and "a party of
-- one" look identical as data, but only null can fall back to the plus-one
-- flag, and roughly a third of the live rows carry one.
-- ============================================================================

alter table guests add column if not exists party_size int;

-- The list is imported by hand-written SQL, so the app form's min is not in the
-- path. A 0 here would claim an invited household is nobody, and an unbounded
-- int lets a fat-fingered 600 through into the seat and catering counts with
-- nothing to catch it. 40 is well clear of the largest real household on the
-- list and still small enough to stop a typo.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'guests_party_size_positive') then
    alter table guests
      add constraint guests_party_size_positive
      check (party_size is null or party_size between 1 and 40);
  end if;
end $$;

comment on column guests.party_size is
  'Attending heads this row brings, the named guest included. Null means not recorded, and the head count falls back to 1 + plus_one.';
