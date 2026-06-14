"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { sendCustomerMessage } from "@/lib/requests/messages";

export async function sendCustomerMessageAction(
  requestId: string,
  formData: FormData,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("requests")
    .select("id")
    .eq("id", requestId)
    .maybeSingle();
  if (!data) throw new Error("Request not found.");

  const body = String(formData.get("body") ?? "");
  await sendCustomerMessage(requestId, body, supabase);

  revalidatePath("/messages");
  revalidatePath(`/requests/${requestId}`);
}
