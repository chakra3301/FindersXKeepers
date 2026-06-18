import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { formatJpy } from "@/lib/pricing";
import { formatLocalApprox } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { JapanMatrixWord } from "@/components/marketing/japan-matrix-word";
import { Ticker } from "@/components/marketing/ticker";
import { HoloCard } from "@/components/marketing/holo-card";
import { SectionTag, Crosshair, RegisterFrame } from "@/components/marketing/decor";

const SAMPLE_HELD_JPY = 48_000;

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12l2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Hero() {
  return (
    <header className="relative flex min-h-[100dvh] flex-col overflow-x-clip">
      {/* atmosphere — dot-grid registration texture + faint scanlines */}
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(80%_60%_at_50%_0%,#000,transparent)]"
      />

      {/* centered holographic card — sits behind the headline + live request */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div className="absolute left-1/2 top-[6rem] -translate-x-1/2 sm:top-24">
          <HoloCard
            ambient
            src="/brand/finds/charizard.webp"
            alt=""
            width={360}
          />
        </div>
        {/* legibility scrim — darker on the left (behind text), lets the foil
            breathe on the right/center where the card sits */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/15 to-background/55" />
      </div>

      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" aria-label="Finders Keepers home">
            <Logo />
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:inline-flex">
              <span className="pulse-dot size-1.5 rounded-full bg-success" />
              Tokyo&nbsp;↔&nbsp;Worldwide
            </span>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground sm:inline-flex",
              )}
            >
              Sign in
            </Link>
            <Link href="/requests/new" className={buttonVariants({ size: "sm" })}>
              Post a request
            </Link>
          </div>
        </nav>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-16 px-6 pb-16 pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20 lg:px-10 lg:pb-20 lg:pt-20">
        <div className="rise max-w-2xl">
          <SectionTag index="JP" className="mb-7">
            Concierge sourcing
          </SectionTag>
          <h1 className="font-display text-balance text-[2.85rem] font-semibold leading-[1.0] tracking-tight sm:text-6xl lg:text-[4.5rem]">
            Tell us what you want from{" "}
            <JapanMatrixWord />.
            <span className="mt-3 block text-primary">We hunt it down.</span>
          </h1>
          <p className="mt-8 max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-muted-foreground">
            Post a request, set your budget cap and the condition you&apos;ll
            accept, and pay into escrow. We search Japanese auctions, secondhand
            shops and stores, send you proof, and ship only on your approval —{" "}
            <strong className="font-medium text-foreground">
              you&apos;re charged only once it&apos;s in transit.
            </strong>
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/requests/new"
              className={cn(buttonVariants({ size: "lg" }), "h-12 px-7 text-[0.95rem]")}
            >
              Post a request
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 border-border/80 bg-transparent px-6 text-[0.95rem] hover:bg-secondary",
              )}
            >
              Sign in
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-2.5 text-sm text-muted-foreground">
            <ShieldCheck className="shrink-0 text-success" />
            Funds held in escrow · released only when your item ships
          </div>
        </div>

        <div className="rise relative" style={{ animationDelay: "140ms" }}>
          <RegisterFrame>
            <div className="lift surface scanlines relative overflow-hidden p-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="mono-label">Live request</span>
                <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60">
                  #FK-2284
                </span>
              </div>
              <div className="flex gap-4">
                <div className="relative h-[112px] w-[82px] flex-none overflow-hidden rounded-[10px] border border-input">
                  <Image
                    src="/brand/finds/charizard.webp"
                    alt="Mega Charizard X ex SAR card"
                    fill
                    sizes="82px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.95rem] font-medium tracking-tight">Mega Charizard X ex — SAR</div>
                  <div className="mt-0.5 font-mono text-xs text-muted-foreground">110/080 · M2</div>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-warning-muted px-2.5 py-1 text-[11px] font-medium text-warning">
                    <span className="pulse-dot size-1.5 rounded-full bg-warning" />
                    Match found · review
                  </div>
                  <div className="mt-3 flex gap-[3px]" aria-hidden>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full",
                          i < 3 ? "bg-sky-400" : "bg-border",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-[11px] text-muted-foreground">Held in escrow</div>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      Sample
                    </span>
                  </div>
                  <div className="tnum text-lg font-semibold tracking-tight">{formatJpy(SAMPLE_HELD_JPY)}</div>
                  <div className="tnum text-[11px] text-muted-foreground/70">{formatLocalApprox(SAMPLE_HELD_JPY, "USD")}</div>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
                  <ShieldCheck />
                  Held safely
                </div>
              </div>
            </div>
          </RegisterFrame>

          {/* aligned status strip — replaces the old overlapping card */}
          <div className="lift surface mt-3 flex items-center gap-3 px-4 py-3">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-success-muted text-success">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 13l4 4 10-11"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="flex-1">
              <div className="text-xs font-medium">Found in 3 days</div>
              <div className="text-[11px] text-muted-foreground">Umbreon VMAX · PSA 10</div>
            </div>
            <Crosshair className="opacity-50" />
          </div>
        </div>
      </div>

      <Ticker className="relative" />
    </header>
  );
}
