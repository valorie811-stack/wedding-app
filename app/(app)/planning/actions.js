"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function weddingIdByCode(supabase, code) {
  if (!code) return null;
  const { data } = await supabase.from("weddings").select("id").eq("code", code).maybeSingle();
  return data?.id ?? null;
}

const isSeed = (id) => !id || String(id).startsWith("seed-");

export async function saveTask(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };

  const remindDays =
    input.remindDays === "" || input.remindDays == null ? null : Number(input.remindDays);
  const row = {
    wedding_id: await weddingIdByCode(supabase, input.code),
    title: input.title,
    due_date: input.due || null,
    status: input.status || "todo",
    assignee: input.assignee || null,
    recur_freq: input.recurFreq || null,
    recur_until: input.recurFreq && input.recurUntil ? input.recurUntil : null,
    remind_days_before: Number.isFinite(remindDays) ? remindDays : null,
    // Optional links to what the task is about. Empty string from the form's
    // "no link" option must become null, or Postgres rejects it as an invalid
    // uuid rather than storing "unlinked".
    vendor_id: input.vendorId || null,
    event_id: input.eventId || null,
  };

  const res = isSeed(input.id)
    ? await supabase.from("tasks").insert(row).select("id").maybeSingle()
    : await supabase.from("tasks").update(row).eq("id", input.id).select("id").maybeSingle();

  if (res.error) return { ok: false, error: res.error.message };
  // An update that matches no row comes back as data: null with no error. That
  // means the client holds an id the database never issued, so report it rather
  // than letting the UI show the change as saved.
  if (!res.data?.id) {
    return {
      ok: false,
      error: isSeed(input.id) ? "Insert returned no row." : "No matching row to update.",
    };
  }
  revalidatePath("/planning");
  revalidatePath("/scheduler");
  revalidatePath("/dashboard");
  return { ok: true, preview: false, id: res.data.id };
}

// Fast path for drag-and-drop: only the status changes.
export async function updateTaskStatus(id, status) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/planning");
  revalidatePath("/scheduler");
  revalidatePath("/dashboard");
  return { ok: true, preview: false };
}

export async function deleteTask(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/planning");
  revalidatePath("/scheduler");
  revalidatePath("/dashboard");
  return { ok: true, preview: false };
}
