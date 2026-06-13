"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { approveCandidate, keepHunting } from "@/lib/requests/operations";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function assertOwned(requestId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("id")
    .eq("id", requestId)
    .maybeSingle();
  if (!data) throw new Error("Request not found.");
}

export async function approveAction(requestId: string, candidateId: string) {
  await assertOwned(requestId);
  await approveCandidate(requestId, candidateId);
  revalidatePath("/dashboard");
  redirect(`/requests/${requestId}`);
}

export async function keepHuntingAction(requestId: string, candidateId: string) {
  await assertOwned(requestId);
  await keepHunting(requestId, candidateId);
  revalidatePath("/dashboard");
  redirect(`/requests/${requestId}`);
}
