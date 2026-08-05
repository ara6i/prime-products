"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";
import type { MerchantLandingViewModel } from "../types";
import styles from "./merchantLanding.module.css";

export function MerchantHero({ viewModel, onPrimaryAction, onSecondaryAction }: {
  viewModel: MerchantLandingViewModel;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  return (
    <section id="network" className={styles.hero} aria-labelledby="merchant-hero-title">
      <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{viewModel.hero.eyebrow}</p>
          <h1 id="merchant-hero-title">{viewModel.hero.titleLead}<em>{viewModel.hero.titleAccent}</em></h1>
          <p>{viewModel.hero.body}</p>
          <strong className={styles.signature}>{viewModel.hero.annotation}</strong>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryButton} onClick={onPrimaryAction}>{viewModel.hero.primaryCta}<ArrowRight size={17} weight="bold" /></button>
            <button type="button" className={styles.secondaryButton} onClick={onSecondaryAction}>{viewModel.hero.secondaryCta}</button>
          </div>
      </div>
      <div className={styles.heroVisual}>
        <Image src={viewModel.hero.heroImage} alt="Fashion shopper wearing an orange top beside a green vintage car" fill priority fetchPriority="high" unoptimized sizes="(max-width: 760px) 100vw, 58vw" />
        <div className={styles.heroProduct}>
          <Image src={viewModel.hero.image} alt="Silver running shoe" fill priority sizes="(max-width: 760px) 44vw, 20vw" />
          <span>Connected product</span>
        </div>
      </div>
    </section>
  );
}
