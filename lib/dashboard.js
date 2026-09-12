// Pure dashboard aggregation — no server imports, safe in client components.
import { toAUD } from "@/lib/format";

export function inScope(code, scope) {
  if (scope === "BOTH") return true;
  return code === scope;
}

// Aggregate normalized source arrays into the dashboard view model.
// Halal is tracked in three places that never spoke to each other: an event can
// be marked halal, a vendor can be halal-certified, and a guest can list halal
// as a dietary need. Each is visible in its own module, so the question that
// actually matters — "is the caterer for our halal event actually certified?" —
// could only be answered by opening two pages and remembering.
//
// Only booked or paid catering counts: an enquiry that happens to be
// uncertified is not yet a problem, and flagging it would train the reader to
// ignore the warning.
export function halalReadiness({ events = [], vendors = [], guests = [] }, scope = "BOTH") {
  const codes = [...new Set(events.filter((e) => e.halal).map((e) => e.code))].filter(
    (code) => code && inScope(code, scope)
  );

  return codes.map((code) => {
    const catering = vendors.filter(
      (v) =>
        v.code === code &&
        v.category === "Catering" &&
        ["booked", "paid"].includes(v.contract_status)
    );
    return {
      code,
      guestsNeedingHalal: guests.filter(
        (g) => (g.codes || []).includes(code) && (g.dietary || []).includes("halal")
      ).length,
      cateringBooked: catering.length,
      // No booked caterer yet is unknown, not a failure — there is nothing to
      // be uncertified about until one is chosen.
      uncertified: catering.filter((v) => !v.halalCertified).length,
    };
  });
}

export function aggregate(
  { events = [], budget = [], tasks = [], rsvp = [], vendors = [], guests = [] },
  scope = "BOTH",
  rates
) {
  // Calendar-day string, compared against the "YYYY-MM-DD" the rows already
  // hold. A Date built from that string is UTC midnight while setHours(0,0,0,0)
  // is local midnight, so west of UTC the two disagree and today's event drops
  // out of "upcoming" — the same mismatch that was dropping same-day items
  // from the monthly digest.
  const todayStr = new Date().toISOString().slice(0, 10);

  // Replies and people are two different numbers once a row can cover a whole
  // household: the counts and the response rate stay in replies, because one
  // household answering is one answer, while confirmedHeads is what the caterer
  // is given. `heads` and `guestId` are attached upstream by lib/data.js.
  //
  // The heads are deduplicated by guest and the replies are not, because a row
  // here is one guest_event — one invitation — and a household invited to the
  // engagement and the banquet has two of them. Two replies is correct. Two
  // sets of mouths to feed is not, and adding the party size once per reply is
  // what let "N people" run up to one multiple of the truth per event they were
  // invited to. The seed data hid it: no seed guest is confirmed to more than
  // one event, so the sum and the headcount happened to agree.
  //
  // Keyed on the row position when a reply arrives without its guest, so an
  // unidentified row still counts once instead of every such row collapsing
  // into a single entry.
  const rsvpCounts = { confirmed: 0, pending: 0, declined: 0 };
  const headsByGuest = new Map();
  rsvp
    .filter((r) => inScope(r.code, scope))
    .forEach((r, i) => {
      if (rsvpCounts[r.status] != null) rsvpCounts[r.status] += 1;
      if (r.status === "confirmed") headsByGuest.set(r.guestId ?? `row:${i}`, r.heads ?? 1);
    });
  const confirmedHeads = [...headsByGuest.values()].reduce((n, h) => n + h, 0);
  const rsvpTotal = rsvpCounts.confirmed + rsvpCounts.pending + rsvpCounts.declined;

  const byCat = new Map();
  let plannedAUD = 0;
  let actualAUD = 0;
  budget
    .filter((b) => inScope(b.code, scope))
    .forEach((b) => {
      const p = toAUD(b.planned, b.currency, rates);
      const a = toAUD(b.actual, b.currency, rates);
      plannedAUD += p;
      actualAUD += a;
      const cur = byCat.get(b.category) || { category: b.category, planned: 0, actual: 0 };
      cur.planned += p;
      cur.actual += a;
      byCat.set(b.category, cur);
    });
  const byCategory = [...byCat.values()].sort((x, y) => y.planned - x.planned);

  const upcoming = events
    .filter((e) => inScope(e.code, scope))
    .filter((e) => !e.date || String(e.date) >= todayStr)
    // Undated events are admitted above, so they need somewhere to land. Sorting
    // on `new Date(undefined)` produced NaN comparisons, which a sort treats as
    // "equal" and leaves in arbitrary order; sort them to the end instead.
    .sort((a, b) => String(a.date || "9999-12-31").localeCompare(String(b.date || "9999-12-31")))
    .slice(0, 5);

  const openTasks = tasks
    .filter((t) => (t.code == null ? scope === "BOTH" : inScope(t.code, scope)))
    .filter((t) => t.status !== "done")
    .sort((a, b) => new Date(a.due || "2100-01-01") - new Date(b.due || "2100-01-01"));

  return {
    rsvp: { ...rsvpCounts, total: rsvpTotal, confirmedHeads },
    budget: { plannedAUD, actualAUD, byCategory },
    upcoming,
    tasks: { open: openTasks.slice(0, 6), count: openTasks.length },
    halal: halalReadiness({ events, vendors, guests }, scope),
  };
}
