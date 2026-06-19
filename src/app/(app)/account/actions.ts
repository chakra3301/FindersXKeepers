"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { updateProfile } from "@/lib/profile/update";
import { updateProfileSchema } from "@/lib/profile/validation";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/addresses/operations";
import { addressSchema } from "@/lib/addresses/validation";
import type {
  UpdateProfileState,
  NotificationPrefsState,
  AddressFormState,
} from "./form-state";

export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse({
    shippingCountry: formData.get("shippingCountry") ?? "",
    currencyPref: formData.get("currencyPref"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  try {
    await updateProfile(user.id, parsed.data, supabase);
  } catch {
    return {
      status: "error",
      message: "Couldn't save your settings. Please try again.",
    };
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: "Settings saved.",
  };
}

// Unchecked checkboxes are absent from FormData; presence === opted in.
export async function updateNotificationPrefsAction(
  _prev: NotificationPrefsState,
  formData: FormData,
): Promise<NotificationPrefsState> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      notify_action_needed: formData.get("notify_action_needed") === "on",
      notify_messages: formData.get("notify_messages") === "on",
      notify_shipped: formData.get("notify_shipped") === "on",
    })
    .eq("id", user.id);
  if (error) {
    return {
      status: "error",
      message: "Couldn't save your preferences. Please try again.",
    };
  }
  revalidatePath("/account");
  return { status: "success", message: "Notification preferences saved." };
}

function parseAddress(formData: FormData) {
  return addressSchema.safeParse({
    recipientName: formData.get("recipientName") ?? "",
    line1: formData.get("line1") ?? "",
    line2: formData.get("line2") ?? "",
    city: formData.get("city") ?? "",
    region: formData.get("region") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    country: formData.get("country") ?? "",
    phone: formData.get("phone") ?? "",
  });
}

function fieldErrorsFrom(parsed: {
  error: { issues: readonly { path: PropertyKey[]; message: string }[] };
}) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

export async function createAddressAction(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireUser();
  const parsed = parseAddress(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed),
    };
  }
  const supabase = await createClient();
  try {
    await createAddress(
      user.id,
      parsed.data,
      formData.get("makeDefault") === "on",
      supabase,
    );
  } catch {
    return {
      status: "error",
      message: "Couldn't save this address. Please try again.",
    };
  }
  revalidatePath("/account");
  return { status: "success", message: "Address saved." };
}

export async function updateAddressAction(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing address." };
  const parsed = parseAddress(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed),
    };
  }
  const supabase = await createClient();
  try {
    await updateAddress(user.id, id, parsed.data, supabase);
  } catch {
    return {
      status: "error",
      message: "Couldn't update this address. Please try again.",
    };
  }
  revalidatePath("/account");
  return { status: "success", message: "Address updated." };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await deleteAddress(user.id, id, supabase);
  revalidatePath("/account");
}

export async function setDefaultAddressAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await setDefaultAddress(user.id, id, supabase);
  revalidatePath("/account");
}

export async function saveAvatarAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const url = String(formData.get("avatarUrl") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url === "" ? null : url })
    .eq("id", user.id);
  if (error) {
    console.error(`[saveAvatarAction] ${error.code ?? ""} ${error.message}`);
    return; // never throw to the error boundary
  }
  revalidatePath("/account");
  revalidatePath("/dashboard");
}
