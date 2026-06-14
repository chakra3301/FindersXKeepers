import { computeQuote, totalJpy, formatJpy, SHIPPING_ESTIMATE_JPY } from "@/lib/pricing";

const EXAMPLE_ITEM_JPY = 42_000;

function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function EscrowBand() {
  const quote = computeQuote({
    itemCostJpy: EXAMPLE_ITEM_JPY,
    shippingJpy: SHIPPING_ESTIMATE_JPY,
    rushTier: "standard",
  });
  const lines = [
    { label: "Item cost", note: "Pass-through", value: quote.itemCostJpy },
    { label: "Finder's fee", note: "Our service fee", value: quote.finderFeeJpy },
    { label: "Shipping", note: "Japan → you", value: quote.shippingJpy },
    { label: "Tax", note: "Consumption tax", value: quote.taxJpy },
  ];
  return (
    <section className="px-6 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="relative overflow-hidden rounded-[var(--radius-3xl)] border border-border bg-card px-7 py-14 sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-primary">
                <ShieldIcon />
                Escrow, in plain terms
              </div>
              <h2 className="font-display text-balance text-3xl font-semibold leading-[1.08] tracking-tight sm:text-[2.25rem]">
                Held in escrow, released only when it ships.
              </h2>
              <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
                Four separate lines, always. You see exactly what you pay — item
                cost is pass-through, our finder&apos;s fee is disclosed, and funds
                release to us only once your item is in transit. If we can&apos;t
                find it by the deadline, you&apos;re refunded in full.
              </p>
            </div>
            <dl className="rounded-2xl border border-border bg-background/40 p-6">
              <div className="mb-3 section-label">Every price, four lines</div>
              {lines.map((l) => (
                <div
                  key={l.label}
                  className="flex items-baseline justify-between border-b border-border py-2.5"
                >
                  <dt className="flex flex-col">
                    <span className="text-sm">{l.label}</span>
                    <span className="text-[11px] text-muted-foreground">{l.note}</span>
                  </dt>
                  <dd className="tnum text-sm font-medium">{formatJpy(l.value)}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between pt-3.5">
                <span className="text-sm font-semibold">Total held in escrow</span>
                <span className="tnum text-lg font-semibold text-primary">{formatJpy(totalJpy(quote))}</span>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
