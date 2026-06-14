import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { parseMessageBody } from "./message-validation";

export { MAX_MESSAGE_LENGTH, parseMessageBody } from "./message-validation";

type UserClient = SupabaseClient<Database>;

/** Customer post — RLS enforces ownership and sender = customer. */
export async function sendCustomerMessage(
  requestId: string,
  rawBody: string,
  supabase: UserClient,
): Promise<void> {
  const body = parseMessageBody(rawBody);
  const { error } = await supabase.from("messages").insert({
    request_id: requestId,
    sender: "customer",
    body,
  });
  if (error) throw error;
}

/** Team post — service-role insert as hunter (cross-user). */
export async function sendTeamMessage(
  requestId: string,
  rawBody: string,
  admin: AdminClient = createAdminClient(),
): Promise<void> {
  const body = parseMessageBody(rawBody);
  const { error } = await admin.from("messages").insert({
    request_id: requestId,
    sender: "team",
    body,
  });
  if (error) throw error;
}
