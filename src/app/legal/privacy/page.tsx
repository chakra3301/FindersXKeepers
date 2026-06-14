import Link from "next/link";
import {
  LegalDocShell,
  LegalNotice,
  LegalSection,
} from "@/components/legal/legal-doc-shell";

export const metadata = {
  title: "Privacy Policy — Finders Keepers",
  description:
    "How Finders Keepers collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalDocShell
      eyebrow="Legal"
      title="Privacy Policy"
      intro={
        <>
          This policy describes what we collect when you use Finders Keepers, how
          we use it, and the choices you have. We built the product for buyers
          outside Japan; your data may be processed in Japan and by our
          infrastructure providers.
        </>
      }
    >
      <LegalSection title="1. Who we are">
        <p>
          Finders Keepers operates a concierge sourcing platform. The data
          controller for your account is the registered entity named in our{" "}
          <Link
            href="/legal/tokushoho"
            className="text-primary underline-offset-4 hover:underline"
          >
            特定商取引法に基づく表記
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-foreground">Account:</span> email
            address and profile settings (shipping country, display currency).
          </li>
          <li>
            <span className="font-medium text-foreground">Requests:</span> item
            descriptions, budget caps, condition requirements, reference links,
            and images you upload.
          </li>
          <li>
            <span className="font-medium text-foreground">Transactions:</span>{" "}
            order amounts, escrow status, and payment identifiers from our
            processor (we do not store full card numbers).
          </li>
          <li>
            <span className="font-medium text-foreground">Messages:</span> text
            you exchange with our team about a request.
          </li>
          <li>
            <span className="font-medium text-foreground">Technical:</span>{" "}
            standard server and session logs needed to operate and secure the
            service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use your data">
        <p>We use your information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide sourcing, escrow, and shipping coordination;</li>
          <li>Communicate status updates and respond to messages;</li>
          <li>Screen requests against our prohibited-items policy;</li>
          <li>Comply with law, prevent fraud, and enforce our terms.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="4. Processors &amp; storage">
        <p>
          We use third-party infrastructure, including Supabase (database, auth,
          and file storage for proof images) and a payment processor for escrow
          holds and settlement. Those providers process data on our instructions
          under their own terms and security programs.
        </p>
        <p>
          Proof images and reference photos are stored in private storage;
          access is limited to you (for your requests) and our team for
          fulfillment.
        </p>
      </LegalSection>

      <LegalSection title="5. Retention">
        <p>
          We keep account and transaction records as long as needed to provide
          the service, resolve disputes, and meet legal obligations. You may
          request deletion of your account subject to records we must retain for
          compliance.
        </p>
      </LegalSection>

      <LegalSection title="6. Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or export your data, or to object to certain processing.
          Contact us to exercise these rights; we will respond within applicable
          deadlines.
        </p>
      </LegalSection>

      <LegalSection title="7. International transfers">
        <p>
          If you access the service from outside Japan, your data may be
          transferred to and processed in Japan and in regions where our
          providers operate. We take steps appropriate to the sensitivity of the
          data and applicable law.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact &amp; updates">
        <p>
          Privacy questions:{" "}
          <a
            href="mailto:privacy@finderskeepers.example"
            className="text-primary underline-offset-4 hover:underline"
          >
            privacy@finderskeepers.example
          </a>
          .
        </p>
        <p>
          We may update this policy; the current version is always on this page.
        </p>
      </LegalSection>

      <LegalNotice>
        Last updated June 2026. This is a product-build policy; registration
        details and jurisdiction-specific addenda are finalised before
        commercial launch.
      </LegalNotice>
    </LegalDocShell>
  );
}
