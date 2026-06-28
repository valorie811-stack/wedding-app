import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodePreviewToken } from "@/lib/share";
import {
  SEED_EVENTS,
  SEED_GUESTS,
  SEED_GUEST_EVENTS,
  SEED_TASKS,
  SEED_VENDORS,
} from "@/lib/seed-data";

function one(rel) {
  return Array.isArray(rel) ? rel[0] : rel;
}

const inScope = (code, scope) => scope === "BOTH" || code === scope;

// Resolve a share token to { status, resource, scope, label }.
// Live (service role present): DB-backed, honours revoke + expiry.
// Preview (no service role): self-encoding tokens only.
export async function resolveShare(token) {
  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("shares")
      .select("resource,scope,label,otp_required,expires_at,revoked_at")
      .eq("token", token)
      .maybeSingle();
    if (error || !data) return { status: "invalid" };
    if (data.revoked_at) return { status: "revoked" };
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { status: "expired" };
    return {
      status: "ok",
      resource: data.resource,
      scope: data.scope,
      label: data.label,
      otp_required: !!data.otp_required,
    };
  }
  const dec = decodePreviewToken(token);
  if (!dec) return { status: "invalid" };
  if (dec.exp && Date.now() > dec.exp) return { status: "expired" };
  return {
    status: "ok",
    resource: dec.r,
    scope: dec.s || "BOTH",
    label: dec.label,
    otp_required: !!dec.o,
    preview: true,
  };
}

// Fetch the read-only payload for a resource + scope. Admin client when
// configured, otherwise local seed data so the demo works with no keys.
export async function getShareData(resource, scope = "BOTH") {
  const admin = createAdminClient();
  if (admin) {
    try {
      const live = await fetchLive(admin, resource);
      if (live) return scopeData(resource, live, scope);
    } catch {
      /* fall through to seed */
    }
  }
  return scopeData(resource, seedData(resource), scope);
}

async function fetchLive(admin, resource) {
  if (resource === "guests") {
    const [ev, gs] = await Promise.all([
      admin.from("events").select("id,name_en,name_vi,name_zh,event_date,sort_order,wedding:weddings(code)").order("sort_order"),
      admin.from("guests").select("id,full_name,side,plus_one,dietary,guest_events(event_id,rsvp_status)").order("full_name"),
    ]);
    if (ev.error || gs.error) return null;
    const codeById = new Map((ev.data || []).map((e) => [e.id, one(e.wedding)?.code]));
    return {
      events: (ev.data || []).map((e) => ({ id: e.id, code: one(e.wedding)?.code, name: { en: e.name_en, vi: e.name_vi, zh: e.name_zh }, date: e.event_date })),
      guests: (gs.data || []).map((g) => ({
        full_name: g.full_name, side: g.side, plus_one: g.plus_one, dietary: g.dietary || [],
        invites: (g.guest_events || []).map((x) => ({ event_id: x.event_id, code: codeById.get(x.event_id), status: x.rsvp_status })),
      })),
    };
  }
  if (resource === "vendors") {
    const { data, error } = await admin
      .from("vendors")
      .select("name,category,contact_name,email,phone,contract_status,is_halal_certified,wedding:weddings(code)")
      .order("name");
    if (error) return null;
    return { vendors: (data || []).map((v) => ({ ...v, code: one(v.wedding)?.code })) };
  }
  if (resource === "schedule") {
    const [ev, tk] = await Promise.all([
      admin.from("events").select("id,name_en,name_vi,name_zh,event_date,start_time,end_time,location,is_halal,wedding:weddings(code)"),
      admin.from("tasks").select("title,due_date,status,wedding:weddings(code)"),
    ]);
    if (ev.error) return null;
    return {
      events: (ev.data || []).map((e) => ({ code: one(e.wedding)?.code, name: { en: e.name_en, vi: e.name_vi, zh: e.name_zh }, date: e.event_date, start: e.start_time, end: e.end_time, location: e.location, halal: e.is_halal })),
      tasks: (tk.data || []).map((t) => ({ code: one(t.wedding)?.code ?? null, title: t.title, due: t.due_date, status: t.status })),
    };
  }
  if (resource === "rsvp") {
    const { data, error } = await admin
      .from("events")
      .select("id,name_en,name_vi,name_zh,event_date,sort_order,wedding:weddings(code)")
      .order("sort_order");
    if (error) return null;
    return {
      events: (data || []).map((e) => ({ id: e.id, code: one(e.wedding)?.code, name: { en: e.name_en, vi: e.name_vi, zh: e.name_zh }, date: e.event_date })),
    };
  }
  return null;
}

function seedData(resource) {
  if (resource === "guests") {
    const codeById = new Map(SEED_EVENTS.map((e) => [e.id, e.code]));
    return {
      events: SEED_EVENTS.map((e) => ({ id: e.id, code: e.code, name: e.name, date: e.date })),
      guests: SEED_GUESTS.map((g) => ({
        full_name: g.full_name, side: g.side, plus_one: g.plus_one, dietary: g.dietary || [],
        invites: SEED_GUEST_EVENTS.filter((ge) => ge.guest_id === g.id).map((ge) => ({ event_id: ge.event_id, code: codeById.get(ge.event_id), status: ge.status })),
      })),
    };
  }
  if (resource === "vendors") {
    return { vendors: SEED_VENDORS.map((v) => ({ name: v.name, category: v.category, contact_name: v.contact_name, email: v.email, phone: v.phone, contract_status: v.contract_status, is_halal_certified: v.is_halal_certified, code: v.code })) };
  }
  if (resource === "schedule") {
    return {
      events: SEED_EVENTS.map((e) => ({ code: e.code, name: e.name, date: e.date, start: e.start, end: e.end, location: e.location, halal: e.halal })),
      tasks: SEED_TASKS.map((t) => ({ code: t.code, title: t.title, due: t.due, status: t.status })),
    };
  }
  if (resource === "rsvp") {
    return { events: SEED_EVENTS.map((e) => ({ id: e.id, code: e.code, name: e.name, date: e.date })) };
  }
  return {};
}

// Apply wedding scope filtering to a payload.
function scopeData(resource, data, scope) {
  if (!data) return {};
  if (resource === "guests") {
    const guests = data.guests
      .map((g) => ({ ...g, invites: scope === "BOTH" ? g.invites : g.invites.filter((i) => i.code === scope) }))
      .filter((g) => scope === "BOTH" || g.invites.length > 0);
    const events = data.events.filter((e) => inScope(e.code, scope));
    return { guests, events };
  }
  if (resource === "vendors") {
    return { vendors: data.vendors.filter((v) => inScope(v.code, scope)) };
  }
  if (resource === "schedule") {
    return {
      events: data.events.filter((e) => inScope(e.code, scope)),
      tasks: data.tasks.filter((t) => (t.code == null ? scope === "BOTH" : inScope(t.code, scope))),
    };
  }
  if (resource === "rsvp") {
    return { events: data.events.filter((e) => inScope(e.code, scope)) };
  }
  return data;
}
