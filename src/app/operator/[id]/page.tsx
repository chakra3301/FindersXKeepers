import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getOperatorRequestDetail } from "@/lib/requests/operator-queries";
import { STATUS_META } from "@/lib/requests/status";
import { formatJpy } from "@/lib/pricing";
import { StatusBadge } from "@/components/requests/status-badge";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";
import { PostCandidateForm } from "@/components/operator/post-candidate-form";
import { MarkPurchasedButton } from "@/components/operator/mark-purchased-button";
import { MarkReceivedForm } from "@/components/operator/mark-received-form";

export default async function OperatorRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getOperatorRequestDetail(id);
  if (!detail) notFound();

  const { request, candidates, orders } = detail;
  const meta = STATUS_META[request.status];
  const latestCandidate = candidates[0] ?? null;
  const latestOrder = orders[0] ?? null;

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
              {latestCandidate.listing_images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={latestCandidate.listing_images[0]}
                  alt=""
                  className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
                />
              ) : (
                <PlaceholderThumb label="listing" className="aspect-[4/3] w-full" />
              )}
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
              {latestOrder.received_image_urls.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {latestOrder.received_image_urls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="aspect-square rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
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
                  photo URLs for the customer&apos;s final ship approval.
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
    </div>
  );
}
