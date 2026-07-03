"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const EVENT_TYPES = ["ceremony", "reception", "gathering", "other"];

async function weddingIdByCode(supabase, code) {
  if (!code) return null; // shared event
  const { data } = await supabase.from("weddings").select("id").eq("code", code).maybeSingle();
  return data?.id ?? null;
}

const isSeed = (id) => !id || String(id).startsWith("seed-");

function refresh() {
  revalidatePath("/scheduler");
  revalidatePath("/dashboard");
}

// Map a form payload to an `events` table row.
async function toRow(supabase, input) {
  const type = EVENT_TYPES.includes(input.type) ? input.type : "ceremony";
  return {
    wedding_id: await weddingIdByCode(supabase, input.code),
    name_en: (input.name?.en || "").trim() || "Untitled event",
    name_vi: input.name?.vi?.trim() || null,
    name_zh: input.name?.zh?.trim() || null,
    event_date: input.date || null,
    start_time: input.start || null,
    end_time: input.end || null,
    location: input.location?.trim() || null,
    event_type: type,
    dress_code: input.dress?.trim() || null,
    is_halal: !!input.halal,
    notes: input.notes?.trim() || null,
  };
}

// Insert (new) or update (existing) a single event.
export async function saveEvent(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  const row = await toRow(supabase, input);
  const res = isSeed(input.id)
    ? await supabase.from("events").insert(row).select("id").maybeSingle()
    : await supabase.from("events").update(row).eq("id", input.id).select("id").maybeSingle();
  if (res.error) return { ok: false, error: res.error.message };
  refresh();
  return { ok: true, preview: false, id: res.data?.id };
}

export async function deleteEvent(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}
