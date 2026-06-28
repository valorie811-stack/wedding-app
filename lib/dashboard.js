// Pure dashboard aggregation — no server imports, safe in client components.
import { toAUD } from "@/lib/format";

export function inScope(code, scope) {
  if (scope === "BOTH") return true;
  return code === scope;
}

// Aggregate normalized source arrays into the dashboard view model.
export function aggregate({ events = [], budget = [], tasks = [], rsvp = [] }, scope = "BOTH") {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rsvpCounts = { confirmed: 0, pending: 0, declined: 0 };
  rsvp
    .filter((r) => inScope(r.code, scope))
    .forEach((r) => {
      if (rsvpCounts[r.status] != null) rsvpCounts[r.status] += 1;
    });
  const rsvpTotal = rsvpCounts.confirmed + rsvpCounts.pending + rsvpCounts.declined;

  const byCat = new Map();
  let plannedAUD = 0;
  let actualAUD = 0;
  budget
    .filter((b) => inScope(b.code, scope))
    .forEach((b) => {
      const p = toAUD(Number(b.planned), b.currency);
      const a = toAUD(Number(b.actual), b.currency);
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
    .filter((e) => !e.date || new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const openTasks = tasks
    .filter((t) => (t.code == null ? scope === "BOTH" : inScope(t.code, scope)))
    .filter((t) => t.status !== "done")
    .sort((a, b) => new Date(a.due || "2100-01-01") - new Date(b.due || "2100-01-01"));

  return {
    rsvp: { ...rsvpCounts, total: rsvpTotal },
    budget: { plannedAUD, actualAUD, byCategory },
    upcoming,
    tasks: { open: openTasks.slice(0, 6), count: openTasks.length },
  };
}
