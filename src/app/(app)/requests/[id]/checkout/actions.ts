"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { depositForRequest } from "@/lib/requests/operations";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RushTier } from "@/lib/db/types";

export type CheckoutState =
  | { status: "idle" }
  | { status: "error"; message?: string }
  | { status: "redirect"; url: string };

export async function submitDeposit(
  requestId: string,
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  await requireUser();
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("requests")
    .select("id")
    .eq("id", requestId)
    .maybeSingle();
  if (!owned) return { status: "error", message: "Request not found." };

  const rushTier = (formData.get("rushTier") as RushTier) ?? "standard";
  let checkoutUrl: string | undefined;
  try {
    ({ checkoutUrl } = await depositForRequest(requestId, rushTier));
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath(`/requests/${requestId}/checkout`);
  if (checkoutUrl) {
    return { status: "redirect", url: checkoutUrl };
  }
  // Stub provider — no hosted checkout; land on the request detail page.
  redirect(`/requests/${requestId}`);
}
