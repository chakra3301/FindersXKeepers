import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JapanMatrixWord } from "@/components/marketing/japan-matrix-word";
import { GlitchRule, Crosshair } from "@/components/marketing/decor";
import { Reveal } from "@/components/marketing/reveal";

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 pb-28 pt-8 lg:px-10">
      <Reveal className="relative overflow-hidden rounded-[var(--radius-3xl)] border border-border bg-card px-6 py-20 text-center">
        <div
          aria-hidden
          className="dot-grid-dense pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(60%_60%_at_50%_50%,#000,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.52_0.2_25_/_0.14),transparent_65%)]"
        />
        <Crosshair className="absolute left-5 top-5" />
        <Crosshair className="absolute right-5 top-5" />
        <Crosshair className="absolute bottom-5 left-5" />
        <Crosshair className="absolute bottom-5 right-5" />

        <div className="relative">
          <span className="mono-label inline-flex items-center gap-2">
            <span className="pulse-dot size-1.5 rounded-full bg-primary" />
            Start your hunt
          </span>
          <h2 className="mx-auto mt-5 max-w-3xl font-display text-balance text-3xl font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
            If it&apos;s in <JapanMatrixWord />,
            <span className="block">there&apos;s nothing we can&apos;t find.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-pretty text-base text-muted-foreground">
            Post your first request in two minutes. No charge until your item ships,
            and a full refund if we come up empty.
          </p>
          <GlitchRule className="mx-auto mt-9 max-w-xs" />
          <Link
            href="/requests/new"
            className={cn(buttonVariants({ size: "lg" }), "mt-9 h-12 px-8 text-[0.95rem]")}
          >
            Post a request
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
