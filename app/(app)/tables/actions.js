"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function weddingIdByCode(supabase, code) {
  if (!code) return null;
  const { data } = await supabase.from("weddings").select("id").eq("code", code).maybeSingle();
  return data?.id ?? null;
}

const isSeed = (id) => !id || String(id).startsWith("seed-");

function refresh() {
  revalidatePath("/tables");
}

export async function saveTable(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  const row = {
    wedding_id: await weddingIdByCode(supabase, input.code),
    name: input.name,
    capacity: Number(input.capacity) || 8,
    sort_order: Number(input.sort_order) || 0,
  };
  const res = isSeed(input.id)
    ? await supabase.from("seating_tables").insert(row).select("id").maybeSingle()
    : await supabase.from("seating_tables").update(row).eq("id", input.id).select("id").maybeSingle();
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
  refresh();
  return { ok: true, preview: false, id: res.data.id };
}

export async function deleteTable(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("seating_tables").delete().eq("id", id); // cascades assignments
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}

// Assign a guest to a table. Enforces one table per wedding by clearing any
// existing assignment for this guest among the table's wedding first.
export async function assignGuest(tableId, guestId) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(tableId) || isSeed(guestId)) return { ok: true, preview: false };

  const { data: tbl } = await supabase
    .from("seating_tables")
    .select("wedding_id")
    .eq("id", tableId)
    .maybeSingle();
  if (tbl?.wedding_id) {
    const { data: sameWed } = await supabase
      .from("seating_tables")
      .select("id")
      .eq("wedding_id", tbl.wedding_id);
    const ids = (sameWed || []).map((t) => t.id);
    if (ids.length) {
      await supabase.from("seating_assignments").delete().eq("guest_id", guestId).in("table_id", ids);
    }
  }
  const { error } = await supabase
    .from("seating_assignments")
    .upsert({ table_id: tableId, guest_id: guestId }, { onConflict: "table_id,guest_id" });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}

export async function unassignGuest(tableId, guestId) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(tableId) || isSeed(guestId)) return { ok: true, preview: false };
  const { error } = await supabase
    .from("seating_assignments")
    .delete()
    .eq("table_id", tableId)
    .eq("guest_id", guestId);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}
