import { PolicyPage } from "@/app/legal-content/components/PolicyPage";
import { POLICY_PAGES } from "@/app/legal-content/data/policyPages";

export const metadata = {
  title: "Terms of Service | PrimeStyleAI",
  description: POLICY_PAGES.termsOfService.description,
};

export default function TermsPage() {
  return <PolicyPage page={POLICY_PAGES.termsOfService} />;
}
