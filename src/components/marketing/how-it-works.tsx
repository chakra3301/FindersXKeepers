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
    <section className="mx-auto w-full max-w-[1400px] px-6 py-20 lg:px-10">
      <div className="mb-10 max-w-xl">
        <p className="section-label">How it works</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Three steps from wish list to your door
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="lift-hover surface p-8">
            <div className="font-mono text-xs font-medium text-primary">{s.n}</div>
            <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
