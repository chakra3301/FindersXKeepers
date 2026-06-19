import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck, PackageSearch, ReceiptText } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";
import { LoginOrbit } from "@/components/auth/login-orbit";

export const metadata = {
  title: "Sign in — Finders Keepers",
};

const POINTS = [
  {
    icon: PackageSearch,
    title: "Post what you want",
    body: "Anything from Japan. Set a budget and the minimum condition you'll accept.",
  },
  {
    icon: ShieldCheck,
    title: "Funds held in escrow",
    body: "Your money sits with the processor — released only once your item is in transit.",
  },
  {
    icon: ReceiptText,
    title: "Every yen itemised",
    body: "Item cost, finder's fee, shipping and tax — always four separate lines.",
  },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-[100svh] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-card px-12 py-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,oklch(0.52_0.2_25_/_0.18),transparent_55%)]"
        />
        <LoginOrbit />
        <Link href="/" className="relative">
          <Logo />
        </Link>

        <div className="relative max-w-md">
          <p className="section-label">Concierge desk</p>
          <div className="accent-line my-6" aria-hidden />
          <h1 className="font-display text-balance text-4xl font-semibold leading-[1.06] tracking-tight">
            A concierge desk for everything you want from Japan.
          </h1>
          <p className="mt-5 text-pretty text-sm leading-relaxed text-muted-foreground">
            Tell us what to find. We source it, send proof, and ship on your
            approval — and we&rsquo;re paid only once it&rsquo;s on its way to you.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3.5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-primary">
                  <p.icon className="size-[18px]" />
                </span>
                <div>
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Agency sourcing · not resale · 特定商取引法に基づく表記
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rise">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Sign in or create an account
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your email — we&rsquo;ll send a one-time code. New here? We&rsquo;ll
              set you up in the same step.
            </p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
