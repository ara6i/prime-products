"use client";

import { useMemo } from "react";
import {
  CreatorLanguageProvider,
  localizeInfluencerLandingViewModel,
  useCreatorLanguage,
} from "../../i18n/CreatorLanguageProvider";
import { useInfluencerLandingPage } from "../hooks/useInfluencerLandingPage";
import { InfluencerAccessBenchmarks } from "./InfluencerAccessBenchmarks";
import { InfluencerCreatorCollective } from "./InfluencerCreatorCollective";
import { InfluencerEarningJourney } from "./InfluencerEarningJourney";
import { InfluencerFooter } from "./InfluencerFooter";
import { InfluencerHeader } from "./InfluencerHeader";
import { InfluencerHero } from "./InfluencerHero";
import { InfluencerInterestDialog } from "./InfluencerInterestDialog";
import { InfluencerLookBuilder } from "./InfluencerLookBuilder";
import { InfluencerMediaPreloads } from "./InfluencerMediaPreloads";
import { InfluencerOutfitStudio } from "./InfluencerOutfitStudio";
import { InfluencerProfileDashboardStory } from "./InfluencerProfileDashboardStory";
import { InfluencerReferenceRemix } from "./InfluencerReferenceRemix";
import styles from "./influencerLanding.module.css";

export function InfluencerLandingExperience() {
  return (
    <CreatorLanguageProvider>
      <InfluencerLandingContent />
    </CreatorLanguageProvider>
  );
}

function InfluencerLandingContent() {
  const { viewModel, navigation, interest } = useInfluencerLandingPage();
  const { direction, language, t } = useCreatorLanguage();
  const localizedViewModel = useMemo(
    () => localizeInfluencerLandingViewModel(viewModel, t),
    [t, viewModel],
  );
  return (
    <div
      className={styles.page}
      data-audience="influencer"
      dir={direction}
      lang={language}
    >
      <InfluencerMediaPreloads />
      <InfluencerHeader mobileMenuOpen={navigation.mobileMenuOpen} onMenuToggle={navigation.toggleMobileMenu} onMenuClose={navigation.closeMobileMenu} onPrimaryAction={interest.open} onSectionSelect={navigation.scrollToSection} />
      <main>
        <InfluencerHero viewModel={localizedViewModel} onPrimaryAction={interest.open} onSecondaryAction={interest.open} />
        <InfluencerOutfitStudio onCtaClick={interest.open} />
        <section className={styles.creatorStudioSuite} aria-label={t("Create and remix your look")}>
          <div className={styles.creatorStudioScreen}>
            <InfluencerLookBuilder />
            <InfluencerReferenceRemix onCtaClick={interest.open} />
          </div>
        </section>
        <InfluencerCreatorCollective onCtaClick={interest.open} />
        <InfluencerProfileDashboardStory onCtaClick={interest.open} />
        <InfluencerEarningJourney viewModel={localizedViewModel} onPrimaryAction={interest.open} />
        <InfluencerAccessBenchmarks onCtaClick={interest.open} />
        <section className={styles.finalCta}><span>{t("Creator waitlist")}</span><h2>{t("Your audience already trusts your taste.")}<em>{t("Make the journey shoppable.")}</em></h2><button type="button" onClick={interest.open}>{t("Join waitlist")}</button></section>
      </main>
      <InfluencerFooter onCtaClick={interest.open} />
      <InfluencerInterestDialog viewModel={localizedViewModel} isOpen={interest.isOpen} message={t(interest.message)} submissionState={interest.submissionState} onClose={interest.close} onSubmit={interest.submit} />
    </div>
  );
}
