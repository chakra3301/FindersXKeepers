import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function LegalDocShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>

      <header className="mb-10 border-b border-border pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground">
          {intro}
        </p>
      </header>

      {children}
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border py-6 last:border-b-0">
      <h2 className="text-base font-[600] tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

export function LegalNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
