import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, AlertCircle, ShieldCheck } from "lucide-react";
import { getRequestDetail } from "@/lib/requests/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStripeCheckoutReturn } from "@/lib/escrow/sync-checkout-return";
import { STATUS_META } from "@/lib/requests/status";
import { RUSH_LABEL, formatJpy } from "@/lib/pricing";
import { formatRelativeTime } from "@/lib/dates";
import {
  railProgress,
  escrowCaption,
  conditionLabel,
} from "@/lib/requests/display";
import { escrowStateFromPayments } from "@/lib/escrow/display";
import { StatusBadge } from "@/components/requests/status-badge";
import { EscrowBadge } from "@/components/requests/escrow-badge";
import { LifecycleRail } from "@/components/requests/lifecycle-rail";
import { PriceBreakdown } from "@/components/requests/price-breakdown";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id } = await params;
  const { checkout } = await searchParams;

  // Heal stuck "Authorising" when Stripe payment succeeded but the webhook was
  // redirected (pre-fix) or delayed.
  if (checkout === "complete") {
    await syncStripeCheckoutReturn(id, createAdminClient());
  }

  const detail = await getRequestDetail(id);
  if (!detail) notFound();

  const { request, candidates, orders, shipments, messages, payments } = detail;
  const meta = STATUS_META[request.status];

  // Latest-first arrays (queries already order desc)
  const latestOrder = orders[0] ?? null;
  const latestCandidate = candidates[0] ?? null;
  const latestShipment = shipments[0] ?? null;

  // Headline amount: latest order total → latest candidate price → budget cap
  const headlineJpy: number | null = latestOrder
    ? latestOrder.total_jpy
    : latestCandidate
      ? latestCandidate.price_jpy
      : request.budget_cap_jpy;

  // Real escrow state from payment rows
  const escrowState = escrowStateFromPayments(payments);
  const settledPayment = payments.find((p) => p.status === "released") ?? null;

  // Neutral caption label derived from same order→candidate→budget precedence
  const capLabel: string = latestOrder
    ? "Order total"
    : latestCandidate
      ? "Candidate price"
      : "Budget cap";

  // Progress bar
  const progress = railProgress(request.status);

  // Timestamps for LifecycleRail — best-effort from available data
  const timestamps: Partial<Record<(typeof request.status), string>> = {
    open: formatRelativeTime(request.created_at),
  };
  if (latestCandidate) {
    timestamps.candidate_sent = formatRelativeTime(latestCandidate.created_at);
  }
  if (latestOrder) {
    timestamps.purchased = formatRelativeTime(latestOrder.created_at);
  }
  if (latestShipment?.shipped_at) {
    timestamps.shipped = formatRelativeTime(latestShipment.shipped_at);
  }

  // Action banner: action_needed bucket OR received (customer final-check moment)
  const showActionBanner =
    meta.bucket === "action_needed" || request.status === "received";
  const actionMessage =
    request.status === "candidate_sent"
      ? "Candidate found — review it"
      : request.status === "received"
        ? "It arrived — final check"
        : meta.blurb;

  // Team messages (from hunter), newest-first
  const teamMessages = messages
    .filter((m) => m.sender === "team")
    .slice()
    .reverse();

  // Tracking card: only when shipped and shipment has tracking_number
  const showTracking =
    request.status === "shipped" &&
    latestShipment != null &&
    latestShipment.tracking_number != null;

  return (
    <div className="mx-auto max-w-[1000px] px-10 pt-8 pb-20">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"
      >
        <ChevronLeft size={15} />
        All hunts
      </Link>

      {/* Header */}
      <header className="mt-6 flex items-start gap-5">
        <PlaceholderThumb label="card" className="h-[120px] w-[88px] shrink-0" />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Title row */}
          <div className="flex items-center gap-3">
            <h1 className="min-w-0 truncate text-[25px] font-[600] tracking-tight">
              {request.title}
            </h1>
            <StatusBadge status={request.status} className="shrink-0" />
            <EscrowBadge state={escrowState} className="shrink-0" />
          </div>

          {/* Meta line */}
          <p className="font-mono text-[13.5px] text-muted-foreground">
            {conditionLabel(request.min_condition)} · {RUSH_LABEL[request.rush_tier]}
          </p>

          {/* Progress bar */}
          <div className="flex max-w-[420px] gap-[3px]">
            {Array.from({ length: progress.total }).map((_, i) => (
              <span
                key={i}
                className={[
                  "h-[5px] flex-1 rounded-full",
                  i < progress.filled
                    ? progress.tone === "success"
                      ? "bg-success"
                      : "bg-primary"
                    : "bg-border",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        {/* Headline amount (right) */}
        <div className="shrink-0 text-right">
          <div className="text-[11.5px] text-muted-foreground">
            {escrowState === "none"
              ? capLabel
              : escrowState === "pending"
                ? "Authorising deposit"
                : escrowCaption(request.status)}
          </div>
          <div className="tnum text-2xl font-[600]">
            {formatJpy(headlineJpy)}
          </div>
        </div>
      </header>

      {/* Deposit confirmed after Stripe return */}
      {checkout === "complete" &&
        request.status === "sourcing" &&
        escrowState === "held" && (
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-success-border bg-success-muted px-5 py-4">
            <ShieldCheck size={18} className="shrink-0 text-success" />
            <div>
              <div className="text-[13.5px] font-[560] text-success">
                Deposit confirmed
              </div>
              <div className="text-[12.5px] text-success/80">
                Your escrow hold is in place — we&apos;re sourcing now.
              </div>
            </div>
          </div>
        )}

      {/* Action banner */}
      {showActionBanner && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-warning-border bg-warning-muted px-5 py-4">
          <AlertCircle size={18} className="shrink-0 text-warning" />
          <div>
            <div className="text-[13.5px] font-[560] text-warning">
              {actionMessage}
            </div>
            <div className="text-[12.5px] text-warning/80">
              Take a look — your escrow stays held while you decide.
            </div>
          </div>
        </div>
      )}

      {/* Unfunded open request → deposit CTA */}
      {request.status === "open" && escrowState === "none" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <div className="text-[13.5px]">
            <div className="font-[560]">Fund this hunt</div>
            <div className="text-muted-foreground">Deposit into escrow so we can start sourcing.</div>
          </div>
          <Link href={`/requests/${request.id}/checkout`}
            className={cn(buttonVariants(), "shrink-0")}>
            Deposit into escrow
          </Link>
        </div>
      )}

      {/* Payment started but not completed (Stripe hosted checkout) */}
      {request.status === "open" && escrowState === "pending" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-border bg-warning-muted px-5 py-4">
          <div className="text-[13.5px]">
            <div className="font-[560] text-warning">Complete your deposit</div>
            <div className="text-warning/80">
              Payment was started but not finished. Continue to Stripe to fund this hunt.
            </div>
          </div>
          <Link
            href={`/requests/${request.id}/checkout`}
            className={cn(buttonVariants(), "shrink-0")}
          >
            Continue to payment
          </Link>
        </div>
      )}

      {/* Two-column grid */}
      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1.55fr_1fr]">
        {/* LEFT column */}
        <div className="flex flex-col gap-5">
          {/* Lifecycle card */}
          <section className="surface p-6">
            <h2 className="mb-4 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
              Lifecycle
            </h2>
            <LifecycleRail status={request.status} timestamps={timestamps} />
          </section>

          {/* Proof photos card — only when orders exist */}
          {orders.length > 0 && (
            <section className="surface p-6">
              <h2 className="mb-4 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
                Proof photos
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                <PlaceholderThumb label="front" className="aspect-[3/4]" />
                <PlaceholderThumb label="back" className="aspect-[3/4]" />
                <PlaceholderThumb label="corners" className="aspect-[3/4]" />
              </div>
            </section>
          )}

          {/* Updates from your hunter — only when team messages exist */}
          {teamMessages.length > 0 && (
            <section className="surface p-6">
              <h2 className="mb-4 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
                Updates from your hunter
              </h2>
              <ul className="flex flex-col gap-4">
                {teamMessages.map((m) => (
                  <li key={m.id} className="flex items-start gap-3">
                    <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-accent text-xs font-[600] text-primary">
                      A
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] leading-relaxed">{m.body}</p>
                      <p className="mt-1 text-[11.5px] text-muted-foreground">
                        your hunter · {formatRelativeTime(m.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* RIGHT column */}
        <div className="flex flex-col gap-4">
          {/* Pricing */}
          {latestOrder ? (
            <PriceBreakdown order={latestOrder} />
          ) : (
            <section className="surface p-6">
              <h2 className="mb-3 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
                What you&apos;ll pay
              </h2>
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px] text-foreground">Budget cap</span>
                <span className="tnum text-[13.5px] font-[540]">
                  {formatJpy(request.budget_cap_jpy)}
                </span>
              </div>
              <p className="mt-3 text-[11.5px] text-muted-foreground">
                Final four-line quote appears once we propose a match.
              </p>
            </section>
          )}

          {/* Escrow status card */}
          <section className="rounded-2xl border border-success-border bg-success-muted/40 p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-[560] text-success">
              <ShieldCheck size={13} />
              Escrow protection
            </div>
            <p className="text-[13px] leading-relaxed text-success/90">
              {escrowState === "none" && (
                <>
                  You&apos;ll deposit into escrow to start the hunt. Funds are
                  then held by Finders Keepers and released to us only once your
                  item ships — or refunded in full if we can&apos;t find it by
                  the deadline.
                </>
              )}
              {escrowState === "pending" && (
                <>
                  Your deposit is being authorised. Once held, it&apos;s
                  released only when your item ships.
                </>
              )}
              {escrowState === "held" && (
                <>
                  Your {formatJpy(headlineJpy)} is held by Finders Keepers and
                  released to us only when your item ships. Not found by
                  the deadline? Refunded in full.
                </>
              )}
              {escrowState === "released" && (
                <>
                  Escrow released — your item is on its way.
                  {settledPayment &&
                    settledPayment.refunded_jpy != null &&
                    settledPayment.refunded_jpy > 0 && (
                      <span className="mt-1 block text-success/80">
                        {formatJpy(settledPayment.captured_jpy)} released to us ·{" "}
                        {formatJpy(settledPayment.refunded_jpy)} returned to you.
                      </span>
                    )}
                </>
              )}
              {escrowState === "refunded" && <>Refunded to you in full.</>}
              {escrowState === "failed" && (
                <>
                  The last payment attempt failed. Please update your payment
                  method.
                </>
              )}
            </p>
          </section>

          {/* Tracking card — only when shipped and tracking number exists */}
          {showTracking && latestShipment && (
            <section className="surface p-6">
              <h2 className="mb-3 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
                Tracking
              </h2>
              <div className="font-mono text-[13px] font-[540]">
                {latestShipment.tracking_number}
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {latestShipment.carrier ?? "Carrier"} · est. delivery soon
              </p>
              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-[560] text-primary-foreground"
              >
                Track package
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
