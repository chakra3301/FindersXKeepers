import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/db/types";

/** Current authenticated user, or null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Require a session; redirect to /login if absent. Returns the user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** The signed-in user's profile row (may be null right after signup). */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data;
}

/** Require a staff session for operator routes; non-staff → /dashboard. */
export async function requireStaff(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof requireUser>>>;
  profile: Profile;
}> {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile?.is_staff) redirect("/dashboard");
  return { user, profile };
}
