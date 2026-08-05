"use client";

import { ArrowUpRight, Camera, FilmStrip, Sparkle, Stack } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { InfluencerTurntable } from "./InfluencerTurntable";
import styles from "./influencerLanding.module.css";

const STUDIO_MODES = {
  campaign: {
    label: "Campaign mode",
    note: "Build with approved campaign products. Every look stays connected to the brief, brand, and shoppable item.",
    badge: "CAMPAIGN WARDROBE · CONNECTED",
  },
  free: {
    label: "Free mode",
    note: "Bring your own idea, references, and real photo. Explore the look before you decide what to publish.",
    badge: "YOUR REFERENCES · YOUR DIRECTION",
  },
} as const;

type StudioMode = keyof typeof STUDIO_MODES;

export function InfluencerOutfitStudio() {
  const [mode, setMode] = useState<StudioMode>("campaign");
  const selectedMode = STUDIO_MODES[mode];

  return (
    <section id="outfit-studio" className={styles.outfitStudio} aria-labelledby="outfit-studio-title">
      <div className={styles.studioIntro}>
        <p className={styles.eyebrow}>Outfit Studio · Made for creators</p>
        <h2 id="outfit-studio-title">Try it on. Build the look. <em>Direct the content.</em></h2>
        <div>
          <p>Start with your real photo, style campaign pieces or your own references, then turn one outfit into polished photos and video.</p>
          <Link href="/influencers/dashboard/outfit-studio">Explore Outfit Studio <ArrowUpRight size={17} weight="bold" /></Link>
        </div>
      </div>

      <div className={styles.studioCanvas} data-mode={mode}>
        <aside className={styles.studioDirector} aria-label="Studio mode">
          <span className={styles.studioDirectorLabel}>Creative direction</span>
          <div className={styles.studioModeSwitch} role="group" aria-label="Choose a studio mode">
            {(Object.keys(STUDIO_MODES) as StudioMode[]).map((modeKey) => (
              <button
                key={modeKey}
                type="button"
                aria-pressed={mode === modeKey}
                onClick={() => setMode(modeKey)}
              >
                {STUDIO_MODES[modeKey].label}
              </button>
            ))}
          </div>
          <p>{selectedMode.note}</p>
          <div className={styles.studioDirectionMeta}>
            <span><Stack size={15} /> {selectedMode.badge}</span>
            <span><Sparkle size={15} /> Identity stays yours</span>
          </div>
        </aside>

        <div id="studio-preview" className={styles.studioStage} aria-live="polite">
          <span className={styles.studioStageKicker}>YOUR AI FITTING ROOM</span>
          <InfluencerTurntable />
          <span className={styles.studioOutputTag}><Camera size={15} /> PHOTO <i /> <FilmStrip size={15} /> VIDEO</span>
        </div>

        <div className={styles.studioReels} aria-label="Creator video examples">
          <figure>
            <video autoPlay loop muted playsInline preload="metadata" poster="/media/partner-landing/creator-longhair-omni-poster.jpg" aria-hidden tabIndex={-1}>
              <source src="/media/partner-landing/creator-longhair-omni.webm" type="video/webm" />
              <source src="/media/partner-landing/creator-longhair-omni.mp4" type="video/mp4" />
            </video>
            <figcaption className={styles.studioReelHeadline}>
              <small>01 · Frame the look</small>
              <strong>Build your outfit.</strong>
            </figcaption>
          </figure>
        </div>
      </div>

      <div className={styles.studioSteps} aria-label="Outfit Studio workflow">
        <div><span>01</span><strong>Try on yourself</strong><p>Use your real image so the idea begins with you.</p></div>
        <div><span>02</span><strong>Build the outfit</strong><p>Combine campaign products or direct a free-mode look.</p></div>
        <div><span>03</span><strong>Create every format</strong><p>Generate vertical video and editorial photos from one direction.</p></div>
      </div>
    </section>
  );
}
