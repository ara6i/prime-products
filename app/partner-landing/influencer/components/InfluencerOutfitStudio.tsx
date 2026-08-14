"use client";

import { ArrowUpRight, Camera, FilmStrip, Sparkle, Stack } from "@phosphor-icons/react";
import { useState } from "react";
import { useCreatorLanguage } from "../../i18n/CreatorLanguageProvider";
import { InfluencerTurntable } from "./InfluencerTurntable";
import styles from "./influencerLanding.module.css";

const STUDIO_MODES = {
  campaign: {
    label: "Campaign mode",
    note: "Build with products from connected merchant campaigns. Every look stays connected to the brief, brand, and shoppable item.",
    badge: "CAMPAIGN WARDROBE · CONNECTED",
  },
  free: {
    label: "Free mode",
    note: "Bring your own idea, references, and real photo. Explore the look before you decide what to publish.",
    badge: "YOUR REFERENCES · YOUR DIRECTION",
  },
} as const;

type StudioMode = keyof typeof STUDIO_MODES;

export function InfluencerOutfitStudio({ onCtaClick }: { onCtaClick: () => void }) {
  const [mode, setMode] = useState<StudioMode>("campaign");
  const selectedMode = STUDIO_MODES[mode];
  const { t } = useCreatorLanguage();

  return (
    <section id="outfit-studio" className={styles.outfitStudio} aria-labelledby="outfit-studio-title">
      <div className={styles.studioIntro}>
        <p className={styles.eyebrow}>{t("Outfit Studio · Made for creators")}</p>
        <h2 id="outfit-studio-title">{t("Try it on. Build the look.")} <em>{t("Direct the content.")}</em></h2>
        <div>
          <p>{t("Start with your real photo, style campaign pieces or your own references, then turn one outfit into polished photos and video.")}</p>
          <div className={styles.studioBenefitList} aria-label={t("Creator production benefits")}>
            <span><Camera size={17} weight="bold" /> {t("AI try-on images and mix-and-match complete outfits")}</span>
            <span><FilmStrip size={17} weight="bold" /> {t("AI fashion videos created from the looks you build")}</span>
          </div>
          <button type="button" className={styles.studioIntroCta} onClick={onCtaClick}>{t("Explore Outfit Studio")} <ArrowUpRight size={17} weight="bold" /></button>
        </div>
      </div>

      <div className={styles.studioCanvas} data-mode={mode}>
        <aside className={styles.studioDirector} aria-label={t("Studio mode")}>
          <span className={styles.studioDirectorLabel}>{t("Creative direction")}</span>
          <div className={styles.studioModeSwitch} role="group" aria-label={t("Choose a studio mode")}>
            {(Object.keys(STUDIO_MODES) as StudioMode[]).map((modeKey) => (
              <button
                key={modeKey}
                type="button"
                aria-pressed={mode === modeKey}
                onClick={() => setMode(modeKey)}
              >
                {t(STUDIO_MODES[modeKey].label)}
              </button>
            ))}
          </div>
          <p>{t(selectedMode.note)}</p>
          <div className={styles.studioDirectionMeta}>
            <span><Stack size={15} /> {t(selectedMode.badge)}</span>
            <span><Sparkle size={15} /> {t("Identity stays yours")}</span>
          </div>
        </aside>

        <div id="studio-preview" className={styles.studioStage} aria-live="polite">
          <span className={styles.studioStageKicker}>{t("YOUR AI FITTING ROOM")}</span>
          <InfluencerTurntable />
          <span className={styles.studioOutputTag}><Camera size={15} /> {t("PHOTO")} <i /> <FilmStrip size={15} /> {t("VIDEO")}</span>
        </div>

        <div className={styles.studioReels} aria-label={t("Creator video examples")}>
          <figure>
            <video autoPlay loop muted playsInline preload="metadata" poster="/media/partner-landing/optimized/creator-longhair-omni-poster.webp" aria-hidden tabIndex={-1}>
              <source src="/media/partner-landing/optimized/creator-longhair-omni.webm" type="video/webm" />
              <source src="/media/partner-landing/optimized/creator-longhair-omni.mp4" type="video/mp4" />
            </video>
            <figcaption className={styles.studioReelHeadline}>
              <small>{t("01 · Frame the look")}</small>
              <strong>{t("Build your outfit.")}</strong>
            </figcaption>
          </figure>
        </div>
      </div>

      <div className={styles.studioSteps} aria-label={t("Outfit Studio workflow")}>
        <div><span>01</span><strong>{t("Try on yourself")}</strong><p>{t("Use your real image so the idea begins with you.")}</p></div>
        <div><span>02</span><strong>{t("Build the outfit")}</strong><p>{t("Combine campaign products or direct a free-mode look.")}</p></div>
        <div><span>03</span><strong>{t("Create every format")}</strong><p>{t("Generate vertical video and editorial photos from one direction.")}</p></div>
      </div>
    </section>
  );
}
