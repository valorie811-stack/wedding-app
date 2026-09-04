"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const isSeed = (id) => !id || String(id).startsWith("seed-");

function refresh() {
  revalidatePath("/guests");
  revalidatePath("/rsvp");
  revalidatePath("/dashboard");
}

// Insert/update a guest and sync their per-event invitations in one call.
// input: { id, full_name, side, plus_one, plus_one_name, dietary[], notes,
//          country, category, invite_or_not,
//          invites: [{ event_id, status }] }
export async function saveGuest(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };

  const fields = {
    full_name: input.full_name,
    side: input.side || "both",
    plus_one: !!input.plus_one,
    // Single normalisation point, server-side, so the invariant holds whatever
    // the client sends: no name is stored without the flag.
    plus_one_name: input.plus_one ? input.plus_one_name?.trim() || null : null,
    dietary: input.dietary || [],
    notes: input.notes || null,
    // Free-text columns with no DB constraint; the UI offers a fixed set of
    // options plus a blank. Empty string means "not set", so store NULL rather
    // than '' and keep one representation of absent in the database.
    country: input.country || null,
    category: input.category || null,
    invite_or_not: input.invite_or_not || null,
  };

  const res = isSeed(input.id)
    ? await supabase.from("guests").insert(fields).select("id").maybeSingle()
    : await supabase.from("guests").update(fields).eq("id", input.id).select("id").maybeSingle();

  if (res.error) return { ok: false, error: res.error.message };
  const guestId = res.data?.id;
  if (!guestId) return { ok: false, error: "No guest id returned" };

  // Sync invitations (only event ids that look real, i.e. not seed placeholders).
  const invites = (input.invites || []).filter((i) => i.event_id && !isSeed(i.event_id));
  const wanted = new Set(invites.map((i) => i.event_id));

  if (invites.length) {
    const up = await supabase
      .from("guest_events")
      .upsert(
        invites.map((i) => ({ guest_id: guestId, event_id: i.event_id, rsvp_status: i.status })),
        { onConflict: "guest_id,event_id" }
      );
    if (up.error) return { ok: false, error: up.error.message };
  }

  const { data: existing } = await supabase
    .from("guest_events")
    .select("event_id")
    .eq("guest_id", guestId);
  const toDelete = (existing || []).map((r) => r.event_id).filter((id) => !wanted.has(id));
  if (toDelete.length) {
    await supabase.from("guest_events").delete().eq("guest_id", guestId).in("event_id", toDelete);
  }

  refresh();
  return { ok: true, preview: false, id: guestId };
}

export async function deleteGuest(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("guests").delete().eq("id", id); // cascades guest_events
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}

// Set or update a single invitation (used by the RSVP matrix for fast editing).
export async function setInvite(guestId, eventId, status) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(guestId) || isSeed(eventId)) return { ok: true, preview: false };
  const { error } = await supabase
    .from("guest_events")
    .upsert({ guest_id: guestId, event_id: eventId, rsvp_status: status }, { onConflict: "guest_id,event_id" });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}

export async function removeInvite(guestId, eventId) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(guestId) || isSeed(eventId)) return { ok: true, preview: false };
  const { error } = await supabase
    .from("guest_events")
    .delete()
    .eq("guest_id", guestId)
    .eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}
