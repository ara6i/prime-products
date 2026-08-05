"use client";

import { useInfluencerLandingPage } from "../hooks/useInfluencerLandingPage";
import { InfluencerCreatorCollective } from "./InfluencerCreatorCollective";
import { InfluencerEarningJourney } from "./InfluencerEarningJourney";
import { InfluencerFooter } from "./InfluencerFooter";
import { InfluencerHeader } from "./InfluencerHeader";
import { InfluencerHero } from "./InfluencerHero";
import { InfluencerInterestDialog } from "./InfluencerInterestDialog";
import { InfluencerLookBuilder } from "./InfluencerLookBuilder";
import { InfluencerOutfitStudio } from "./InfluencerOutfitStudio";
import { InfluencerReferenceRemix } from "./InfluencerReferenceRemix";
import styles from "./influencerLanding.module.css";

export function InfluencerLandingExperience() {
  const { viewModel, navigation, interest } = useInfluencerLandingPage();
  return (
    <div className={styles.page} data-audience="influencer">
      <InfluencerHeader mobileMenuOpen={navigation.mobileMenuOpen} onMenuToggle={navigation.toggleMobileMenu} onMenuClose={navigation.closeMobileMenu} onPrimaryAction={interest.open} onSectionSelect={navigation.scrollToSection} />
      <main>
        <InfluencerHero viewModel={viewModel} onPrimaryAction={interest.open} onSecondaryAction={() => navigation.scrollToSection("creator-journey")} />
        <InfluencerOutfitStudio />
        <section className={styles.creatorStudioSuite} aria-label="Create and remix your look">
          <div className={styles.creatorStudioScreen}>
            <InfluencerLookBuilder />
            <InfluencerReferenceRemix />
          </div>
        </section>
        <InfluencerCreatorCollective />
        <InfluencerEarningJourney viewModel={viewModel} onPrimaryAction={interest.open} />
        <section className={styles.finalCta}><span>Creator waitlist</span><h2>Your audience already trusts your taste.<em>Make the journey shoppable.</em></h2><button type="button" onClick={interest.open}>Join waitlist</button></section>
      </main>
      <InfluencerFooter />
      <InfluencerInterestDialog viewModel={viewModel} isOpen={interest.isOpen} message={interest.message} submissionState={interest.submissionState} onClose={interest.close} onSubmit={interest.submit} />
    </div>
  );
}
