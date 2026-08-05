"use client";

import Link from "next/link";
import { useMerchantLandingPage } from "../hooks/useMerchantLandingPage";
import { MerchantHeader } from "./MerchantHeader";
import { MerchantInterestDialog } from "./MerchantInterestDialog";
import { MerchantNetworkJourney } from "./MerchantNetworkJourney";
import styles from "./merchantLanding.module.css";

export function MerchantLandingExperience() {
  const { viewModel, navigation, interest } = useMerchantLandingPage();
  return (
    <div className={styles.page} data-audience="merchant">
      <MerchantHeader mobileMenuOpen={navigation.mobileMenuOpen} onMenuToggle={navigation.toggleMobileMenu} onMenuClose={navigation.closeMobileMenu} onPrimaryAction={interest.open} onSectionSelect={navigation.scrollToSection} />
      <main>
        <MerchantNetworkJourney onPrimaryAction={interest.open} />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerBrand}><span>PrimeStyleAI</span><small>Products meet the creators who move them.</small></div>
        <nav aria-label="Footer navigation"><button type="button" onClick={() => navigation.scrollToSection("influencer-network")}>Creators</button><button type="button" onClick={() => navigation.scrollToSection("merchant-dashboard")}>Dashboard</button><button type="button" onClick={() => navigation.scrollToSection("pdp-studio-feature")}>PDP Studio</button><button type="button" onClick={() => navigation.scrollToSection("outfit-builder")}>Try-on</button><Link href="/influencers">For influencers</Link></nav>
        <nav aria-label="Legal navigation"><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/help-center">Help</Link><span>© {new Date().getFullYear()}</span></nav>
      </footer>
      <MerchantInterestDialog viewModel={viewModel} isOpen={interest.isOpen} message={interest.message} submissionState={interest.submissionState} onClose={interest.close} onSubmit={interest.submit} />
    </div>
  );
}
