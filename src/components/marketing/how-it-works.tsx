import { SectionTag, GlitchRule } from "@/components/marketing/decor";
import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  {
    n: "01",
    title: "Post a request",
    body: "Describe what you want, drop a reference photo or link, then set the minimum condition you'll accept and your budget cap.",
  },
  {
    n: "02",
    title: "We source it & send proof",
    body: "Our team hunts Japanese auctions, Mercari, secondhand shops and stores, then sends you real candidates from Japan for your approval.",
  },
  {
    n: "03",
    title: "Ship on approval",
    body: "Approve the real photos and we ship worldwide. Escrow releases to us only once your item is in transit to you.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 py-24 lg:px-10">
      <Reveal className="mb-12 max-w-xl">
        <SectionTag index="01">How it works</SectionTag>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-[2.5rem]">
          Three steps from wish list to your door
        </h2>
      </Reveal>

      <GlitchRule className="mb-12" />

      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal
            key={s.n}
            delay={i * 90}
            className="group relative bg-card p-8 transition-colors duration-300 hover:bg-secondary/60"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs font-medium tracking-[0.2em] text-primary">
                {s.n}
              </span>
              <span className="font-display text-5xl font-semibold leading-none text-foreground/[0.06] transition-colors duration-300 group-hover:text-primary/15">
                {s.n}
              </span>
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
