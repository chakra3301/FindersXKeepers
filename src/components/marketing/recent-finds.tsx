import { SectionTag } from "@/components/marketing/decor";
import { Reveal } from "@/components/marketing/reveal";
import { FindsCarousel, type Find } from "@/components/marketing/finds-carousel";

const RECENT_FINDS: Find[] = [
  {
    title: "Grand Seiko SBGA211, Heritage Collection",
    note: "Sourced from Osaka",
    days: "07",
    img: "/brand/finds/seiko.jpg",
    alt: "Grand Seiko SBGA211 'Snowflake' Spring Drive watch on snow",
    fit: "cover",
  },
  {
    title: "Kapital boro hooded jacket",
    note: "Tokyo archive",
    days: "12",
    img: "/brand/finds/boro.jpg",
    alt: "Kapital sashiko boro patchwork hooded jacket",
    fit: "cover",
  },
  {
    title: "Onitsuka Tiger Mexico 66 SD",
    note: "New, original box",
    days: "05",
    img: "/brand/finds/onitsuka.jpg",
    alt: "Onitsuka Tiger Mexico 66 SD sneakers in yellow and black",
    fit: "cover",
  },
];

export function RecentFinds() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 py-24 lg:px-10">
      <Reveal className="mb-12 flex items-end justify-between gap-4">
        <div>
          <SectionTag index="03">Proof of hunt</SectionTag>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-[2.5rem]">
            Recent finds
          </h2>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Avg. closed in{" "}
          <strong className="font-semibold text-foreground">9 days</strong>
        </span>
      </Reveal>

      <Reveal>
        <FindsCarousel items={RECENT_FINDS} />
      </Reveal>
    </section>
  );
}
