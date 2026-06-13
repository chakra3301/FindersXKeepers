import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRequestDetail } from "@/lib/requests/queries";
import { PriceBreakdown } from "@/components/requests/price-breakdown";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";
import { ReceivedForm } from "./received-form";

export const metadata = { title: "Final check — Finders Keepers" };

export default async function ReceivedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getRequestDetail(id);
  if (!detail) notFound();

  const { request, orders } = detail;
  if (request.status !== "received") redirect(`/requests/${id}`);
  const order = orders[0] ?? null;

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
          In hand — final check
        </span>
      </div>
      <h1 className="mt-2 text-[26px] font-[600] tracking-tight">
        It arrived. Approve before we ship.
      </h1>
      <p className="mt-1.5 max-w-[46em] text-[14.5px] leading-relaxed text-muted-foreground">
        Here are real photos of{" "}
        <span className="text-foreground">{request.title}</span> in our hands.
        Compare them to the condition you asked for, then give the final
        go-ahead.
      </p>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* In-hand photos */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)]">
          <div className="grid grid-cols-2 gap-2.5">
            <PlaceholderThumb
              label="in-hand · front"
              className="aspect-[3/4]"
            />
            <PlaceholderThumb label="in-hand · back" className="aspect-[3/4]" />
          </div>
        </section>

        {/* Condition check + final approval */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)]">
            <h3 className="mb-3.5 text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
              Condition check
            </h3>
            <ReceivedForm requestId={id} />
          </section>
          {order ? <PriceBreakdown order={order} /> : null}
        </aside>
      </div>
    </div>
  );
}
