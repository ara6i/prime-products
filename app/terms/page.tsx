import { LegalEditorialPage } from "@/app/legal-content/components/LegalEditorialPage";
import { POLICY_PAGES } from "@/app/legal-content/data/policyPages";

export const metadata = {
  title: "Terms of Service | PrimeStyleAI",
  description: POLICY_PAGES.termsOfService.description,
};

export default function TermsPage() {
  return <LegalEditorialPage page={POLICY_PAGES.termsOfService} />;
}
