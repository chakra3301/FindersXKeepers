import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Address } from "@/lib/db/types";

type UserClient = SupabaseClient<Database>;

/** The signed-in user's saved addresses, default first then newest. */
export async function listAddresses(
  userId: string,
  supabase: UserClient,
): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
