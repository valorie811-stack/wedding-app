// Shared event helpers.

// The Family Introduction (Lễ Dạm Ngõ) is a private meeting between the two
// direct families only. It is never a guest-facing invitation or RSVP option,
// so it is excluded from the guest invitation form and the RSVP matrix — it
// still appears in the Event Scheduler and every other view. Matched by its
// English or Vietnamese name so it works for both live Supabase data and the
// local preview seed data.
export function isFamilyOnlyEvent(ev) {
  const en = ev?.name?.en || "";
  const vi = ev?.name?.vi || "";
  return en.startsWith("Family Introduction") || vi === "Lễ Dạm Ngõ";
}
