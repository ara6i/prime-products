"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import Image from "next/image";
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
            alt="Fashion merchants, customers, apparel suppliers, and influencers working across one connected commerce network"
          />
        </picture>

        <video
          className={styles.video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/media/partner-landing/merchant-network/commerce-together-editorial-wide.webp"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source
            src="/media/partner-landing/merchant-network/commerce-together-editorial-seedance2-native-4k-v2-web.mp4"
            type="video/mp4"
            media="(min-width: 681px) and (prefers-reduced-motion: no-preference)"
          />
        </video>

        <div className={styles.signature} aria-hidden="true">
          <Image
            src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp"
            alt=""
            width={600}
            height={471}
            sizes="34px"
          />
        </div>

        <div className={styles.centerCopy}>
          <p className={styles.eyebrow}>Every side of commerce</p>
          <h2 id="commerce-together-title">
            <span className={styles.coral}>Meet</span>
            <span className={styles.violet}>the</span>
            <span className={styles.teal}>network</span>
          </h2>
          <p className={styles.roleLine}>
            Merchants · Customers · Suppliers · Influencers
          </p>
          <p className={styles.description}>
            Products move from supplier source to merchant storefront, creator
            story, and customer checkout—inside one connected network.
          </p>
          <p className={styles.flowLine}>Source · Match · Story · Sale</p>
          <button type="button" onClick={onPrimaryAction}>
            Join the waitlist <ArrowUpRight size={15} weight="bold" />
          </button>
        </div>

        <div
          className={styles.roleLabels}
          aria-label="People in the PrimeStyleAI network"
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
