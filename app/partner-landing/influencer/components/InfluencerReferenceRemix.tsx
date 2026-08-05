"use client";

import { ArrowUpRight, FilmStrip, ImageSquare, Play, Sparkle } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./influencerLanding.module.css";

type RemixReference = {
  id: string;
  title: string;
  cue: string;
  kind: "photo" | "video";
  poster: string;
  video?: string;
};

const REMIX_REFERENCES: RemixReference[] = [
  { id: "turn", title: "The runway turn", cue: "Camera movement", kind: "video", poster: "/media/partner-landing/influencer-runway-poster.jpg", video: "/media/partner-landing/influencer-runway.mp4" },
  { id: "reveal", title: "The portrait reveal", cue: "Pose and pacing", kind: "video", poster: "/media/partner-landing/creator-portrait-poster.jpg", video: "/media/partner-landing/creator-portrait.mp4" },
  { id: "walk", title: "The campaign cut", cue: "Edit rhythm", kind: "video", poster: "/media/partner-landing/merchant-studio-poster.jpg", video: "/media/partner-landing/merchant-studio.mp4" },
  { id: "duo", title: "Color-block duo", cue: "Pose and palette", kind: "photo", poster: "/media/partner-landing/creator-collective-01.png" },
  { id: "street", title: "Creator street cast", cue: "Group direction", kind: "photo", poster: "/media/partner-landing/creator-collective-02.png" },
  { id: "sun", title: "Sunlit statement", cue: "Light and color", kind: "photo", poster: "/media/partner-landing/creator-collective-03.png" },
  { id: "tailoring", title: "Cobalt tailoring", cue: "Silhouette", kind: "photo", poster: "/media/partner-landing/creator-collective-04.png" },
  { id: "orange-motion", title: "Orange in motion", cue: "Energy", kind: "photo", poster: "/media/partner-landing/merchant-network/influencer-showcase/creator-01-orange-motion.webp" },
  { id: "detail", title: "Blue-orange detail", cue: "Product focus", kind: "photo", poster: "/media/partner-landing/merchant-network/influencer-showcase/creator-02-blue-orange-detail.webp" },
  { id: "coat", title: "Cobalt confidence", cue: "Editorial stance", kind: "photo", poster: "/media/partner-landing/merchant-network/influencer-showcase/creator-03-cobalt-tailoring.webp" },
  { id: "orange-editorial", title: "Orange editorial", cue: "Set direction", kind: "photo", poster: "/media/partner-landing/merchant-network/influencer-showcase/creator-04-orange-editorial.webp" },
  { id: "ice-blue", title: "Ice-blue streetwear", cue: "Mood and texture", kind: "photo", poster: "/media/partner-landing/merchant-network/influencer-showcase/creator-05-ice-blue-streetwear.webp" },
  { id: "glasses", title: "Statement glasses", cue: "Accessory story", kind: "photo", poster: "/media/partner-landing/merchant-network/influencer-showcase/creator-06-white-orange-glasses.webp" },
  { id: "blue-suit", title: "Blue suit strip", cue: "Frame sequence", kind: "photo", poster: "/media/partner-landing/merchant-network/influencer-showcase/creator-07-blue-suit-strip.webp" },
];

export function InfluencerReferenceRemix() {
  const [activeId, setActiveId] = useState("sun");
  const activeReference = REMIX_REFERENCES.find((reference) => reference.id === activeId) ?? REMIX_REFERENCES[0];

  return (
    <section id="reference-remix" className={styles.referenceRemix} aria-labelledby="reference-remix-title">
      <div className={styles.remixIntro}>
        <p className={styles.eyebrow}>Reference remix · coming next</p>
        <h2 id="reference-remix-title">See it. Recreate it. <em>Own the result.</em></h2>
        <p>
          Start from a PrimeStyleAI photo or video reference. Keep the camera move, pose,
          edit rhythm, or mood—then remake it with your identity, your outfit, and your campaign.
        </p>
      </div>

      <div className={styles.remixBoard}>
        <div className={styles.remixBoardBar}>
          <strong><Sparkle size={16} weight="fill" /> PrimeStyle references</strong>
          <span><FilmStrip size={15} weight="bold" /> Video</span>
          <span><ImageSquare size={15} weight="bold" /> Photo</span>
          <small>{REMIX_REFERENCES.length} directions</small>
        </div>

        <div className={styles.remixMosaic}>
          {REMIX_REFERENCES.map((reference) => (
            <button
              key={reference.id}
              className={styles.remixTile}
              type="button"
              aria-label={`Preview ${reference.title}`}
              aria-pressed={activeReference.id === reference.id}
              onClick={() => setActiveId(reference.id)}
            >
              <Image src={reference.poster} alt="" fill sizes="(max-width: 620px) 31vw, 16vw" />
              <span>{reference.kind === "video" ? <Play size={12} weight="fill" /> : <ImageSquare size={12} weight="bold" />}</span>
            </button>
          ))}

          <article className={styles.remixHero} aria-live="polite">
            <div className={styles.remixHeroMedia}>
              {activeReference.kind === "video" && activeReference.video ? (
                <video key={activeReference.video} autoPlay loop muted playsInline preload="metadata" poster={activeReference.poster}>
                  <source src={activeReference.video} type="video/mp4" />
                </video>
              ) : (
                <Image src={activeReference.poster} alt={`${activeReference.title} reference`} fill sizes="420px" />
              )}
            </div>
            <div className={styles.remixHeroCopy}>
              <small>{activeReference.cue}</small>
              <h3>{activeReference.title}</h3>
              <p>Your face. Your outfit. Your version.</p>
              <Link href="/influencers/dashboard/outfit-studio">
                Recreate this style <ArrowUpRight size={17} weight="bold" />
              </Link>
            </div>
          </article>
        </div>

        <div className={styles.remixPromise}>
          <span>Coming to Outfit Studio</span>
          <p>Choose a reference video, add your real image and campaign pieces, then direct a new version that still feels completely yours.</p>
        </div>
      </div>
    </section>
  );
}
