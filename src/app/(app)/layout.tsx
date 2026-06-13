import { requireUser } from "@/lib/auth";
import { getDashboardRequests } from "@/lib/requests/queries";
import { STATUS_META } from "@/lib/requests/status";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, requests] = await Promise.all([
    requireUser(),
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
      <Sidebar escrowTotal={escrowTotal} activeCount={activeCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={user.email ?? "you"} />
        <main className="flex-1 min-w-0 max-h-screen overflow-y-auto px-5 py-7 sm:px-8 sm:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
