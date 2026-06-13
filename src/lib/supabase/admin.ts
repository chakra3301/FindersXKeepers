import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { SUPABASE_URL } from "./env";

/**
 * Service-role Supabase client. SERVER-ONLY — bypasses RLS, so it must never
 * reach the browser. Use it for team/system operations the customer can't do
 * themselves: seeding, advancing the lifecycle, writing escrow/payment rows.
 *
 * Guarded at runtime (rather than the `server-only` package) so the same
 * factory is usable from the Node seed script as well as Next server code.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must never run in the browser.");
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (server-only).",
    );
  }
  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type AdminClient = ReturnType<typeof createAdminClient>;
