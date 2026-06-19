import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Address } from "@/lib/db/types";

type UserClient = SupabaseClient<Database>;

function isAddressesSchemaMissing(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.message?.includes("Could not find the table") === true ||
    error.message?.includes("does not exist") === true
  );
}

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
  if (error) {
    // Never 500 a page that embeds the address book — log + degrade to empty.
    if (isAddressesSchemaMissing(error)) {
      console.error(
        "[listAddresses] addresses table missing — apply supabase/migrations/0005_profile_avatars_addresses.sql",
      );
    } else {
      console.error(`[listAddresses] ${error.code ?? ""} ${error.message}`);
    }
    return [];
  }
  return data ?? [];
}
