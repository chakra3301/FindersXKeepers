"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import {
  postCandidate,
  markPurchased,
  markReceived,
} from "@/lib/requests/operations";
import { sendTeamMessage } from "@/lib/requests/messages";
import { uploadProofFilesFromFormData } from "@/lib/storage";

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
  const listingImages = await uploadProofFilesFromFormData(
    requestId,
    "listing",
    formData,
    "listingImages",
  );

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

  const receivedImageUrls = await uploadProofFilesFromFormData(
    requestId,
    "received",
    formData,
    "receivedImages",
  );

  await markReceived(requestId, { receivedImageUrls });

  revalidatePath("/operator");
  revalidatePath(`/operator/${requestId}`);
  revalidatePath("/dashboard");
  redirect(`/operator/${requestId}`);
}

export async function sendTeamMessageAction(
  requestId: string,
  formData: FormData,
): Promise<void> {
  await requireStaff();
  const body = String(formData.get("body") ?? "");
  await sendTeamMessage(requestId, body);
  revalidatePath("/operator");
  revalidatePath(`/operator/${requestId}`);
  revalidatePath("/messages");
}
