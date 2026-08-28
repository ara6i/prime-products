"use client";

import { useMerchantLandingPage } from "../hooks/useMerchantLandingPage";
import { MerchantHeader } from "./MerchantHeader";
import { MerchantHero } from "./MerchantHero";
import { MerchantInterestDialog } from "./MerchantInterestDialog";
import { MerchantClosingSection } from "./MerchantClosingSection";
import { MerchantLandingFooter } from "./MerchantLandingFooter";
import { MerchantNetworkJourney } from "./MerchantNetworkJourney";
import { MerchantOnePhotoSizingSection } from "./MerchantOnePhotoSizingSection";
import { MerchantOutfitBuilderSection } from "./MerchantOutfitBuilderSection";
import { MerchantPdpSdkSection } from "./MerchantPdpSdkSection";
import { MerchantStorefrontSection } from "./MerchantStorefrontSection";
import { MerchantStoreExampleSection } from "./MerchantStoreExampleSection";
import { MerchantSupplierSections } from "./MerchantSupplierSections";
import { MerchantTogetherSection } from "./MerchantTogetherSection";
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
        <MerchantTogetherSection onPrimaryAction={interest.open} />
        <MerchantHero viewModel={viewModel} />
        <MerchantOnePhotoSizingSection />
        <MerchantOutfitBuilderSection />
        <MerchantPdpSdkSection />
        <MerchantStorefrontSection onPrimaryAction={interest.open} />
        <MerchantStoreExampleSection />
        <MerchantNetworkJourney onPrimaryAction={interest.open} />
        <MerchantSupplierSections onPrimaryAction={interest.open} />
        <MerchantClosingSection onPrimaryAction={interest.open} />
      </main>
      <MerchantLandingFooter
        onCtaClick={interest.open}
        onSectionSelect={navigation.scrollToSection}
      />
      <MerchantInterestDialog
        viewModel={viewModel}
        isOpen={interest.isOpen}
        onClose={interest.close}
      />
    </div>
  );
}
