import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RequestForm } from "@/components/requests/request-form";

export const metadata = { title: "New request — Finders × Keepers" };

export default function NewRequestPage() {
  return (
    <div className="mx-auto w-full max-w-2xl rise">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <header className="mt-5">
        <h1 className="font-sans text-2xl font-medium tracking-tight sm:text-3xl">
          Post a request
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tell us what to find in Japan. We&rsquo;ll source it, send proof, and
          ship on your approval — funds stay in escrow until it&rsquo;s in
          transit.
        </p>
      </header>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 lift">
        <RequestForm />
      </div>
    </div>
  );
}
