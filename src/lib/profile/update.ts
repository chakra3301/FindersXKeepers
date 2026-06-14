import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { UpdateProfileInput } from "./validation";

type UserClient = SupabaseClient<Database>;

/**
 * Owner-scoped profile update. Only `shipping_country` and `currency_pref` —
 * never `is_staff` (DB trigger also blocks self-promotion).
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  supabase: UserClient,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      shipping_country: input.shippingCountry,
      currency_pref: input.currencyPref,
    })
    .eq("id", userId);
  if (error) throw error;
}
