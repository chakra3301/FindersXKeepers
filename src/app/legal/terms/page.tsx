import Link from "next/link";
import {
  LegalDocShell,
  LegalNotice,
  LegalSection,
} from "@/components/legal/legal-doc-shell";

export const metadata = {
  title: "Terms of Service — Finders Keepers",
  description:
    "Terms governing use of Finders Keepers concierge sourcing from Japan.",
};

export default function TermsPage() {
  return (
    <LegalDocShell
      eyebrow="Legal"
      title="Terms of Service"
      intro={
        <>
          These terms govern your use of Finders Keepers — a concierge sourcing
          service for buyers outside Japan. We act as your{" "}
          <span className="font-medium text-foreground">agent</span>, not a
          reseller: item cost is pass-through and our fee is disclosed
          separately on every order.
        </>
      }
    >
      <LegalSection title="1. The service">
        <p>
          You post what you want from Japan, set a budget cap and minimum
          condition, and fund an escrow hold. We source candidates, send proof,
          purchase on your approval, and ship after your final sign-off. You do
          not search marketplaces yourself — that is the core of the service.
        </p>
      </LegalSection>

      <LegalSection title="2. Pricing">
        <p>
          Every quote and order shows four separate lines: item cost, finder&apos;s
          fee, shipping, and tax. We never collapse these into one opaque total.
          The finder&apos;s fee is our disclosed service charge; item cost is
          pass-through to the seller.
        </p>
        <p>
          Your escrow hold is sized to your budget cap at checkout. If the
          approved item costs less, unused funds are returned when your order
          ships.
        </p>
      </LegalSection>

      <LegalSection title="3. Escrow &amp; payments">
        <p>
          We do not hold your money in our own balance. Payments are processed
          and held in escrow by our payment processor until release is triggered
          — when your item ships with a tracking number. Release is automatic on
          that trigger; there is no manual &ldquo;release funds&rdquo; control for
          either party.
        </p>
      </LegalSection>

      <LegalSection title="4. Approvals &amp; lifecycle">
        <p>
          You approve a sourced candidate before we purchase. You approve again
          against in-hand proof photos before we ship internationally. If you
          reject a candidate, we keep hunting within your original hold where
          possible.
        </p>
        <p>
          You may cancel before purchase for a full refund of escrowed funds.
          After purchase, cancellation and returns follow the supplier&apos;s policy
          and the condition you accepted.
        </p>
      </LegalSection>

      <LegalSection title="5. Prohibited requests">
        <p>
          We screen requests against a prohibited-items policy at submission.
          Requests that match restricted categories are blocked before any money
          moves. Do not attempt to circumvent this screening.
        </p>
      </LegalSection>

      <LegalSection title="6. Your responsibilities">
        <p>
          Provide accurate descriptions, budget caps, and shipping details.
          Respond to candidate and in-hand approvals in a reasonable time.
          Customs, import duties, and local compliance in your country remain
          your responsibility unless we explicitly quote them as included.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation of liability">
        <p>
          We source to your stated condition and disclose proof before purchase.
          We are not liable for indirect or consequential loss. Our aggregate
          liability relating to a request is limited to the fees you paid us for
          that request, except where applicable law requires otherwise.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes &amp; contact">
        <p>
          We may update these terms; material changes will be posted on this
          page. Continued use after changes constitutes acceptance.
        </p>
        <p>
          Questions:{" "}
          <a
            href="mailto:support@finderskeepers.example"
            className="text-primary underline-offset-4 hover:underline"
          >
            support@finderskeepers.example
          </a>
          . For statutory seller disclosures in Japan, see our{" "}
          <Link
            href="/legal/tokushoho"
            className="text-primary underline-offset-4 hover:underline"
          >
            特定商取引法に基づく表記
          </Link>
          .
        </p>
      </LegalSection>

      <LegalNotice>
        Last updated June 2026. Registered entity details appear in the
        特商法 disclosure and are completed before commercial launch.
      </LegalNotice>
    </LegalDocShell>
  );
}
