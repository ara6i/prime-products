"use client";

import Link from "next/link";
import styles from "./merchantLanding.module.css";

const merchantSections = [
  { id: "influencer-network", label: "Creators" },
  { id: "merchant-dashboard", label: "Dashboard" },
  { id: "pdp-studio-feature", label: "PDP Studio" },
  { id: "outfit-builder", label: "Try-on" },
] as const;

type MerchantLandingFooterProps = {
  onSectionSelect?: (sectionId: string) => void;
};

export function MerchantLandingFooter({
  onSectionSelect,
}: MerchantLandingFooterProps) {
  return (
    <footer id="site-footer" className={styles.footer}>
      <div className={styles.footerBrand}>
        <span>PrimeStyleAI</span>
        <small>Products meet the creators who move them.</small>
      </div>
      <nav aria-label="Footer navigation">
        {merchantSections.map((item) =>
          onSectionSelect ? (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionSelect(item.id)}
            >
              {item.label}
            </button>
          ) : (
            <Link key={item.id} href={`/merchants#${item.id}`}>
              {item.label}
            </Link>
          ),
        )}
        <Link href="/influencers">For influencers</Link>
      </nav>
      <nav aria-label="Legal navigation">
        <Link href="/privacy-policy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/help-center">Help</Link>
        <span>© {new Date().getFullYear()}</span>
      </nav>
    </footer>
  );
}
