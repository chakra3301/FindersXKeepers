import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  PackageCheck,
  Truck,
} from "lucide-react";
import { getRequestDetail } from "@/lib/requests/queries";
import { STATUS_META } from "@/lib/requests/status";
import { escrowStateFromPayments, ESCROW_META } from "@/lib/escrow/display";
import { RUSH_LABEL, formatJpy } from "@/lib/pricing";
import { formatDate, formatRelativeTime } from "@/lib/dates";
import type { MinCondition } from "@/lib/db/types";
import { StatusBadge } from "@/components/requests/status-badge";
import { EscrowBadge } from "@/components/requests/escrow-badge";
import { LifecycleRail } from "@/components/requests/lifecycle-rail";
import { PriceBreakdown } from "@/components/requests/price-breakdown";
import { CandidateCard } from "@/components/requests/candidate-card";

const CONDITION_LABEL: Record<MinCondition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  acceptable: "Acceptable",
  any: "Any condition",
};

const RECEIPT_LABEL = {
  pending: "Awaiting inspection",
  accepted: "Accepted",
  rejected: "Rejected",
} as const;

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getRequestDetail(id);
  if (!detail) notFound();

  const { request, candidates, orders, shipments, payments, messages } = detail;
  const meta = STATUS_META[request.status];
  const escrowState = escrowStateFromPayments(payments);
  const escrowMeta = ESCROW_META[escrowState];
  const order = orders[0];
  const shipment = shipments[0];
  const latestPayment = payments[0];

  return (
    <div className="mx-auto w-full max-w-5xl rise">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      {/* Header */}
      <header className="mt-5 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <EscrowBadge state={escrowState} />
        </div>
        <h1 className="mt-3 text-pretty font-sans text-2xl font-medium tracking-tight sm:text-3xl">
          {request.title}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {meta.blurb} · Posted {formatRelativeTime(request.created_at)} · Updated{" "}
          {formatRelativeTime(request.updated_at)}
        </p>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          {request.description && (
            <Panel title="The brief">
              <p className="text-sm leading-relaxed text-foreground/90">
                {request.description}
              </p>
              {(request.must_haves.length > 0 ||
                request.nice_to_haves.length > 0) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TagList label="Must-haves" items={request.must_haves} />
                  <TagList label="Nice-to-haves" items={request.nice_to_haves} />
                </div>
              )}
              {(request.reference_url || request.reference_image_url) && (
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/70 pt-4">
                  {request.reference_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={request.reference_image_url}
                      alt="Reference"
                      className="size-16 rounded-lg border border-border object-cover"
                      loading="lazy"
                    />
                  )}
                  {request.reference_url && (
                    <a
                      href={request.reference_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Reference link
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}
            </Panel>
          )}

          {candidates.length > 0 && (
            <Panel
              title="Sourced candidates"
              subtitle={
                request.status === "candidate_sent"
                  ? "Review and approve to move forward."
                  : undefined
              }
            >
              <div className="flex flex-col gap-3">
                {candidates.map((c) => (
                  <CandidateCard key={c.id} candidate={c} />
                ))}
              </div>
            </Panel>
          )}

          {order && (
            <Panel title="Order & pricing">
              <PriceBreakdown order={order} />
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <PackageCheck className="size-3.5" />
                Receipt status: {RECEIPT_LABEL[order.receipt_status]}
              </div>
              {order.received_image_urls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {order.received_image_urls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt="Received item"
                      className="size-20 rounded-lg border border-border object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </Panel>
          )}

          {shipment && (
            <Panel title="Shipment">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-600/15 dark:bg-teal-400/10 dark:text-teal-300">
                  <Truck className="size-[18px]" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {shipment.carrier ?? "Carrier"} ·{" "}
                    <span className="tnum">
                      {shipment.tracking_number ?? "—"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Shipped {formatDate(shipment.shipped_at)} — escrow released on
                    dispatch.
                  </div>
                </div>
              </div>
            </Panel>
          )}

          <Panel title="Messages">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No messages yet. Updates from your finder will appear here.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={
                      m.sender === "customer" ? "flex justify-end" : "flex"
                    }
                  >
                    <div
                      className={
                        m.sender === "customer"
                          ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                          : "max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-foreground"
                      }
                    >
                      <div className="mb-0.5 text-[0.65rem] uppercase tracking-wide opacity-60">
                        {m.sender === "customer" ? "You" : "Finders × Keepers"}
                      </div>
                      {m.body}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Side column */}
        <aside className="flex flex-col gap-6">
          <Panel title="Lifecycle">
            <LifecycleRail status={request.status} />
          </Panel>

          <Panel title="Escrow">
            <div className="flex items-center gap-2">
              <EscrowBadge state={escrowState} />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              {escrowMeta.blurb}
            </p>
            {latestPayment && (
              <dl className="mt-3 space-y-1.5 border-t border-border/70 pt-3 text-xs">
                <Row label="Amount">
                  <span className="tnum">{formatJpy(latestPayment.amount_jpy)}</span>
                </Row>
                <Row label="Processor">
                  <span className="tnum text-muted-foreground">
                    {latestPayment.stripe_payment_intent_id ?? "—"}
                  </span>
                </Row>
              </dl>
            )}
          </Panel>

          <Panel title="Specification">
            <dl className="space-y-2.5 text-sm">
              <Row label="Min condition">
                {CONDITION_LABEL[request.min_condition]}
              </Row>
              <Row label="Budget cap">
                <span className="tnum">{formatJpy(request.budget_cap_jpy)}</span>
              </Row>
              <Row label="Rush tier">{RUSH_LABEL[request.rush_tier]}</Row>
              <Row label="Deadline">{formatDate(request.deadline_at)}</Row>
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------- subparts -------------------------------- */

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 lift">
      <div className="mb-3.5">
        <h2 className="font-sans text-base font-medium tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{children}</dd>
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
