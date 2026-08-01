"use client";

import Link from "next/link";
import { useInfluencerLandingPage } from "../hooks/useInfluencerLandingPage";
import { InfluencerCreatorTools } from "./InfluencerCreatorTools";
import { InfluencerEarningJourney } from "./InfluencerEarningJourney";
import { InfluencerHeader } from "./InfluencerHeader";
import { InfluencerHero } from "./InfluencerHero";
import { InfluencerInterestDialog } from "./InfluencerInterestDialog";
import styles from "./influencerLanding.module.css";

export function InfluencerLandingExperience() {
  const { viewModel, navigation, interest } = useInfluencerLandingPage();
  return (
    <div className={styles.page} data-audience="influencer">
      <InfluencerHeader mobileMenuOpen={navigation.mobileMenuOpen} onMenuToggle={navigation.toggleMobileMenu} onMenuClose={navigation.closeMobileMenu} onPrimaryAction={interest.open} onSectionSelect={navigation.scrollToSection} />
      <main>
        <InfluencerHero viewModel={viewModel} onPrimaryAction={interest.open} onSecondaryAction={() => navigation.scrollToSection("creator-journey")} />
        <InfluencerCreatorTools viewModel={viewModel} />
        <InfluencerEarningJourney viewModel={viewModel} onPrimaryAction={interest.open} />
        <section className={styles.finalCta}><span>Creator access</span><h2>Your audience already trusts your taste.<em>Make the journey shoppable.</em></h2><button type="button" onClick={interest.open}>Start earning</button></section>
      </main>
      <footer className={styles.footer}><span>© {new Date().getFullYear()} PrimeStyleAI</span><nav><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/help-center">Creator help</Link><Link href="/merchants">For merchants</Link></nav></footer>
      <InfluencerInterestDialog viewModel={viewModel} isOpen={interest.isOpen} message={interest.message} submissionState={interest.submissionState} onClose={interest.close} onSubmit={interest.submit} />
    </div>
  );
}
