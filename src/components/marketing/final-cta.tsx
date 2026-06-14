import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 pb-28 pt-8 lg:px-10">
      <div className="relative overflow-hidden rounded-[var(--radius-3xl)] border border-border bg-card px-6 py-20 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.52_0.2_25_/_0.12),transparent_65%)]"
        />
        <div className="relative">
          <p className="section-label">Start your hunt</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-balance text-3xl font-semibold tracking-tight sm:text-[2.5rem]">
            There&apos;s nothing we can&apos;t find.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base text-muted-foreground">
            Post your first request in two minutes. No charge until your item ships,
            and a full refund if we come up empty.
          </p>
          <Link
            href="/requests/new"
            className={cn(buttonVariants({ size: "lg" }), "mt-9 h-12 px-8 text-[0.95rem]")}
          >
            Post a request
          </Link>
        </div>
      </div>
    </section>
  );
}
