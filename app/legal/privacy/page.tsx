import { LegalEditorialPage } from "@/app/legal-content/components/LegalEditorialPage";
import { networkPrivacyPolicy } from "@/app/legal-content/data/networkPolicyPages";

export const metadata = {
  title: "Privacy & Photo Data Policy | PrimeStyleAI",
  description: networkPrivacyPolicy.description,
};

export default function LegalPrivacyPolicyPage() {
  return <LegalEditorialPage page={networkPrivacyPolicy} />;
}
