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

  const row = {
    wedding_id: await weddingIdByCode(supabase, input.code),
    title: input.title,
    due_date: input.due || null,
    status: input.status || "todo",
    assignee: input.assignee || null,
  };

  const res = isSeed(input.id)
    ? await supabase.from("tasks").insert(row).select("id").maybeSingle()
    : await supabase.from("tasks").update(row).eq("id", input.id).select("id").maybeSingle();

  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath("/planning");
  revalidatePath("/dashboard");
  return { ok: true, preview: false, id: res.data?.id };
}

// Fast path for drag-and-drop: only the status changes.
export async function updateTaskStatus(id, status) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/planning");
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
  revalidatePath("/dashboard");
  return { ok: true, preview: false };
}
