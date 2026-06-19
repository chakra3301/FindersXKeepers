import { requireUser, getProfile } from "@/lib/auth";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { getDashboardRequests } from "@/lib/requests/queries";
import { STATUS_META } from "@/lib/requests/status";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    return await renderAppLayout(children);
  } catch (e) {
    const digest =
      typeof e === "object" && e && "digest" in e
        ? String((e as { digest?: unknown }).digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND")) {
      throw e;
    }
    const msg = e instanceof Error ? `${e.name}: ${e.message}\n\n${e.stack ?? ""}` : String(e);
    console.error("[AppLayout]", msg);
    return (
      <main className="mx-auto max-w-[820px] px-6 py-12">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">App layout debug</h1>
        <pre className="overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-[12px] whitespace-pre-wrap text-destructive">
          {msg}
        </pre>
      </main>
    );
  }
}

async function renderAppLayout(children: React.ReactNode) {
  const [user, profile, requests] = await Promise.all([
    requireUser(),
    getProfile(),
    getDashboardRequests(),
  ]);

  const funded = requests.filter(
    (r) =>
      STATUS_META[r.status].rail !== null &&
      (r.escrowState === "held" || r.escrowState === "pending"),
  );
  const escrowTotal = funded.reduce(
    (s, r) => s + (r.headline.amountJpy ?? 0),
    0,
  );
  const activeCount = funded.length;

  return (
    <div className="flex flex-1">
      <Sidebar
        escrowTotal={escrowTotal}
        activeCount={activeCount}
        isStaff={profile?.is_staff ?? false}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={user.email ?? "you"}
          avatarUrl={resolveAvatarUrl(profile?.avatar_url)}
        />
        <main className="flex-1 min-w-0 px-5 py-7 sm:px-8 sm:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
