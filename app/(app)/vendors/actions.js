"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function weddingIdByCode(supabase, code) {
  if (!code) return null;
  const { data } = await supabase.from("weddings").select("id").eq("code", code).maybeSingle();
  return data?.id ?? null;
}

const isSeed = (id) => !id || String(id).startsWith("seed-");

// wedding_id is NOT NULL on vendors: a vendor with no wedding is unreachable in
// every scoped view, and its deposit could not be attributed to a wedding's
// budget. Catch an unresolved code here rather than surfacing a raw constraint
// violation in the UI.
const NO_WEDDING = "Could not resolve which wedding this vendor belongs to. Reload and try again.";

// A vendor's deposit is derived into the Budget, Finance and Dashboard views,
// so a vendor write has to invalidate those too — not just /vendors.
function refresh() {
  revalidatePath("/vendors");
  revalidatePath("/budget");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function saveVendor(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };

  const weddingId = await weddingIdByCode(supabase, input.code);
  if (!weddingId) return { ok: false, error: NO_WEDDING };
  const row = {
    wedding_id: weddingId,
    name: input.name,
    category: input.category || null,
    contact_name: input.contact_name || null,
    email: input.email || null,
    phone: input.phone || null,
    contract_status: input.contract_status || "enquiry",
    total_cost: Number(input.total_cost) || 0,
    deposit_paid: Number(input.deposit_paid) || 0,
    is_halal_certified: !!input.is_halal_certified,
    notes: input.notes || null,
  };

  const inserting = isSeed(input.id);
  const res = inserting
    ? await supabase.from("vendors").insert(row).select("id").maybeSingle()
    : await supabase.from("vendors").update(row).eq("id", input.id).select("id").maybeSingle();

  if (res.error) return { ok: false, error: res.error.message };
  // An update that matches no row comes back as data: null with no error. That
  // means the client is holding an id the database never issued, so report it
  // instead of letting the UI show the edit as saved.
  if (!res.data?.id) {
    return {
      ok: false,
      error: inserting ? "Insert returned no row." : "No vendor found with that id.",
    };
  }

  refresh();
  return { ok: true, preview: false, id: res.data.id };
}

export async function deleteVendor(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, preview: false };
}
