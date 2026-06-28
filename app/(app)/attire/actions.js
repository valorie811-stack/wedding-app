"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function weddingIdByCode(supabase, code) {
  if (!code) return null;
  const { data } = await supabase.from("weddings").select("id").eq("code", code).maybeSingle();
  return data?.id ?? null;
}

const isSeed = (id) => !id || String(id).startsWith("seed-");

export async function saveAttireItem(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  const row = {
    wedding_id: await weddingIdByCode(supabase, input.code),
    role: input.role || "bride",
    title: input.title || null,
    image_url: input.image_url || null,
    status: input.status || "inspiration",
    notes: input.notes || null,
  };
  const res = isSeed(input.id)
    ? await supabase.from("attire_items").insert(row).select("id").maybeSingle()
    : await supabase.from("attire_items").update(row).eq("id", input.id).select("id").maybeSingle();
  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath("/attire");
  return { ok: true, preview: false, id: res.data?.id };
}

export async function deleteAttireItem(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("attire_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/attire");
  return { ok: true, preview: false };
}
