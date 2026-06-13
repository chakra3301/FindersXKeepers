import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRequestDetail } from "@/lib/requests/queries";
import { getProfile } from "@/lib/auth";
import { escrowStateFromPayments } from "@/lib/escrow/display";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Checkout — Finders Keepers" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, profile] = await Promise.all([
    getRequestDetail(id),
    getProfile(),
  ]);
  if (!detail) notFound();
  const { request, payments } = detail;

  // Only an open, unfunded request can be deposited against.
  if (request.status !== "open" || escrowStateFromPayments(payments) !== "none") {
    redirect(`/requests/${id}`);
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 pt-8 pb-24">
      <Link
        href={`/requests/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft size={15} /> Back to request
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Deposit into escrow
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{request.title}</p>
      <div className="mt-7">
        <CheckoutForm
          requestId={id}
          budgetCapJpy={request.budget_cap_jpy}
          initialRush={request.rush_tier}
          currencyPref={profile?.currency_pref ?? "JPY"}
        />
      </div>
    </div>
  );
}
