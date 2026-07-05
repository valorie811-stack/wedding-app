import { createClient } from "@/lib/supabase/server";
import {
  SEED_ATTIRE,
  SEED_BUDGET_CATEGORIES,
  SEED_BUDGET_ITEMS,
  SEED_EVENTS,
  SEED_GUESTS,
  SEED_GUEST_EVENTS,
  SEED_MOODBOARD,
  SEED_RSVP,
  SEED_SEATING_ASSIGNMENTS,
  SEED_TABLES,
  SEED_TASKS,
  SEED_VENDORS,
} from "@/lib/seed-data";

// Merge category-level planned with summed actual line items into the
// category-level rows the dashboard aggregator expects.
function mergeBudget(categories, items) {
  const map = new Map();
  for (const c of categories) {
    map.set(`${c.code}|${c.category}`, {
      code: c.code,
      currency: c.currency,
      category: c.category,
      planned: Number(c.planned) || 0,
      actual: 0,
    });
  }
  for (const it of items) {
    const key = `${it.code}|${it.category}`;
    let row = map.get(key);
    if (!row) {
      row = { code: it.code, currency: it.currency, category: it.category, planned: 0, actual: 0 };
      map.set(key, row);
    }
    row.actual += Number(it.actual) || 0;
  }
  return [...map.values()];
}

function seedSource() {
  return {
    events: SEED_EVENTS,
    budget: mergeBudget(SEED_BUDGET_CATEGORIES, SEED_BUDGET_ITEMS),
    tasks: SEED_TASKS,
    rsvp: SEED_RSVP,
  };
}

// PostgREST returns an embedded to-one relation as an object, but can return a
// single-element array depending on FK resolution. Normalize to a single row.
function one(rel) {
  return Array.isArray(rel) ? rel[0] : rel;
}

// Fetch + normalize from Supabase. Returns null on any failure so the caller
// can fall back to seed data without crashing the page.
async function dbSource(supabase) {
  try {
    const [events, budgetCats, budgetItems, tasks, rsvp] = await Promise.all([
      supabase
        .from("events")
        .select("name_en,name_vi,name_zh,event_date,event_type,is_halal,wedding:weddings(code)"),
      supabase.from("budget_categories").select("category,planned,wedding:weddings(code,currency)"),
      supabase.from("budget_items").select("category,actual,wedding:weddings(code,currency)"),
      supabase.from("tasks").select("title,due_date,status,assignee,wedding:weddings(code)"),
      supabase.from("guest_events").select("rsvp_status,event:events(wedding:weddings(code))"),
    ]);

    if (events.error || budgetCats.error || budgetItems.error || tasks.error || rsvp.error)
      return null;
    // Treat an empty database as "not seeded yet" and fall back to samples.
    if (!events.data?.length && !budgetCats.data?.length && !budgetItems.data?.length) return null;

    return {
      events: (events.data || []).map((e) => ({
        code: one(e.wedding)?.code,
        name: { en: e.name_en, vi: e.name_vi, zh: e.name_zh },
        date: e.event_date,
        type: e.event_type,
        halal: e.is_halal,
      })),
      budget: mergeBudget(
        (budgetCats.data || []).map((b) => {
          const w = one(b.wedding);
          return { code: w?.code, currency: w?.currency, category: b.category, planned: b.planned };
        }),
        (budgetItems.data || []).map((b) => {
          const w = one(b.wedding);
          return { code: w?.code, currency: w?.currency, category: b.category, actual: b.actual };
        })
      ),
      tasks: (tasks.data || []).map((t) => ({
        code: one(t.wedding)?.code ?? null,
        title: t.title,
        due: t.due_date,
        status: t.status,
        assignee: t.assignee,
      })),
      rsvp: (rsvp.data || []).map((r) => ({
        code: one(one(r.event)?.wedding)?.code,
        status: r.rsvp_status,
      })),
    };
  } catch {
    return null;
  }
}

// Returns normalized source arrays for the dashboard plus a preview flag
// (true when falling back to local seed data).
export async function getDashboardSource() {
  const supabase = await createClient();
  let source = null;
  if (supabase) source = await dbSource(supabase);
  const preview = !source;
  if (!source) source = seedSource();
  return { source, preview };
}

// Single-owner app: the couple share one account, unlocked by PIN. There is no
// per-user identity to look up, so this returns a fixed owner profile used only
// to render the shell (name badge, default locale).
export async function getCurrentMember() {
  return { full_name: "Owner", locale: "en" };
}

// ============================================================================
// Phase 2 module fetchers. Each mirrors getDashboardSource: read from Supabase
// when configured, otherwise fall back to local seed data. The `preview` flag
// tells the client whether edits will persist (live) or stay in memory (seed).
// ============================================================================

// Budget tracker — category-level planned budgets + actual expense items
// (a category may have many actual items). Returns both sets + preview flag.
export async function getBudgetData() {
  const supabase = await createClient();
  if (supabase) {
    try {
      const [cats, items] = await Promise.all([
        supabase
          .from("budget_categories")
          .select("id,category,planned,wedding:weddings(code,currency)")
          .order("category", { ascending: true }),
        supabase
          .from("budget_items")
          .select("id,category,label,actual,wedding:weddings(code,currency)")
          .order("created_at", { ascending: true }),
      ]);
      if (!cats.error && !items.error && (cats.data?.length || items.data?.length)) {
        return {
          categories: (cats.data || []).map((c) => {
            const w = one(c.wedding);
            return {
              id: c.id,
              code: w?.code,
              currency: w?.currency,
              category: c.category,
              planned: Number(c.planned),
            };
          }),
          items: (items.data || []).map((i) => {
            const w = one(i.wedding);
            return {
              id: i.id,
              code: w?.code,
              currency: w?.currency,
              category: i.category,
              label: i.label,
              actual: Number(i.actual),
            };
          }),
          preview: false,
        };
      }
    } catch {
      /* fall through to seed */
    }
  }
  return { categories: SEED_BUDGET_CATEGORIES, items: SEED_BUDGET_ITEMS, preview: true };
}

// Vendor management — contacts, contract status, payment schedule.
export async function getVendorsData() {
  const supabase = await createClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select(
          "id,name,category,contact_name,email,phone,contract_status,total_cost,deposit_paid,is_halal_certified,notes,wedding:weddings(code,currency)"
        )
        .order("created_at", { ascending: true });
      if (!error && data?.length) {
        return {
          vendors: data.map((v) => {
            const w = one(v.wedding);
            return {
              id: v.id,
              code: w?.code,
              currency: w?.currency,
              name: v.name,
              category: v.category,
              contact_name: v.contact_name,
              email: v.email,
              phone: v.phone,
              contract_status: v.contract_status,
              total_cost: Number(v.total_cost),
              deposit_paid: Number(v.deposit_paid),
              is_halal_certified: v.is_halal_certified,
              notes: v.notes,
            };
          }),
          preview: false,
        };
      }
    } catch {
      /* fall through to seed */
    }
  }
  return { vendors: SEED_VENDORS, preview: true };
}

// Planning board — tasks with status for the Kanban columns.
export async function getTasksData() {
  const supabase = await createClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id,title,due_date,status,assignee,recur_freq,recur_until,remind_days_before,wedding:weddings(code)"
        )
        .order("due_date", { ascending: true });
      if (!error && data?.length) {
        return {
          tasks: data.map((t) => ({
            id: t.id,
            code: one(t.wedding)?.code ?? null,
            title: t.title,
            due: t.due_date,
            status: t.status,
            assignee: t.assignee,
            recurFreq: t.recur_freq,
            recurUntil: t.recur_until,
            remindDays: t.remind_days_before,
          })),
          preview: false,
        };
      }
    } catch {
      /* fall through to seed */
    }
  }
  return { tasks: SEED_TASKS, preview: true };
}

// Calendar — full event detail plus task due-date milestones.
export async function getCalendarData() {
  const supabase = await createClient();
  if (supabase) {
    try {
      const [events, tasks] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id,name_en,name_vi,name_zh,event_date,start_time,end_time,location,event_type,is_halal,dress_code,notes,wedding:weddings(code)"
          ),
        supabase
          .from("tasks")
          .select(
            "id,title,due_date,status,assignee,recur_freq,recur_until,remind_days_before,wedding:weddings(code)"
          ),
      ]);
      if (!events.error && events.data?.length) {
        return {
          events: events.data.map((e) => ({
            id: e.id,
            code: one(e.wedding)?.code,
            name: { en: e.name_en, vi: e.name_vi, zh: e.name_zh },
            date: e.event_date,
            start: e.start_time,
            end: e.end_time,
            location: e.location,
            type: e.event_type,
            halal: e.is_halal,
            dress: e.dress_code,
            notes: e.notes,
          })),
          tasks: (tasks.data || []).map((t) => ({
            id: t.id,
            code: one(t.wedding)?.code ?? null,
            title: t.title,
            due: t.due_date,
            status: t.status,
            assignee: t.assignee,
            recurFreq: t.recur_freq,
            recurUntil: t.recur_until,
            remindDays: t.remind_days_before,
          })),
          preview: false,
        };
      }
    } catch {
      /* fall through to seed */
    }
  }
  return { events: SEED_EVENTS, tasks: SEED_TASKS, preview: true };
}

// Guest management — guests with their per-event invitations + RSVP status,
// plus the event list (for assigning invitations in the UI).
export async function getGuestsData() {
  const supabase = await createClient();
  if (supabase) {
    try {
      const [eventsRes, guestsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id,name_en,name_vi,name_zh,event_date,sort_order,wedding:weddings(code)")
          .order("sort_order", { ascending: true }),
        supabase
          .from("guests")
          .select(
            "id,full_name,side,plus_one,dietary,notes,guest_events(event_id,rsvp_status)"
          )
          .order("full_name", { ascending: true }),
      ]);

      if (!eventsRes.error && !guestsRes.error && eventsRes.data?.length) {
        const codeById = new Map(eventsRes.data.map((e) => [e.id, one(e.wedding)?.code]));
        const events = eventsRes.data.map((e) => ({
          id: e.id,
          code: one(e.wedding)?.code,
          name: { en: e.name_en, vi: e.name_vi, zh: e.name_zh },
          date: e.event_date,
        }));
        const guests = (guestsRes.data || []).map((g) => ({
          id: g.id,
          full_name: g.full_name,
          side: g.side,
          plus_one: g.plus_one,
          dietary: g.dietary || [],
          notes: g.notes,
          invites: (g.guest_events || []).map((ge) => ({
            event_id: ge.event_id,
            code: codeById.get(ge.event_id),
            status: ge.rsvp_status,
          })),
        }));
        return { guests, events, preview: false };
      }
    } catch {
      /* fall through to seed */
    }
  }

  // Preview: assemble from local seed data.
  const codeById = new Map(SEED_EVENTS.map((e) => [e.id, e.code]));
  const events = SEED_EVENTS.map((e) => ({ id: e.id, code: e.code, name: e.name, date: e.date }));
  const guests = SEED_GUESTS.map((g) => ({
    ...g,
    invites: SEED_GUEST_EVENTS.filter((ge) => ge.guest_id === g.id).map((ge) => ({
      event_id: ge.event_id,
      code: codeById.get(ge.event_id),
      status: ge.status,
    })),
  }));
  return { guests, events, preview: true };
}

// Seating (Table Planner) — tables, assignments, and guests tagged with the
// wedding code(s) they belong to (derived from their event invitations).
export async function getSeatingData() {
  const supabase = await createClient();
  if (supabase) {
    try {
      const [tbls, asg, gs] = await Promise.all([
        supabase
          .from("seating_tables")
          .select("id,name,capacity,sort_order,wedding:weddings(code)")
          .order("sort_order", { ascending: true }),
        supabase.from("seating_assignments").select("id,table_id,guest_id"),
        supabase
          .from("guests")
          .select("id,full_name,guest_events(event:events(wedding:weddings(code)))")
          .order("full_name", { ascending: true }),
      ]);
      if (!tbls.error && !asg.error && !gs.error && (tbls.data?.length || gs.data?.length)) {
        return {
          tables: (tbls.data || []).map((tb) => ({
            id: tb.id,
            code: one(tb.wedding)?.code,
            name: tb.name,
            capacity: tb.capacity,
            sort_order: tb.sort_order,
          })),
          assignments: (asg.data || []).map((a) => ({
            id: a.id,
            table_id: a.table_id,
            guest_id: a.guest_id,
          })),
          guests: (gs.data || []).map((g) => ({
            id: g.id,
            full_name: g.full_name,
            codes: [
              ...new Set(
                (g.guest_events || [])
                  .map((ge) => one(one(ge.event)?.wedding)?.code)
                  .filter(Boolean)
              ),
            ],
          })),
          preview: false,
        };
      }
    } catch {
      /* fall through to seed */
    }
  }

  const codeById = new Map(SEED_EVENTS.map((e) => [e.id, e.code]));
  const seatGuests = SEED_GUESTS.map((g) => ({
    id: g.id,
    full_name: g.full_name,
    codes: [
      ...new Set(
        SEED_GUEST_EVENTS.filter((ge) => ge.guest_id === g.id)
          .map((ge) => codeById.get(ge.event_id))
          .filter(Boolean)
      ),
    ],
  }));
  return {
    tables: SEED_TABLES,
    assignments: SEED_SEATING_ASSIGNMENTS,
    guests: seatGuests,
    preview: true,
  };
}

// Mood boards — image URLs + colour swatches per board/wedding.
export async function getMoodboardData() {
  const supabase = await createClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("moodboard_items")
        .select("id,board,title,image_url,swatches,notes,wedding:weddings(code)")
        .order("sort_order", { ascending: true });
      if (!error && data?.length) {
        return {
          items: data.map((m) => ({
            id: m.id,
            code: one(m.wedding)?.code ?? null,
            board: m.board,
            title: m.title,
            image_url: m.image_url,
            swatches: m.swatches || [],
            notes: m.notes,
          })),
          preview: false,
        };
      }
    } catch {
      /* fall through to seed */
    }
  }
  return { items: SEED_MOODBOARD, preview: true };
}

// Attire — outfit ideas per role + wedding, confirmed/inspiration.
export async function getAttireData() {
  const supabase = await createClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("attire_items")
        .select("id,role,title,image_url,status,notes,wedding:weddings(code)")
        .order("sort_order", { ascending: true });
      if (!error && data?.length) {
        return {
          items: data.map((a) => ({
            id: a.id,
            code: one(a.wedding)?.code ?? null,
            role: a.role,
            title: a.title,
            image_url: a.image_url,
            status: a.status,
            notes: a.notes,
          })),
          preview: false,
        };
      }
    } catch {
      /* fall through to seed */
    }
  }
  return { items: SEED_ATTIRE, preview: true };
}

