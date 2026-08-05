"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";
import type { InfluencerLandingViewModel } from "../types";
import { InfluencerHeroJourney } from "./InfluencerHeroJourney";
import styles from "./influencerLanding.module.css";

const CREATOR_CARDS = [
  "/images/landing/landing-model-3-43db80.png",
  "/images/landing/landing-model-4-4d2cdf.png",
  "/media/partner-landing/creator-portrait-poster.jpg",
];

const HERO_REELS = [
  { src: "/videos/ugc-hero/linh-black-jacket.mp4", label: "Black jacket try-on" },
  { src: "/videos/ugc-hero/linh-heaven-made.mp4", label: "Heaven Made tee try-on" },
  { src: "/videos/ugc-hero/rafael-scvcn-sunglasses.mp4", label: "Sports sunglasses try-on" },
  { src: "/videos/ugc-hero/yuna-lavender-set.mp4", label: "Lavender set try-on" },
  { src: "/videos/ugc-hero/diego-genius-23-jersey.mp4", label: "Genius 23 jersey try-on" },
];

export function InfluencerHero({ viewModel, onPrimaryAction, onSecondaryAction }: {
  viewModel: InfluencerLandingViewModel;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
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
            <span>Built for fashion creators</span>
          </div>
        </div>

        <div className={styles.heroFilm} aria-label="Creator try-on reels">
          {HERO_REELS.map((reel) => (
            <div className={styles.heroReel} key={reel.src}>
              <video autoPlay loop muted playsInline preload="metadata" aria-label={reel.label}>
                <source src={reel.src} type="video/mp4" />
              </video>
            </div>
          ))}
          <div className={styles.filmTimeline} aria-hidden="true">
            <span><b>01</b>Wear</span>
            <span><b>02</b>Style</span>
            <span><b>03</b>Reveal</span>
            <span><b>04</b>Share</span>
            <span><b>05</b>Earn</span>
            <i><b /></i>
          </div>
        </div>
      </div>

      <InfluencerHeroJourney />
    </section>
  );
}
