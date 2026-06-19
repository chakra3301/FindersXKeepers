"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addressToSnapshot } from "@/lib/addresses/types";

/**
 * Attach a saved address to an already-funded request (the "collect later"
 * path). Writes the frozen snapshot directly via the owner-scoped client, so it
 * works regardless of request status (RLS scopes it to the owner).
 */
export async function attachRequestAddress(
  requestId: string,
  formData: FormData,
): Promise<void> {
  await requireUser();
  const addressId = String(formData.get("addressId") ?? "");
  if (!addressId) return;
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("requests")
    .select("id")
    .eq("id", requestId)
    .maybeSingle();
  if (!owned) return;
  const { data: addr } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", addressId)
    .maybeSingle();
  if (!addr) return;
  const { error } = await supabase
    .from("requests")
    .update({ shipping_address: addressToSnapshot(addr) })
    .eq("id", requestId);
  if (error) throw error;
  revalidatePath(`/requests/${requestId}`);
}
