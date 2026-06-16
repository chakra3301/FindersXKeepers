import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { AddressInput } from "./validation";

type UserClient = SupabaseClient<Database>;

/** Clear is_default on all of the user's addresses except `keepId` (optional). */
async function clearDefaults(
  userId: string,
  supabase: UserClient,
  keepId?: string,
): Promise<void> {
  let q = supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
  if (keepId) q = q.neq("id", keepId);
  const { error } = await q;
  if (error) throw error;
}

/** Create an address. If it's the user's first, force it default. */
export async function createAddress(
  userId: string,
  input: AddressInput,
  makeDefault: boolean,
  supabase: UserClient,
): Promise<void> {
  const { count } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const isDefault = makeDefault || (count ?? 0) === 0;
  if (isDefault) await clearDefaults(userId, supabase);
  const { error } = await supabase.from("addresses").insert({
    user_id: userId,
    recipient_name: input.recipientName,
    line1: input.line1,
    line2: input.line2,
    city: input.city,
    region: input.region,
    postal_code: input.postalCode,
    country: input.country,
    phone: input.phone,
    is_default: isDefault,
  });
  if (error) throw error;
}

/** Update an owned address in place (does not change default flag). */
export async function updateAddress(
  userId: string,
  id: string,
  input: AddressInput,
  supabase: UserClient,
): Promise<void> {
  const { error } = await supabase
    .from("addresses")
    .update({
      recipient_name: input.recipientName,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      region: input.region,
      postal_code: input.postalCode,
      country: input.country,
      phone: input.phone,
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Delete an owned address. */
export async function deleteAddress(
  userId: string,
  id: string,
  supabase: UserClient,
): Promise<void> {
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Mark one owned address default, clearing the rest. */
export async function setDefaultAddress(
  userId: string,
  id: string,
  supabase: UserClient,
): Promise<void> {
  await clearDefaults(userId, supabase, id);
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
