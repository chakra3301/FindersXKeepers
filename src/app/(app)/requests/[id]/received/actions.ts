"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { shipApprovedOrder } from "@/lib/requests/operations";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Customer's final go-ahead. RLS-scoped existence check (the page is already
 * gated on status === "received"), then fire the real escrow release via
 * shipApprovedOrder → recordShipment with a demo tracking number, which
 * advances received → shipped. redirect() stays outside any try/catch.
 */
export async function approveAndShip(requestId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("id")
    .eq("id", requestId)
    .maybeSingle();
  if (!data) throw new Error("Request not found.");

  await shipApprovedOrder(requestId);
  revalidatePath("/dashboard");
  redirect(`/requests/${requestId}`);
}
