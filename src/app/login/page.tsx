import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck, PackageSearch, ReceiptText } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";

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
      {/* Editorial brand panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary px-12 py-12 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 15% 0%, oklch(1 0 0 / 0.18) 0%, transparent 60%), radial-gradient(50% 40% at 100% 100%, oklch(0.7 0.13 80 / 0.25) 0%, transparent 55%)",
          }}
        />
        <Link href="/" className="relative">
          <span className="inline-flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[0.5rem] bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
              <span className="font-sans text-[15px] leading-none">探</span>
            </span>
            <span className="font-sans text-[15px] font-medium tracking-tight">
              Finders Keepers
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-balance font-sans text-4xl font-medium leading-[1.1] tracking-tight">
            A concierge desk for everything you want from Japan.
          </h1>
          <p className="mt-5 text-pretty text-sm leading-relaxed text-primary-foreground/75">
            Tell us what to find. We source it, send proof, and ship on your
            approval — and we&rsquo;re paid only once it&rsquo;s on its way to you.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3.5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                  <p.icon className="size-[18px]" />
                </span>
                <div>
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-sm text-primary-foreground/70">
                    {p.body}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/55">
          Agency sourcing · not resale · 特定商取引法に基づく表記
        </p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rise">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-medium tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to post requests and track your escrow.
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
