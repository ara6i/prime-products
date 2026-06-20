import { PolicyPage } from "@/app/legal-content/components/PolicyPage";
import { POLICY_PAGES } from "@/app/legal-content/data/policyPages";

export const metadata = {
  title: "Privacy Policy | PrimeStyleAI",
  description: POLICY_PAGES.privacyPolicy.description,
};

export default function LegalPrivacyPolicyPage() {
  return <PolicyPage page={POLICY_PAGES.privacyPolicy} />;
}
