"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import {
  postCandidate,
  markPurchased,
  markReceived,
} from "@/lib/requests/operations";

function parseUrlLines(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePrice(raw: FormDataEntryValue | null): number {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error("Price is required.");
  }
  const n = Number(raw.replace(/[^\d]/g, ""));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Enter a valid price in JPY.");
  return n;
}

export async function postCandidateAction(requestId: string, formData: FormData) {
  await requireStaff();

  const priceJpy = parsePrice(formData.get("priceJpy"));
  const listingUrl = String(formData.get("listingUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const listingImages = parseUrlLines(formData.get("listingImages"));

  await postCandidate(requestId, {
    priceJpy,
    listingUrl,
    notes,
    listingImages,
  });

  revalidatePath("/operator");
  revalidatePath(`/operator/${requestId}`);
  revalidatePath("/dashboard");
  redirect(`/operator/${requestId}`);
}

export async function markPurchasedAction(requestId: string) {
  await requireStaff();
  await markPurchased(requestId);
  revalidatePath("/operator");
  revalidatePath(`/operator/${requestId}`);
  revalidatePath("/dashboard");
  redirect(`/operator/${requestId}`);
}

export async function markReceivedAction(requestId: string, formData: FormData) {
  await requireStaff();

  const receivedImageUrls = parseUrlLines(formData.get("receivedImageUrls"));

  await markReceived(requestId, { receivedImageUrls });

  revalidatePath("/operator");
  revalidatePath(`/operator/${requestId}`);
  revalidatePath("/dashboard");
  redirect(`/operator/${requestId}`);
}
