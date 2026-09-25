"use client";

import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { MerchantLandingViewModel } from "../types";
import styles from "./merchantLanding.module.css";

export function MerchantHero({
  viewModel,
  cta,
}: {
  viewModel: MerchantLandingViewModel;
  cta?: {
    href: string;
    label: string;
  };
}) {
  const [activePillarIndex, setActivePillarIndex] = useState<number | null>(
    null,
  );
  const heroAlt =
    "PrimeStyleAI headquarters and the global network of suppliers, merchants, creators, and shoppers forming the PrimeStyleAI mark";

  return (
    <section
      id="network"
      className={styles.networkHero}
      aria-label="PrimeStyleAI global merchant network"
    >
      <picture className={styles.networkHeroPicture}>
        <source
          media="(max-width: 560px)"
          srcSet={viewModel.hero.heroMobileImage}
        />
        <img
          src={viewModel.hero.heroImage}
          alt={heroAlt}
          width={3840}
          height={2160}
          className={styles.networkHeroBackground}
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
      </picture>
      <div className={styles.networkHeroCopy}>
        <h1 className={styles.networkHeroTitle}>
          <span>{viewModel.hero.titleLead}</span>
          <span className={styles.networkHeroTitleMiddle}>
            <span>{viewModel.hero.titleMiddleLead}</span>
            <span className={styles.networkHeroTitleMark} aria-hidden="true">
              <Image
                src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp"
                alt=""
                width={600}
                height={471}
                sizes="72px"
              />
            </span>
            <span>{viewModel.hero.titleMiddleTail}</span>
          </span>
          <span className={styles.networkHeroTitleAccent}>
            {viewModel.hero.titleAccent}
          </span>
        </h1>
        <div
          className={styles.networkHeroExplorer}
          onMouseLeave={() => setActivePillarIndex(null)}
        >
          <div
            className={styles.networkHeroFeatureList}
            aria-label="Explore the PrimeStyleAI global network features"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setActivePillarIndex(null);
              }
            }}
          >
            {viewModel.hero.pillars.map((pillar, index) => {
              const isActive = activePillarIndex === index;

              return (
                <button
                  key={pillar.title}
                  type="button"
                  className={`${styles.networkHeroFeatureButton} ${
                    isActive ? styles.networkHeroFeatureButtonActive : ""
                  }`}
                  aria-pressed={isActive}
                  aria-controls="merchant-network-feature-preview"
                  onMouseEnter={() => setActivePillarIndex(index)}
                  onFocus={() => setActivePillarIndex(index)}
                  onClick={() => setActivePillarIndex(isActive ? null : index)}
                >
                  <span className={styles.networkHeroFeatureIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.networkHeroFeatureCopy}>
                    <strong>{pillar.title}</strong>
                    <span>{pillar.description}</span>
                  </span>
                  <span
                    className={styles.networkHeroFeatureArrow}
                    aria-hidden="true"
                  >
                    <ArrowUpRight size={15} weight="bold" />
                  </span>
                </button>
              );
            })}
          </div>

          <figure
            id="merchant-network-feature-preview"
            className={`${styles.networkHeroFeaturePreview} ${
              activePillarIndex !== null
                ? styles.networkHeroFeaturePreviewVisible
                : ""
            }`}
            aria-live="polite"
            aria-hidden={activePillarIndex === null}
          >
            {viewModel.hero.pillars.map((pillar, index) => {
              const isActive = activePillarIndex === index;

              return (
                <Image
                  key={pillar.image}
                  className={`${styles.networkHeroFeatureImage} ${
                    isActive ? styles.networkHeroFeatureImageActive : ""
                  }`}
                  src={pillar.image}
                  alt={isActive ? pillar.imageAlt : ""}
                  fill
                  quality={90}
                  sizes="(max-width: 560px) 38vw, (max-width: 850px) 21vw, 260px"
                  aria-hidden={!isActive}
                />
              );
            })}
          </figure>
        </div>
        {cta ? (
          <Link
            href={cta.href}
            className={`${styles.primaryButton} ${styles.networkHeroCta}`}
          >
            {cta.label} <ArrowRight size={17} weight="bold" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
