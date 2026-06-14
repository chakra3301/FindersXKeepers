"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { updateProfile } from "@/lib/profile/update";
import { updateProfileSchema } from "@/lib/profile/validation";

export interface UpdateProfileState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

const initialState: UpdateProfileState = { status: "idle" };

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

export { initialState as updateProfileInitialState };
