import type { Metadata } from "next";
import { LegalEditorialPage } from "@/app/legal-content/components/LegalEditorialPage";
import { networkPrivacyPolicy } from "@/app/legal-content/data/networkPolicyPages";

const CREATOR_NETWORK_ICON =
  "/media/partner-landing/optimized/primestyleai-mark-256.png";

export const metadata: Metadata = {
  title: "Privacy & Photo Data Policy | PrimeStyleAI",
  description: networkPrivacyPolicy.description,
  icons: {
    icon: [{ url: CREATOR_NETWORK_ICON, type: "image/png" }],
    shortcut: [CREATOR_NETWORK_ICON],
    apple: [{ url: CREATOR_NETWORK_ICON, type: "image/png" }],
  },
};

export default function PrivacyPolicyPage() {
  return <LegalEditorialPage page={networkPrivacyPolicy} />;
}
