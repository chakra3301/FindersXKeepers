"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const emailSchema = z.string().trim().toLowerCase().email();

export type AccountLookup =
  | { ok: true; exists: boolean; email: string }
  | { ok: false; message: string };

/**
 * Decide whether an email belongs to a RETURNING user or a NEW one, so the
 * client can branch to the "enter your code" screen vs the "create account"
 * screen before any OTP is sent.
 *
 * Detection reads the email mirror on `profiles` (migration 0007) with the
 * service-role client — `auth.users` isn't reachable over REST, and RLS would
 * otherwise hide other people's rows. Only a boolean leaves this function.
 */
export async function lookupAccount(rawEmail: string): Promise<AccountLookup> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address." };
  }
  const email = parsed.data;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    return { ok: true, exists: Boolean(data), email };
  } catch (err) {
    console.error("[auth] lookupAccount failed:", err);
    return {
      ok: false,
      message: "Couldn't reach the sign-in service. Please try again.",
    };
  }
}
