"use client";

import { useMerchantLandingPage } from "../hooks/useMerchantLandingPage";
import { MerchantHeader } from "./MerchantHeader";
import { MerchantHero } from "./MerchantHero";
import { MerchantInterestDialog } from "./MerchantInterestDialog";
import { MerchantLandingFooter } from "./MerchantLandingFooter";
import { MerchantNetworkJourney } from "./MerchantNetworkJourney";
import { MerchantTryOnSizingSection } from "./MerchantTryOnSizingSection";
import styles from "./merchantLanding.module.css";

export function MerchantLandingExperience() {
  const { viewModel, navigation, interest } = useMerchantLandingPage();
  return (
    <div className={styles.page} data-audience="merchant">
      <MerchantHeader
        mobileMenuOpen={navigation.mobileMenuOpen}
        onMenuToggle={navigation.toggleMobileMenu}
        onMenuClose={navigation.closeMobileMenu}
        onPrimaryAction={interest.open}
        onSectionSelect={navigation.scrollToSection}
      />
      <main>
        <MerchantHero viewModel={viewModel} />
        <MerchantTryOnSizingSection onPrimaryAction={interest.open} />
        <MerchantNetworkJourney onPrimaryAction={interest.open} />
      </main>
      <MerchantLandingFooter
        onCtaClick={interest.open}
        onSectionSelect={navigation.scrollToSection}
      />
      <MerchantInterestDialog
        viewModel={viewModel}
        isOpen={interest.isOpen}
        message={interest.message}
        submissionState={interest.submissionState}
        onClose={interest.close}
        onSubmit={interest.submit}
      />
    </div>
  );
}
