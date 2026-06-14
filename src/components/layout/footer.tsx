import Link from "next/link";

/**
 * Always-present footer. The 特商法 (Specified Commercial Transactions Act)
 * disclosure link is a non-negotiable legal requirement on every page.
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Inline mark — keeps the footer self-contained without importing Logo */}
          <svg
            aria-hidden
            width="18"
            height="18"
            viewBox="0 0 28 28"
            fill="none"
            className="shrink-0 text-primary"
          >
            <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2" />
            <circle cx="14" cy="14" r="3.6" fill="currentColor" />
          </svg>
          <span className="tracking-tight">
            Finders Keepers · concierge sourcing from Japan
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/legal/tokushoho"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            特定商取引法に基づく表記
          </Link>
          <Link
            href="/legal/terms"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Terms
          </Link>
          <Link
            href="/legal/privacy"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
