"use client";

import { ArrowUpRight, Sparkle } from "@phosphor-icons/react";
import Image from "next/image";
import { ShopCreatorJourney } from "./ShopCreatorJourney";
import styles from "./shopCreatorHero.module.css";

const CREATOR_HERO_IMAGE =
  "/media/global-shop/creator-system/european-editorial-duo-wide-v2.webp";

export function ShopCreatorHero({
  onLearnMore,
}: {
  onLearnMore: () => void;
}) {
  return (
    <section
      className={styles.section}
      id="creator-network"
      aria-labelledby="shop-creator-hero-title"
    >
      <div className={styles.stage}>
        <div className={styles.visual} aria-hidden="true">
          <Image
            className={styles.models}
            src={CREATOR_HERO_IMAGE}
            alt=""
            fill
            priority={false}
            quality={90}
            sizes="(max-width: 860px) 100vw, 63vw"
          />
        </div>

        <h2 className={styles.headline} id="shop-creator-hero-title">
          Are you an influencer?
        </h2>

        <div className={styles.pitch}>
          <p className={styles.eyebrow}>For creators in the global shop</p>
          <p className={styles.promise}>Your influence should pay.</p>
          <p className={styles.body}>
            Connect with merchants, build shoppable looks, and earn when your
            audience buys with confidence.
          </p>
          <button
            className={styles.cta}
            type="button"
            onClick={onLearnMore}
          >
            <span className={styles.ctaIcon} aria-hidden="true">
              <Sparkle size={18} weight="fill" />
            </span>
            <span>Learn more</span>
            <ArrowUpRight size={17} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <p className={styles.leftMeta}>
          Fashion creators · AI fit · Global commerce
        </p>
        <p className={styles.rightMeta}>creators.primestyleai.com</p>
      </div>

      <div className={styles.journey}>
        <ShopCreatorJourney />
      </div>
    </section>
  );
}
