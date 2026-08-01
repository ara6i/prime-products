"use client";

import Link from "next/link";
import { useMerchantLandingPage } from "../hooks/useMerchantLandingPage";
import { MerchantCapabilities } from "./MerchantCapabilities";
import { MerchantConnectedSystem } from "./MerchantConnectedSystem";
import { MerchantHeader } from "./MerchantHeader";
import { MerchantHero } from "./MerchantHero";
import { MerchantInterestDialog } from "./MerchantInterestDialog";
import { MerchantPrograms } from "./MerchantPrograms";
import styles from "./merchantLanding.module.css";

export function MerchantLandingExperience() {
  const { viewModel, navigation, interest } = useMerchantLandingPage();
  return (
    <div className={styles.page} data-audience="merchant">
      <MerchantHeader mobileMenuOpen={navigation.mobileMenuOpen} onMenuToggle={navigation.toggleMobileMenu} onMenuClose={navigation.closeMobileMenu} onPrimaryAction={interest.open} onSectionSelect={navigation.scrollToSection} />
      <main>
        <MerchantHero viewModel={viewModel} onPrimaryAction={interest.open} onSecondaryAction={() => navigation.scrollToSection("connected-system")} />
        <MerchantConnectedSystem viewModel={viewModel} />
        <MerchantCapabilities viewModel={viewModel} />
        <MerchantPrograms viewModel={viewModel} onPrimaryAction={interest.open} />
        <section className={styles.finalCta}><span>Direct Connected Merchant Program</span><h2>Build a clearer product decision.<em>Keep control of the commerce.</em></h2><button type="button" onClick={interest.open}>Become connected</button></section>
      </main>
      <footer className={styles.footer}><span>© {new Date().getFullYear()} PrimeStyleAI</span><nav><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/help-center">Merchant help</Link><Link href="/influencers">For influencers</Link></nav></footer>
      <MerchantInterestDialog viewModel={viewModel} isOpen={interest.isOpen} message={interest.message} submissionState={interest.submissionState} onClose={interest.close} onSubmit={interest.submit} />
    </div>
  );
}
