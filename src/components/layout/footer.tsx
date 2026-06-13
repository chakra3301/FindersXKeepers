import Link from "next/link";

/**
 * Always-present footer. The 特商法 (Specified Commercial Transactions Act)
 * disclosure link is a non-negotiable legal requirement on every page.
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-background/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="tracking-tight">
          © {new Date().getFullYear()} Finders × Keepers — sourced from Japan, held in escrow.
        </p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/legal/tokushoho"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            特定商取引法に基づく表記
          </Link>
          <Link
            href="/legal/tokushoho"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Commercial Transactions disclosure
          </Link>
          <span className="text-muted-foreground/60">Agency sourcing · not resale</span>
        </nav>
      </div>
    </footer>
  );
}
