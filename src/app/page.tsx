import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { EscrowBand } from "@/components/marketing/escrow-band";
import { RecentFinds } from "@/components/marketing/recent-finds";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "Finders Keepers — sourced from Japan, held in escrow",
};

// Public landing. Lives outside the (app) group, so it renders the root layout
// (+ global Footer with the 特商法 link) and NO sidebar/topbar. Both anonymous
// and signed-in visitors see this — the sidebar's "View public site" link works.
export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <EscrowBand />
      <RecentFinds />
      <FinalCta />
    </>
  );
}
