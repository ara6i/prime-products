"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";
import { useCreatorLanguage } from "../../i18n/CreatorLanguageProvider";
import type { InfluencerLandingViewModel } from "../types";
import { InfluencerHeroJourney } from "./InfluencerHeroJourney";
import { INFLUENCER_HERO_REELS } from "./influencerHeroMedia";
import styles from "./influencerLanding.module.css";

const CREATOR_CARDS = [
  "/media/partner-landing/optimized/creator-avatar-01.webp",
  "/media/partner-landing/optimized/creator-avatar-02.webp",
  "/media/partner-landing/optimized/avatar-elena-96.webp",
];

export function InfluencerHero({ viewModel, onPrimaryAction, onSecondaryAction }: {
  viewModel: InfluencerLandingViewModel;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  const { t } = useCreatorLanguage();

  return (
    <section className={styles.hero} aria-labelledby="influencer-hero-title">
      <div className={styles.heroTop}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{viewModel.hero.eyebrow}</p>
          <h1 id="influencer-hero-title"><span>{viewModel.hero.titleLead}</span><em>{viewModel.hero.titleAccent}</em></h1>
          <p className={styles.heroBody}>{viewModel.hero.body}</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryButton} onClick={onPrimaryAction}>{viewModel.hero.primaryCta}<ArrowRight size={17} weight="bold" /></button>
            <button type="button" className={styles.secondaryButton} onClick={onSecondaryAction}>{viewModel.hero.secondaryCta}</button>
          </div>
          <div className={styles.creatorTrust}>
            <span className={styles.creatorAvatars}>{CREATOR_CARDS.map((src) => <Image key={src} src={src} alt="" width={28} height={28} />)}</span>
            <span>{t("Built for fashion creators")}</span>
          </div>
        </div>

        <div className={styles.heroFilm} aria-label={t("Creator try-on reels")}>
          {INFLUENCER_HERO_REELS.map((reel) => (
            <div className={styles.heroReel} key={reel.webm}>
              <video autoPlay loop muted playsInline preload="auto" poster={reel.poster} aria-label={t(reel.label)}>
                <source src={reel.webm} type="video/webm" />
                <source src={reel.mp4} type="video/mp4" />
              </video>
            </div>
          ))}
          <div className={styles.filmTimeline} aria-hidden="true">
            <span><b>01</b>{t("Wear")}</span>
            <span><b>02</b>{t("Style")}</span>
            <span><b>03</b>{t("Reveal")}</span>
            <span><b>04</b>{t("Share")}</span>
            <span><b>05</b>{t("Earn")}</span>
            <i><b /></i>
          </div>
        </div>
      </div>

      <InfluencerHeroJourney />
    </section>
  );
}
