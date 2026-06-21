"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findInventoryItem } from "@/lib/inventory";
import { screenRequest } from "@/lib/prohibited/blocklist";
import { getFxToJpy, toJpy } from "@/lib/estimator/fx";

/**
 * Claim an in-stock item: skip the multi-step hunt builder by creating a
 * pre-filled request (item is sealed/new and in hand) and dropping the buyer
 * straight onto the real checkout, which still enforces the four-line ledger
 * and escrow hold.
 */
export async function claimInventory(formData: FormData): Promise<void> {
  const slug = formData.get("slug");
  const item = typeof slug === "string" ? findInventoryItem(slug) : undefined;
  if (!item) redirect("/in-stock");

  // Prohibited-items checkpoint still runs, same as the normal create path.
  const screen = screenRequest({ title: item.name });
  if (!screen.allowed) redirect("/in-stock?blocked=1");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Listed price is USD pass-through → JPY budget cap (live FX, 150 fallback).
  const fx = await getFxToJpy();
  const budgetCapJpy = toJpy(item.priceUsd, "USD", fx) ?? item.priceUsd * 150;

  const { data, error } = await supabase
    .from("requests")
    .insert({
      user_id: user.id,
      title: item.name,
      description: "In-stock claim — sealed and in hand, ready to ship.",
      reference_url: null,
      reference_image_url: item.image,
      min_condition: "new",
      must_haves: [],
      nice_to_haves: [],
      budget_cap_jpy: budgetCapJpy,
      rush_tier: "standard",
      deadline_at: null,
      in_stock: true,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) redirect("/in-stock?error=1");

  revalidatePath("/dashboard");
  redirect(`/requests/${data.id}/checkout`);
}
