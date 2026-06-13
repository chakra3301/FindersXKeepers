import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";

// Illustrative showcase only — a curated static array, NOT a DB query. Real
// "recent finds" would come from released requests once we have volume.
const RECENT_FINDS = [
  { title: "Seiko 'Pepsi' SKX009K diver, boxed", note: "Sourced from Osaka" },
  { title: "Comme des Garçons AW'90s wool tailoring", note: "Tokyo archive" },
  { title: "Onitsuka Tiger Mexico 66, deadstock", note: "New, original box" },
];

export function RecentFinds() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <div className="mb-7 flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Recent finds</h2>
        <span className="text-sm text-muted-foreground">
          Average hunt closed in <strong className="font-medium text-foreground">9 days</strong>
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {RECENT_FINDS.map((f) => (
          <article
            key={f.title}
            className="lift-hover overflow-hidden rounded-2xl border border-border bg-card"
          >
            <PlaceholderThumb label="sourced" className="h-36 rounded-none border-0" />
            <div className="p-5">
              <h3 className="text-pretty text-sm font-medium leading-snug tracking-tight">
                {f.title}
              </h3>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 13l4 4 10-11"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {f.note}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
