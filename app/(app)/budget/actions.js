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
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

// --- Category planned budgets (one planned amount per wedding + category) ----
export async function saveCategory(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  const row = {
    wedding_id: await weddingIdByCode(supabase, input.code),
    category: input.category,
    planned: Number(input.planned) || 0,
  };
  // Expense items reference their category by name, so a rename has to carry
  // them along. Read the old name first: without this the items keep pointing at
  // it, drop out of the category list, and their spend lands in the combined
  // total with no line on the page to account for it.
  const before = isSeed(input.id)
    ? null
    : (await supabase.from("budget_categories").select("category,wedding_id").eq("id", input.id).maybeSingle()).data;
  const res = isSeed(input.id)
    ? await supabase.from("budget_categories").insert(row).select("id").maybeSingle()
    : await supabase.from("budget_categories").update(row).eq("id", input.id).select("id").maybeSingle();
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
  if (before && before.category !== input.category) {
    await supabase
      .from("budget_items")
      .update({ category: input.category })
      .eq("wedding_id", before.wedding_id)
      .eq("category", before.category);
  }
  refresh();
  return { ok: true, preview: false, id: res.data.id };
}

// Removes a category and all of its expense items (matched by name + wedding).
export async function deleteCategory(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  const weddingId = await weddingIdByCode(supabase, input.code);
  if (weddingId && input.category) {
    await supabase
      .from("budget_items")
      .delete()
      .eq("wedding_id", weddingId)
      .eq("category", input.category);
  }
  if (!isSeed(input.id)) {
    const { error } = await supabase.from("budget_categories").delete().eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, preview: false };
}

// --- Actual expense items (many per category) -------------------------------
export async function saveItem(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  const row = {
    wedding_id: await weddingIdByCode(supabase, input.code),
    category: input.category,
    label: input.label || null,
    actual: Number(input.actual) || 0,
  };
  const res = isSeed(input.id)
    ? await supabase.from("budget_items").insert(row).select("id").maybeSingle()
    : await supabase.from("budget_items").update(row).eq("id", input.id).select("id").maybeSingle();
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

export async function deleteItem(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("budget_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}
