import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const metadata = {
  title: "特定商取引法に基づく表記 — Finders × Keepers",
  description:
    "Disclosure required under Japan's Specified Commercial Transactions Act (特定商取引法).",
};

// Disclosure rows. Values marked [to be completed] are filled before launch;
// the page itself is a real, linked legal surface from day one.
const ROWS: { label: string; ja: string; value: React.ReactNode }[] = [
  {
    label: "Legal seller",
    ja: "販売事業者",
    value: "[Registered entity name — to be completed]",
  },
  {
    label: "Representative",
    ja: "運営責任者",
    value: "[Representative name — to be completed]",
  },
  {
    label: "Address",
    ja: "所在地",
    value: "[Registered address in Japan — to be completed]",
  },
  {
    label: "Contact",
    ja: "連絡先",
    value: "support@finderskeepers.example · [phone — to be completed]",
  },
  {
    label: "Service & fees",
    ja: "役務・手数料",
    value:
      "Concierge sourcing agency. Charges are disclosed per order as four separate lines — item cost (pass-through), finder's fee (our service fee), shipping, and tax. We act as a sourcing agent and never resell goods.",
  },
  {
    label: "Payment method",
    ja: "支払方法",
    value:
      "Card payment via our payment processor. Funds are held in escrow by the processor and released to suppliers/us only on our trigger — once your item is in transit.",
  },
  {
    label: "Payment timing",
    ja: "支払時期",
    value:
      "Authorised when you approve a sourced candidate; captured into escrow at that time.",
  },
  {
    label: "Delivery",
    ja: "引渡し時期",
    value:
      "Sourcing timelines vary by item and rush tier. Items ship after you approve the sourced candidate and we receive the goods; a tracking number is provided on dispatch.",
  },
  {
    label: "Returns & cancellation",
    ja: "返品・キャンセル",
    value:
      "You may cancel before a candidate is purchased for a full refund of escrowed funds. After purchase, returns follow the supplier's policy and the condition you accepted. Defects not matching the disclosed condition are refundable.",
  },
];

export default function TokushohoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>

      <header className="mb-10 border-b border-border pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Legal disclosure
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
          特定商取引法に基づく表記
        </h1>
        <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground">
          Disclosure required under Japan&rsquo;s Specified Commercial
          Transactions Act (
          <span className="font-medium text-foreground">特定商取引法</span>).
          Finders × Keepers operates as a sourcing <em>agent</em> — purchasing on
          your behalf, never reselling.
        </p>
      </header>

      <dl className="divide-y divide-border">
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="grid gap-1.5 py-5 sm:grid-cols-[200px_1fr] sm:gap-8"
          >
            <dt className="shrink-0">
              <div className="text-sm font-medium text-foreground">
                {row.label}
              </div>
              <div className="text-xs text-muted-foreground">{row.ja}</div>
            </dt>
            <dd className="text-sm leading-relaxed text-foreground/90">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-10 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        This disclosure is part of a product build and contains placeholder
        registration details. Bracketed values are completed with the registered
        business information before commercial launch.
      </p>
    </main>
  );
}
