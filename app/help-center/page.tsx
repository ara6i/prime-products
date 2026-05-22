import { PolicyPage } from "@/app/legal-content/components/PolicyPage";
import { POLICY_PAGES } from "@/app/legal-content/data/policyPages";

export const metadata = {
  title: "Help Center & FAQ | PrimeStyleAI",
  description: POLICY_PAGES.helpCenter.description,
};

export default function HelpCenterPage() {
  return <PolicyPage page={POLICY_PAGES.helpCenter} />;
}
