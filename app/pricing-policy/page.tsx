import { PolicyPage } from "@/app/legal-content/components/PolicyPage";
import { POLICY_PAGES } from "@/app/legal-content/data/policyPages";

export const metadata = {
  title: "Pricing Policy | PrimeStyleAI",
  description: POLICY_PAGES.pricingPolicy.description,
};

export default function PricingPolicyPage() {
  return <PolicyPage page={POLICY_PAGES.pricingPolicy} />;
}
