"use client";

import { ArrowRight, Pause, Play } from "@phosphor-icons/react";
import { useMemo } from "react";
import { useCinematicPlayback } from "../../hooks/useCinematicPlayback";
import type { InfluencerLandingViewModel } from "../types";
import styles from "./influencerLanding.module.css";

export function InfluencerHero({ viewModel, onPrimaryAction, onSecondaryAction }: {
  viewModel: InfluencerLandingViewModel;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  const playback = useCinematicPlayback(useMemo(() => [0, 2.4, 5.2], []));

  return (
    <section className={styles.hero} aria-labelledby="influencer-hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{viewModel.hero.eyebrow}</p>
        <h1 id="influencer-hero-title">{viewModel.hero.titleLead}<em>{viewModel.hero.titleAccent}</em></h1>
        <p className={styles.heroBody}>{viewModel.hero.body}</p>
        <div className={styles.heroActions}>
          <button type="button" className={styles.primaryButton} onClick={onPrimaryAction}>{viewModel.hero.primaryCta}<ArrowRight size={17} weight="bold" /></button>
          <button type="button" className={styles.secondaryButton} onClick={onSecondaryAction}>{viewModel.hero.secondaryCta}</button>
        </div>
        <div className={styles.heroPromise} aria-label="Creator program benefits">
          <span>Approved products</span><span>Clear rate conditions</span><span>Validated payout</span>
        </div>
        <div className={styles.heroScribble}><ArrowRight size={38} weight="light" /><span>{viewModel.hero.annotation}</span></div>
      </div>

      <div className={styles.heroFilm}>
        <video ref={playback.registerVideo(0)} src={viewModel.hero.video} poster={viewModel.hero.poster} autoPlay muted loop playsInline onLoadedMetadata={() => playback.syncOffset(0)} onTimeUpdate={playback.updateProgress} />
        <div className={styles.filmCards} aria-hidden>
          {[1, 2].map((index) => (
            <div className={styles.filmCard} key={index}>
              <video ref={playback.registerVideo(index)} src={viewModel.hero.video} poster={viewModel.hero.poster} autoPlay muted loop playsInline onLoadedMetadata={() => playback.syncOffset(index)} />
              <span><Play size={13} weight="fill" /> Look 0{index}</span>
            </div>
          ))}
        </div>
        <div className={styles.filmControls}>
          <button type="button" onClick={playback.togglePlayback} aria-label={playback.isPlaying ? "Pause fashion film" : "Play fashion film"}>
            {playback.isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
          </button>
          <span>Creator film</span><div aria-hidden><i style={{ width: `${Math.max(8, playback.progress)}%` }} /></div><span>00:12</span>
        </div>
      </div>
    </section>
  );
}
