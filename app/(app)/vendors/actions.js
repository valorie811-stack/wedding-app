"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function weddingIdByCode(supabase, code) {
  if (!code) return null;
  const { data } = await supabase.from("weddings").select("id").eq("code", code).maybeSingle();
  return data?.id ?? null;
}

const isSeed = (id) => !id || String(id).startsWith("seed-");

export async function saveVendor(input) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };

  const row = {
    wedding_id: await weddingIdByCode(supabase, input.code),
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

  const res = isSeed(input.id)
    ? await supabase.from("vendors").insert(row).select("id").maybeSingle()
    : await supabase.from("vendors").update(row).eq("id", input.id).select("id").maybeSingle();

  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath("/vendors");
  return { ok: true, preview: false, id: res.data?.id };
}

export async function deleteVendor(id) {
  const supabase = await createClient();
  if (!supabase) return { ok: true, preview: true };
  if (isSeed(id)) return { ok: true, preview: false };
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/vendors");
  return { ok: true, preview: false };
}
