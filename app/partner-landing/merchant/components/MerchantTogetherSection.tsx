"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import styles from "./merchantTogether.module.css";

type MerchantTogetherSectionProps = {
  onPrimaryAction: () => void;
};

const roles = [
  { id: "merchants", index: "01", name: "Merchants", cue: "Run the store" },
  { id: "customers", index: "02", name: "Customers", cue: "Discover and buy" },
  {
    id: "suppliers",
    index: "03",
    name: "Suppliers",
    cue: "Source and fulfill",
  },
  {
    id: "influencers",
    index: "04",
    name: "Influencers",
    cue: "Create trusted demand",
  },
] as const;

export function MerchantTogetherSection({
  onPrimaryAction,
}: MerchantTogetherSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (!video || reducedMotion.matches) return;

    // Safari can ignore the declarative autoplay attributes during the first
    // paint. Retrying from media/page lifecycle events keeps the hero moving
    // without requiring a click while respecting reduced-motion preferences.
    video.muted = true;
    video.defaultMuted = true;

    const playVideo = () => {
      if (document.visibilityState !== "visible") return;
      void video.play().catch(() => {
        // `canplay` or the next visible `pageshow` event retries playback.
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") playVideo();
    };

    video.addEventListener("loadeddata", playVideo);
    video.addEventListener("canplay", playVideo);
    window.addEventListener("pageshow", playVideo);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    playVideo();

    return () => {
      video.removeEventListener("loadeddata", playVideo);
      video.removeEventListener("canplay", playVideo);
      window.removeEventListener("pageshow", playVideo);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <section
      id="commerce-together"
      className={styles.section}
      aria-labelledby="commerce-together-title"
    >
      <div className={styles.poster}>
        <picture className={styles.picture}>
          <source
            media="(min-width: 681px)"
            srcSet="/media/partner-landing/merchant-network/commerce-together-editorial-wide.webp"
          />
          <source
            media="(max-width: 680px)"
            srcSet="/media/partner-landing/merchant-network/commerce-together-editorial-mobile.webp"
          />
          {/* A native picture element downloads only the matching art-directed crop. */}
          <img
            src="/media/partner-landing/merchant-network/commerce-together-editorial-mobile.webp"
            width={1122}
            height={1402}
            loading="eager"
            decoding="async"
            className={styles.background}
            alt="Fashion merchants, customers, apparel suppliers, and influencers working across one connected global network"
          />
        </picture>

        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source
            media="(max-width: 680px)"
            src="/media/partner-landing/merchant-network/commerce-together-editorial-seamless-mobile-portrait-1080x1350.mp4"
            type="video/mp4"
          />
          <source
            src="/media/partner-landing/merchant-network/commerce-together-editorial-seedance2-4k-seamless-loop.mp4"
            type="video/mp4"
          />
        </video>

        <div className={styles.centerCopy}>
          <p className={styles.eyebrow}>Every side of commerce</p>
          <h2 id="commerce-together-title">
            <span className={styles.coral}>Meet</span>
            <span className={styles.violet}>the</span>
            <span className={styles.teal}>global network</span>
          </h2>
          <p className={styles.roleLine}>
            Merchants · Customers · Suppliers · Influencers
          </p>
          <p className={styles.description}>
            Products move from supplier source to merchant storefront, creator
            story, and customer checkout—inside one connected global network.
          </p>
          <p className={styles.flowLine}>Source · Match · Story · Sale</p>
          <button type="button" onClick={onPrimaryAction}>
            Join the waitlist <ArrowUpRight size={15} weight="bold" />
          </button>
        </div>

        <div
          className={styles.roleLabels}
          aria-label="People in the PrimeStyleAI global network"
        >
          {roles.map((role) => (
            <div
              key={role.id}
              className={`${styles.roleLabel} ${styles[role.id]}`}
            >
              <span>{role.index}</span>
              <p>
                <strong>{role.name}</strong>
                <small>{role.cue}</small>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
