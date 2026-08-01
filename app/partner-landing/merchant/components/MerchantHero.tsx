"use client";

import { ArrowRight, Check, Pause, Play } from "@phosphor-icons/react";
import Image from "next/image";
import { useMemo } from "react";
import { useCinematicPlayback } from "../../hooks/useCinematicPlayback";
import type { MerchantLandingViewModel } from "../types";
import styles from "./merchantLanding.module.css";

export function MerchantHero({ viewModel, onPrimaryAction, onSecondaryAction }: {
  viewModel: MerchantLandingViewModel;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  const playback = useCinematicPlayback(useMemo(() => [0], []));
  return (
    <section className={styles.hero} aria-labelledby="merchant-hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{viewModel.hero.eyebrow}</p>
        <h1 id="merchant-hero-title">{viewModel.hero.titleLead}<em>{viewModel.hero.titleAccent}</em></h1>
        <p>{viewModel.hero.body}</p>
        <div className={styles.heroActions}>
          <button type="button" className={styles.primaryButton} onClick={onPrimaryAction}>{viewModel.hero.primaryCta}<ArrowRight size={17} weight="bold" /></button>
          <button type="button" className={styles.secondaryButton} onClick={onSecondaryAction}>{viewModel.hero.secondaryCta}</button>
        </div>
        <div className={styles.merchantPromise}>
          <span><Check size={13} weight="bold" /> Merchant-controlled rights</span>
          <span><Check size={13} weight="bold" /> Exact-variant handoff</span>
          <span><Check size={13} weight="bold" /> Order and return truth</span>
        </div>
      </div>

      <div className={styles.heroSystem}>
        <div className={styles.heroVideo}>
          <video ref={playback.registerVideo(0)} src={viewModel.hero.video} poster={viewModel.hero.poster} autoPlay muted loop playsInline onLoadedMetadata={() => playback.syncOffset(0)} onTimeUpdate={playback.updateProgress} />
          <button type="button" onClick={playback.togglePlayback} aria-label={playback.isPlaying ? "Pause merchant film" : "Play merchant film"}>{playback.isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}</button>
          <span>MERCHANT STUDIO · PRODUCT 01</span>
        </div>
        <div className={styles.productTray}>
          {["product-cardigan-yellow.png", "product-cardigan-red.png", "product-blouse-blue.png"].map((image, index) => <div key={image}><Image src={`/images/landing/${image}`} alt={`Connected catalog product ${index + 1}`} fill sizes="90px" /><span>0{index + 1}</span></div>)}
        </div>
        <div className={styles.catalogCard}><span>Catalog connection</span><strong>Ready for review</strong><p><Check size={14} weight="bold" /> Variants mapped</p><p><Check size={14} weight="bold" /> Size chart linked</p><p><Check size={14} weight="bold" /> Cart method verified</p></div>
        <div className={styles.orderCard}><span>Commerce event</span><strong>Attributed order</strong><small>Return status reconciles here</small></div>
        <div className={styles.heroAnnotation}><ArrowRight size={36} /><span>{viewModel.hero.annotation}</span></div>
      </div>
      <div className={styles.heroIndex}><span>01</span><i /><span>CONNECTED COMMERCE</span></div>
    </section>
  );
}
