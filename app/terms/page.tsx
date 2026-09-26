import type { Metadata } from "next";
import { LegalEditorialPage } from "@/app/legal-content/components/LegalEditorialPage";
import { networkTermsPolicy } from "@/app/legal-content/data/networkPolicyPages";

const CREATOR_NETWORK_ICON =
  "/media/partner-landing/optimized/primestyleai-mark-256.png";

export const metadata: Metadata = {
  title: "Terms & Participation Policy | PrimeStyleAI",
  description: networkTermsPolicy.description,
  icons: {
    icon: [{ url: CREATOR_NETWORK_ICON, type: "image/png" }],
    shortcut: [CREATOR_NETWORK_ICON],
    apple: [{ url: CREATOR_NETWORK_ICON, type: "image/png" }],
  },
};

export default function TermsPage() {
  return <LegalEditorialPage page={networkTermsPolicy} />;
}
