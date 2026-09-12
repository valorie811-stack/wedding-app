// Head counts for guest rows. Pure — no server imports — so client components
// (Guests, RSVP, Table Planner) and server code can share one definition of
// "how many people is this row?".

// The guest list is kept as invite units, not individuals: one row per
// invitation, whether it goes to one person or to a household of six.
//
// `party_size` is how many people that row actually brings — the ATTENDING head
// count, the named guest included. It is not the size of the invitation: when a
// household of six replies that only four can come, the four is what gets
// stored, and catering, seating and the confirmed totals all follow. That is
// why there is no separate "invited" number to reconcile it against.
//
// Where it is set it is authoritative and the plus-one flag is NOT added on top
// of it. It is null on every row that predates the column, and there the old
// rule still stands — the guest, plus one more if they have a plus one. That is
// what keeps the existing live rows counting exactly as they did before.
//
// Anything unparseable, or below 1, falls back to the plus-one rule rather than
// counting nobody: a guest row always represents at least one head.
export function headcount(guest) {
  const size = normalizePartySize(guest?.party_size);
  if (size != null) return size;
  return 1 + (guest?.plus_one ? 1 : 0);
}

export function totalHeads(guests = []) {
  return guests.reduce((n, g) => n + headcount(g), 0);
}

// The floor a party size may not go below, given the rest of the row. A guest
// who is bringing a named plus one is at least two people, so the form's `min`
// and the save path agree on where the bottom is instead of each inventing one.
export function minPartySize(guest) {
  return 1 + (guest?.plus_one ? 1 : 0);
}

// One normalisation point for the value on its way into state and into the
// database, so the optimistic row in the browser and the stored row agree.
//
// Empty means "not recorded", which is NULL — not 0. Storing 0 would claim
// nobody is coming, and would also silently outrank a perfectly good plus-one
// flag on the same row.
export function normalizePartySize(value) {
  if (value === "" || value == null) return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : null;
}
