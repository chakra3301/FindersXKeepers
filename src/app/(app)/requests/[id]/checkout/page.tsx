import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRequestDetail } from "@/lib/requests/queries";
import { getProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listAddresses } from "@/lib/addresses/queries";
import { escrowStateFromPayments } from "@/lib/escrow/display";
import { escrow } from "@/lib/escrow";
import { estimator } from "@/lib/estimator";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Checkout — Finders Keepers" };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id } = await params;
  const { checkout: checkoutParam } = await searchParams;
  const [detail, profile] = await Promise.all([
    getRequestDetail(id),
    getProfile(),
  ]);
  if (!detail) notFound();
  const { request, payments } = detail;
  const escrowState = escrowStateFromPayments(payments);

  const user = await requireUser();
  const supabase = await createClient();
  const addresses = await listAddresses(user.id, supabase);
  const defaultAddressId = addresses.find((a) => a.is_default)?.id ?? null;

  // Open + unfunded, or open + payment still authorising (Stripe back-button).
  if (
    request.status !== "open" ||
    (escrowState !== "none" && escrowState !== "pending")
  ) {
    redirect(`/requests/${id}`);
  }

  // Estimate shipping once, server-side, and hand it to the form so the
  // displayed quote and the escrow hold are built from the same input. The same
  // estimator (memoized for the model provider) answers depositForRequest.
  const { shippingJpy: shippingEstimateJpy } = await estimator.estimateShipping({
    title: request.title,
    description: request.description,
    minCondition: request.min_condition,
    destinationCountry:
      request.shipping_address?.country ??
      addresses.find((a) => a.is_default)?.country,
  });

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 pt-8 pb-24">
      <Link
        href={`/requests/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft size={15} /> Back to request
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {request.in_stock ? "Purchase" : "Deposit into escrow"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{request.title}</p>
      <div className="mt-7">
        <CheckoutForm
          requestId={id}
          inStock={request.in_stock}
          budgetCapJpy={request.budget_cap_jpy}
          initialRush={request.rush_tier}
          currencyPref={profile?.currency_pref ?? "JPY"}
          shippingEstimateJpy={shippingEstimateJpy}
          chargesNow={escrow.name === "stripe"}
          resuming={escrowState === "pending"}
          cancelled={checkoutParam === "cancelled"}
          addresses={addresses}
          defaultAddressId={defaultAddressId}
        />
      </div>
    </div>
  );
}
