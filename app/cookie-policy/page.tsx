import { PolicyPage } from "@/app/legal-content/components/PolicyPage";
import { POLICY_PAGES } from "@/app/legal-content/data/policyPages";

export const metadata = {
  title: "Cookie Policy | PrimeStyleAI",
  description: POLICY_PAGES.cookiePolicy.description,
};

export default function CookiePolicyPage() {
  return <PolicyPage page={POLICY_PAGES.cookiePolicy} />;
}
