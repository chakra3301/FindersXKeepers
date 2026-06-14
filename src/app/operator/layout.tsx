import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Operator console — Finders Keepers" };

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();

  return (
    <div className="flex min-h-[100svh] flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/operator" className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              Operator console
            </span>
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "text-[13px]",
            )}
          >
            Customer dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
