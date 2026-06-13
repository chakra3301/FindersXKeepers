"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRequestSchema } from "@/lib/validation/request";
import { screenRequest, type ScreenMatch } from "@/lib/prohibited/blocklist";

export interface CreateRequestState {
  status: "idle" | "error" | "blocked";
  message?: string;
  fieldErrors?: Record<string, string>;
  matches?: ScreenMatch[];
}

function parseArray(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export async function createRequest(
  _prev: CreateRequestState,
  formData: FormData,
): Promise<CreateRequestState> {
  const budgetRaw = formData.get("budgetCapJpy");
  const budgetCapJpy =
    typeof budgetRaw === "string" && budgetRaw.trim() !== ""
      ? Number(budgetRaw.replace(/[^\d]/g, ""))
      : null;

  const deadlineRaw = formData.get("deadlineAt");
  const deadlineAt =
    typeof deadlineRaw === "string" && deadlineRaw.trim() !== ""
      ? deadlineRaw
      : null;

  const parsed = createRequestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    referenceUrl: formData.get("referenceUrl") ?? "",
    referenceImageUrl: formData.get("referenceImageUrl") ?? "",
    minCondition: formData.get("minCondition"),
    mustHaves: parseArray(formData.get("mustHaves")),
    niceToHaves: parseArray(formData.get("niceToHaves")),
    budgetCapJpy,
    rushTier: formData.get("rushTier"),
    deadlineAt,
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

  const input = parsed.data;

  // Prohibited-items checkpoint — a real gate, before anything is written.
  const screen = screenRequest({
    title: input.title,
    description: input.description,
    mustHaves: input.mustHaves,
    niceToHaves: input.niceToHaves,
  });
  if (!screen.allowed) {
    return {
      status: "blocked",
      message:
        "We can't source this — it matches our prohibited-items policy.",
      matches: screen.matches,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Your session expired. Sign in again." };
  }

  const { data, error } = await supabase
    .from("requests")
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description || null,
      reference_url: input.referenceUrl || null,
      reference_image_url: input.referenceImageUrl || null,
      min_condition: input.minCondition,
      must_haves: input.mustHaves,
      nice_to_haves: input.niceToHaves,
      budget_cap_jpy: input.budgetCapJpy,
      rush_tier: input.rushTier,
      deadline_at: deadlineAt,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      status: "error",
      message: "Couldn't save your request. Please try again.",
    };
  }

  revalidatePath("/dashboard");
  redirect(`/requests/${data.id}`);
}
