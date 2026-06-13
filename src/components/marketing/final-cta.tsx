import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16">
      <div className="rounded-[var(--radius-3xl)] border border-border bg-card px-6 py-16 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-[2rem]">
          There&apos;s nothing we can&apos;t find.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-pretty text-base text-muted-foreground">
          Post your first request in two minutes. No charge until your item ships,
          and a full refund if we come up empty.
        </p>
        <Link
          href="/requests/new"
          className={cn(buttonVariants({ size: "lg" }), "mt-8 h-11 px-6 text-[0.95rem]")}
        >
          Post a request
        </Link>
      </div>
    </section>
  );
}
