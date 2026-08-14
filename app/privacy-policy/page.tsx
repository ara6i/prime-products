import { LegalEditorialPage } from "@/app/legal-content/components/LegalEditorialPage";
import { POLICY_PAGES } from "@/app/legal-content/data/policyPages";

export const metadata = {
  title: "Privacy Policy | PrimeStyleAI",
  description: POLICY_PAGES.privacyPolicy.description,
};

export default function PrivacyPolicyPage() {
  return <LegalEditorialPage page={POLICY_PAGES.privacyPolicy} />;
}
