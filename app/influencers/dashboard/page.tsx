import type { Metadata } from "next";
import { InfluencerDashboardExperience } from "../../partner-landing/influencer-dashboard/components/InfluencerDashboardExperience";

export const metadata: Metadata = {
  title: "Creator Dashboard | PrimeStyleAI",
  description:
    "A complete UI preview of the PrimeStyleAI creator workspace for campaigns, approved products, tracked links, earnings, transactions, payouts, compliance, and support.",
};

export default function InfluencerDashboardPage() {
  return <InfluencerDashboardExperience />;
}
