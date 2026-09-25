"use client";

import { useLayoutEffect } from "react";
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

const SHOW_INTERACTIVE_SDK_SECTION = false;

export function MerchantLandingExperience() {
  const { viewModel, navigation, interest } = useMerchantLandingPage();

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    const shouldStartAtTop = window.location.hash.length === 0;

    window.history.scrollRestoration = "manual";

    if (!shouldStartAtTop) {
      return () => {
        window.history.scrollRestoration = previousScrollRestoration;
      };
    }

    const resetScroll = () => window.scrollTo(0, 0);
    const resetAfterPageShow = () => window.requestAnimationFrame(resetScroll);
    const animationFrame = window.requestAnimationFrame(resetScroll);
    const timer = window.setTimeout(resetScroll, 0);

    window.addEventListener("pageshow", resetAfterPageShow);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timer);
      window.removeEventListener("pageshow", resetAfterPageShow);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

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
        {SHOW_INTERACTIVE_SDK_SECTION ? <MerchantPdpSdkSection /> : null}
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
