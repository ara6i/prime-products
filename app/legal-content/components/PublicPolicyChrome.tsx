"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DeviceSwitch } from "@/app/shared/components/DeviceSwitch";
import { Footer as DesktopFooter } from "@/app/landing/components/desktop/Footer";
import { Footer as MobileFooter } from "@/app/landing/components/mobile/Footer";
import { InfluencerHeader } from "@/app/partner-landing/influencer/components/InfluencerHeader";
import { InfluencerInterestDialog } from "@/app/partner-landing/influencer/components/InfluencerInterestDialog";
import styles from "@/app/partner-landing/influencer/components/influencerLanding.module.css";
import { useInfluencerLandingPage } from "@/app/partner-landing/influencer/hooks/useInfluencerLandingPage";
import {
  CreatorLanguageProvider,
  localizeInfluencerLandingViewModel,
  useCreatorLanguage,
  useOptionalCreatorLanguage,
} from "@/app/partner-landing/i18n/CreatorLanguageProvider";

interface PublicPolicyChromeProps {
  children: ReactNode;
}

export function PublicPolicyChrome({ children }: PublicPolicyChromeProps) {
  const languageContext = useOptionalCreatorLanguage();

  if (!languageContext) {
    return (
      <CreatorLanguageProvider>
        <LocalizedPublicPolicyChrome>{children}</LocalizedPublicPolicyChrome>
      </CreatorLanguageProvider>
    );
  }

  return <LocalizedPublicPolicyChrome>{children}</LocalizedPublicPolicyChrome>;
}

function LocalizedPublicPolicyChrome({ children }: PublicPolicyChromeProps) {
  const router = useRouter();
  const { direction, language, t } = useCreatorLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { interest, viewModel } = useInfluencerLandingPage();
  const localizedViewModel = useMemo(
    () => localizeInfluencerLandingViewModel(viewModel, t),
    [t, viewModel],
  );
  const openInfluencerSection = (id: string) => {
    setMobileMenuOpen(false);
    router.push(`/influencers#${id}`);
  };

  return (
    <div className={styles.page} data-audience="influencer" dir={direction} lang={language}>
      <InfluencerHeader
        mobileMenuOpen={mobileMenuOpen}
        onMenuToggle={() => setMobileMenuOpen((isOpen) => !isOpen)}
        onMenuClose={() => setMobileMenuOpen(false)}
        onPrimaryAction={interest.open}
        onSectionSelect={openInfluencerSection}
      />
      {children}
      <DeviceSwitch
        desktop={(
          <div className="bg-[#F5F9FF] text-text-primary [overflow-x:clip]">
            <div className="flex flex-col items-center gap-[1.25vw] bg-brand-blue-pale px-[7.292vw] py-[2.5vw]">
              <DesktopFooter translateLabel={t} />
            </div>
          </div>
        )}
        mobile={(
          <div className="bg-[#F5F9FF] text-text-primary [overflow-x:clip]">
            <div className="flex flex-col gap-6 bg-brand-blue-pale px-4 py-10">
              <MobileFooter translateLabel={t} />
            </div>
          </div>
        )}
      />
      <InfluencerInterestDialog
        viewModel={localizedViewModel}
        isOpen={interest.isOpen}
        message={t(interest.message)}
        submissionState={interest.submissionState}
        onClose={interest.close}
        onSubmit={interest.submit}
      />
    </div>
  );
}
