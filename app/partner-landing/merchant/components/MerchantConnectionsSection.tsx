"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";
import styles from "./merchantConnections.module.css";

type MerchantConnectionsSectionProps = {
  onPrimaryAction: () => void;
};

const networkRoles = ["Suppliers", "Merchants", "Influencers", "Customers"] as const;

export function MerchantConnectionsSection({ onPrimaryAction }: MerchantConnectionsSectionProps) {
  return (
    <section
      id="connected-commerce"
      className={styles.section}
      aria-labelledby="connected-commerce-title"
    >
      <div className={styles.shell}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>02 · Connected commerce</p>
          <h2 id="connected-commerce-title">
            Make every<br />
            connection<br />
            move product.
          </h2>
          <p className={styles.description}>
            Bring suppliers, merchants, influencers, and customers into one connected flow—from source to story to sale.
          </p>

          <div className={styles.roleRail} aria-label="PrimeStyleAI commerce network roles">
            {networkRoles.map((role, index) => (
              <span key={role}><b>{String(index + 1).padStart(2, "0")}</b>{role}</span>
            ))}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.primaryAction} onClick={onPrimaryAction}>
              Join the waitlist
            </button>
            <button
              type="button"
              className={styles.arrowAction}
              onClick={onPrimaryAction}
              aria-label="Open the merchant network interest form"
            >
              <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </div>

        <figure className={styles.visual}>
          <Image
            src="/media/partner-landing/merchant-network/commerce-connections-editorial.webp"
            alt="An apparel supplier, shopper, influencer, and merchant working together across the PrimeStyleAI commerce network"
            width={1122}
            height={1402}
            sizes="(max-width: 760px) 100vw, 52vw"
            unoptimized
          />
          <figcaption>
            <strong>Four roles.</strong>
            <span>One connected path to demand.</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
