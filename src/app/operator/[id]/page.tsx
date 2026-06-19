import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Sparkles, AlertTriangle } from "lucide-react";
import { getOperatorRequestDetail } from "@/lib/requests/operator-queries";
import { STATUS_META } from "@/lib/requests/status";
import { formatJpy } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { resolveImageRefs } from "@/lib/storage";
import { StatusBadge } from "@/components/requests/status-badge";
import { ProofGallery, ProofImage } from "@/components/requests/proof-image";
import { PostCandidateForm } from "@/components/operator/post-candidate-form";
import { MarkPurchasedButton } from "@/components/operator/mark-purchased-button";
import { MarkReceivedForm } from "@/components/operator/mark-received-form";
import { OperatorMessagePanel } from "@/components/operator/operator-message-panel";

export default async function OperatorRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getOperatorRequestDetail(id);
  if (!detail) notFound();

  const { request, candidates, orders, messages } = detail;
  const meta = STATUS_META[request.status];
  const latestCandidate = candidates[0] ?? null;
  const latestOrder = orders[0] ?? null;
  const listingUrls = latestCandidate
    ? await resolveImageRefs(latestCandidate.listing_images ?? [])
    : [];
  const receivedUrls = latestOrder
    ? await resolveImageRefs(latestOrder.received_image_urls ?? [])
    : [];

  return (
    <div>
      <Link
        href="/operator"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft size={15} />
        Back to queue
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={request.status} />
          </div>
          <h1 className="mt-2 text-2xl font-[600] tracking-tight">
            {request.title}
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{meta.blurb}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Budget cap
          </div>
          <div className="tnum text-lg font-[600]">
            {formatJpy(request.budget_cap_jpy ?? 0)}
          </div>
        </div>
      </div>

      {request.description ? (
        <p className="mt-4 max-w-[48em] text-[14px] leading-relaxed text-muted-foreground">
          {request.description}
        </p>
      ) : null}

      {request.est_value_jpy != null && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
              <Sparkles size={14} className="text-primary" /> AI price estimate
            </h2>
            {request.est_needs_review && (
              <span className="inline-flex items-center gap-1 rounded-md border border-warning-border bg-warning-muted px-2 py-0.5 text-[11px] font-[560] text-warning">
                <AlertTriangle size={12} /> Needs review
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Estimated value
              </div>
              <div className="tnum text-2xl font-[600]">
                {formatJpy(request.est_value_jpy)}
              </div>
              {request.est_value_low_jpy != null &&
                request.est_value_high_jpy != null && (
                  <div className="tnum mt-0.5 text-[12.5px] text-muted-foreground">
                    range {formatJpy(request.est_value_low_jpy)} –{" "}
                    {formatJpy(request.est_value_high_jpy)}
                  </div>
                )}
            </div>

            {request.est_confidence != null && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Confidence
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round(request.est_confidence * 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "tnum text-[12.5px] font-[560]",
                      request.est_confidence >= 0.7
                        ? "text-success"
                        : request.est_confidence < 0.5
                          ? "text-warning"
                          : "text-foreground",
                    )}
                  >
                    {Math.round(request.est_confidence * 100)}%
                  </span>
                </div>
              </div>
            )}

            {request.est_category && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Category
                </div>
                <div className="mt-1 text-[13px] font-[540] capitalize">
                  {request.est_category.replace(/_/g, " ")}
                </div>
              </div>
            )}
          </div>

          {request.est_sources.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Priced from
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {request.est_sources.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11.5px] text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 max-w-[52em] text-[11.5px] leading-relaxed text-muted-foreground">
            Advisory only — a pre-sourcing estimate to guide your hunt. The customer
            is charged the real four-line order total, never this figure.
          </p>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
            Context
          </h2>

          {latestCandidate ? (
            <div className="mt-4 space-y-3">
              <p className="text-[13px] font-medium text-foreground">
                Latest candidate · {formatJpy(latestCandidate.price_jpy ?? 0)}
              </p>
              <ProofImage
                src={listingUrls[0]}
                label="listing"
                className="aspect-[4/3] w-full"
              />
              {latestCandidate.notes ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {latestCandidate.notes}
                </p>
              ) : null}
              {latestCandidate.listing_url ? (
                <a
                  href={latestCandidate.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-primary underline-offset-4 hover:underline"
                >
                  Source listing
                  <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-[13px] text-muted-foreground">
              No candidate posted yet.
            </p>
          )}

          {latestOrder ? (
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-[13px] font-medium text-foreground">
                Order total · {formatJpy(latestOrder.total_jpy)}
              </p>
              {receivedUrls.length > 0 ? (
                <ProofGallery
                  urls={receivedUrls}
                  className="mt-3 grid-cols-2"
                  itemClassName="aspect-square w-full"
                />
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
            Team action
          </h2>

          <div className="mt-4">
            {request.status === "sourcing" && (
              <>
                <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                  Post a candidate with price, listing link, and proof images. The
                  customer will review before anything is purchased.
                </p>
                <PostCandidateForm requestId={id} />
              </>
            )}

            {request.status === "approved" && (
              <>
                <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                  The customer approved this find. Mark it purchased once you&apos;ve
                  bought it — no money moves here; escrow was sized at approval.
                </p>
                <MarkPurchasedButton requestId={id} />
              </>
            )}

            {request.status === "purchased" && (
              <>
                <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                  Confirm the item is in hand at our hub. Optionally attach proof
                  photos for the customer&apos;s final ship approval.
                </p>
                <MarkReceivedForm requestId={id} />
              </>
            )}

            {request.status !== "sourcing" &&
              request.status !== "approved" &&
              request.status !== "purchased" && (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  No team action at this stage — status is{" "}
                  <span className="text-foreground">{meta.label}</span>.
                  {request.status === "candidate_sent" &&
                    " Waiting on the customer to approve or keep hunting."}
                  {request.status === "received" &&
                    " Waiting on the customer to approve final ship."}
                </p>
              )}
          </div>
        </section>
      </div>

      <OperatorMessagePanel requestId={id} messages={messages} />
    </div>
  );
}
