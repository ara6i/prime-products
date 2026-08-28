"use client";

import {
  ArrowUpRight,
  Camera,
  ChartLineUp,
  Package,
  Ruler,
  ShoppingBag,
  Sparkle,
  Storefront,
  TShirt,
} from "@phosphor-icons/react";
import Image from "next/image";
import styles from "./merchantClosing.module.css";

type MerchantClosingSectionProps = {
  onPrimaryAction: () => void;
};

const LEFT_MOTIF = [
  { Icon: Storefront, tone: "quiet" },
  { Icon: Sparkle, tone: "mint" },
  { Icon: ShoppingBag, tone: "quiet" },
  { Icon: Ruler, tone: "quiet" },
] as const;

const RIGHT_MOTIF = [
  { Icon: TShirt, tone: "quiet" },
  { Icon: Package, tone: "quiet" },
  { Icon: Sparkle, tone: "mint" },
  { Icon: Camera, tone: "quiet" },
  { Icon: ChartLineUp, tone: "yellow" },
] as const;

export function MerchantClosingSection({
  onPrimaryAction,
}: MerchantClosingSectionProps) {
  return (
    <section
      id="merchant-closing"
      className={styles.section}
      aria-labelledby="merchant-closing-title"
    >
      <div className={styles.frame}>
        <div className={styles.hero}>
          <div
            className={`${styles.motif} ${styles.motifLeft}`}
            aria-hidden="true"
          >
            {LEFT_MOTIF.map(({ Icon, tone }, index) => (
              <span
                key={`${tone}-${index}`}
                className={`${styles.motifTile} ${
                  tone === "mint" ? styles.motifTilemint : ""
                }`}
              >
                <Icon
                  size={21}
                  weight={tone === "quiet" ? "regular" : "fill"}
                />
              </span>
            ))}
          </div>

          <div className={styles.copy}>
            <h2 id="merchant-closing-title">
              One place for all
              <span>your commerce</span>
            </h2>
            <p>
              Turn one product photo into better fit, richer storefronts, and
              more places to sell.
            </p>
            <button type="button" onClick={onPrimaryAction}>
              Join the waitlist <ArrowUpRight size={17} weight="bold" />
            </button>
          </div>

          <div
            className={`${styles.motif} ${styles.motifRight}`}
            aria-hidden="true"
          >
            {RIGHT_MOTIF.map(({ Icon, tone }, index) => (
              <span
                key={`${tone}-${index}`}
                className={`${styles.motifTile} ${
                  tone === "mint"
                    ? styles.motifTilemint
                    : tone === "yellow"
                      ? styles.motifTileyellow
                      : ""
                }`}
              >
                <Icon
                  size={21}
                  weight={tone === "quiet" ? "regular" : "fill"}
                />
              </span>
            ))}
          </div>
        </div>

        <div className={styles.cardGrid}>
          <article className={`${styles.card} ${styles.performanceCard}`}>
            <div className={styles.performanceMeta}>
              <strong>One photo</strong>
              <span>Fit data ready</span>
              <ChartLineUp size={19} weight="bold" aria-hidden="true" />
            </div>
            <Image
              className={styles.performanceArtwork}
              src="/media/partner-landing/merchant-network/closing/merchant-performance-line.webp"
              alt="A fashion sales line connecting a jacket, sneaker, and handbag"
              width={1200}
              height={400}
              sizes="(max-width: 850px) 82vw, 30vw"
            />
            <h3>Turn fit confidence into conversion.</h3>
          </article>

          <article className={`${styles.card} ${styles.storefrontCard}`}>
            <h3>
              Build the storefront
              <span>customers want.</span>
            </h3>
            <Image
              className={styles.productPillsArtwork}
              src="/media/partner-landing/merchant-network/closing/storefront-product-pills.webp"
              alt="A cobalt jacket and coral sneaker presented as storefront product cards"
              width={1100}
              height={402}
              sizes="(max-width: 850px) 76vw, 28vw"
            />
          </article>

          <article className={`${styles.card} ${styles.networkCard}`}>
            <h3>
              Reach your whole
              <span>shopping network.</span>
            </h3>
            <Image
              className={styles.networkArtwork}
              src="/media/partner-landing/merchant-network/closing/merchant-network-badges.webp"
              alt="Storefront, shipping, catalog, and creator commerce badges"
              width={1100}
              height={397}
              sizes="(max-width: 850px) 72vw, 25vw"
            />
            <button type="button" onClick={onPrimaryAction}>
              Join the waitlist <ArrowUpRight size={14} weight="bold" />
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
