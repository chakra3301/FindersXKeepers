import { RequestForm } from "@/components/requests/request-form";

export const metadata = { title: "New request — Finders Keepers" };

export default function NewRequestPage() {
  return (
    <div className="mx-auto w-full max-w-[660px] px-10 pt-8 pb-24">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 lift">
        <RequestForm />
      </div>
    </div>
  );
}
