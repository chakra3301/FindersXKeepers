import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCompletedFind, fulfillLabel } from "@/lib/finds/queries";
import { TrophyCard } from "@/components/finds/trophy-card";
import { ShareBar } from "@/components/finds/share-bar";

// Dedupe the DB lookup across generateMetadata + the page render.
const loadFind = cache((id: string) => getCompletedFind(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const find = await loadFind(id);
  if (!find) return { title: "Find not found — Finders Keepers" };

  const headline = `${find.title} — a Finders Keepers find`;
  const description = `Sourced from Japan in ${fulfillLabel(find.fulfillMs)}, held in escrow until it shipped.`;
  return {
    title: headline,
    description,
    openGraph: { title: headline, description, type: "website" },
    twitter: { card: "summary_large_image", title: headline, description },
  };
}

export default async function FindSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const find = await loadFind(id);
  if (!find) notFound();

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_55%_at_50%_0%,#000,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,oklch(0.84_0.16_96_/_0.08),transparent_60%)]"
      />

      <Link href="/" aria-label="Finders Keepers home" className="relative mb-9">
        <Logo />
      </Link>

      <div className="relative flex flex-col items-center gap-9">
        <TrophyCard find={find} />

        <div className="flex flex-col items-center gap-5">
          <p className="text-center text-sm text-muted-foreground">
            Share your find
          </p>
          <ShareBar
            title={find.title}
            downloadUrl={`/finds/${find.id}/opengraph-image`}
          />
          <Link
            href="/requests/new"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "mt-1 text-muted-foreground hover:text-foreground",
            )}
          >
            Start your own hunt →
          </Link>
        </div>
      </div>
    </main>
  );
}
