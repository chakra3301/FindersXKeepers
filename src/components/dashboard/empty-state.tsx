import Link from "next/link";
import { PackagePlus, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center lift rise">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(50% 60% at 50% 0%, oklch(0.93 0.03 264 / 0.5) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
          <PackagePlus className="size-7 text-primary" />
        </div>
        <h2 className="mt-6 font-sans text-2xl font-medium tracking-tight">
          Your concierge desk is ready
        </h2>
        <p className="mt-2.5 text-pretty text-sm leading-relaxed text-muted-foreground">
          Post the first thing you want from Japan — a specific listing, a grail
          you&rsquo;ve been hunting, or just a description. Set a budget and the
          condition you&rsquo;ll accept, and our finders take it from there.
        </p>
        <div className="mt-7">
          <Link
            href="/requests/new"
            className={cn(buttonVariants({ size: "lg" }), "gap-2")}
          >
            <Sparkles className="size-4" />
            Post your first request
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Funds stay in escrow until your item ships — you&rsquo;re never charged
          for a search.
        </p>
      </div>
    </div>
  );
}
