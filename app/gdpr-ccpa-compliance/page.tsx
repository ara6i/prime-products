import { PolicyPage } from "@/app/legal-content/components/PolicyPage";
import { POLICY_PAGES } from "@/app/legal-content/data/policyPages";

export const metadata = {
  title: "GDPR & CCPA Compliance Notice | PrimeStyleAI",
  description: POLICY_PAGES.gdprCcpa.description,
};

export default function GdprCcpaCompliancePage() {
  return <PolicyPage page={POLICY_PAGES.gdprCcpa} />;
}
