import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getRequestDetail } from "@/lib/requests/queries";
import { formatJpy } from "@/lib/pricing";
import { resolveImageRefs } from "@/lib/storage";
import { ProofGallery, ProofImage } from "@/components/requests/proof-image";
import { CandidateActions } from "./candidate-actions";

export const metadata = { title: "Review candidate — Finders Keepers" };

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getRequestDetail(id);
  if (!detail) notFound();

  const { request, candidates } = detail;
  if (request.status !== "candidate_sent") redirect(`/requests/${id}`);

  // The candidate awaiting a decision (queries order newest-first).
  const candidate = candidates.find((c) => c.status === "proposed") ?? candidates[0];
  if (!candidate) redirect(`/requests/${id}`);

  const cap = request.budget_cap_jpy ?? 0;
  const price = candidate.price_jpy ?? 0;
  const overCap = cap > 0 && price > cap;
  const pct = cap > 0 ? Math.min(100, Math.round((price / cap) * 100)) : 0;
  const listingUrls = await resolveImageRefs(candidate.listing_images ?? []);
  const heroUrl = listingUrls[0];
  const thumbUrls = listingUrls.slice(1);

  return (
    <div className="mx-auto w-full max-w-[980px] px-6 pt-8 pb-24 sm:px-10">
      <Link
        href={`/requests/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft size={15} />
        Back to hunt
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-warning-muted px-2.5 py-1 text-[12px] font-[540] text-warning">
          <span className="pulse-dot size-1.5 rounded-full bg-warning" />
          Candidate found
        </span>
      </div>
      <h1 className="mt-2 text-[26px] font-[600] tracking-tight">
        Review this find
      </h1>
      <p className="mt-1.5 max-w-[46em] text-[14.5px] leading-relaxed text-muted-foreground">
        Your hunter found a match for{" "}
        <span className="text-foreground">{request.title}</span>. Check the
        photos and price against what you asked for — nothing is purchased until
        you approve.
      </p>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Photos + listing detail */}
        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)]">
          <ProofImage
            src={heroUrl}
            label="listing photo · front"
            className="aspect-[4/3] w-full"
          />
          <ProofGallery
            urls={thumbUrls}
            className="grid-cols-3"
            itemClassName="aspect-square w-full"
            minSlots={heroUrl ? Math.max(0, 3 - thumbUrls.length) : 3}
            labels={["back", "detail", "corner"]}
          />

          {candidate.notes ? (
            <p className="rounded-[10px] border border-border bg-muted/40 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
              Hunter&apos;s note: {candidate.notes}
            </p>
          ) : null}

          {candidate.listing_url ? (
            <a
              href={candidate.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13.5px] text-primary underline-offset-4 hover:underline"
            >
              View source listing
              <ExternalLink size={14} />
            </a>
          ) : null}
        </section>

        {/* Decision rail */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)]">
            <h2 className="mb-4 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
              Checked against your cap
            </h2>

            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11.5px] text-muted-foreground">
                  Listing price
                </div>
                <div className="tnum text-2xl font-[600]">
                  {formatJpy(price)}
                </div>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-[12px] font-[560] ${
                  overCap
                    ? "bg-warning-muted text-warning"
                    : "bg-success-muted text-success"
                }`}
              >
                {overCap ? "Over cap" : "Within cap"}
              </span>
            </div>

            <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${overCap ? "bg-warning" : "bg-success"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11.5px] text-muted-foreground">
              <span>Your cap {formatJpy(cap)}</span>
              <span className="tnum">{pct}% of cap</span>
            </div>

            <div className="mt-5">
              <CandidateActions
                requestId={id}
                candidateId={candidate.id}
                overCap={overCap}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
