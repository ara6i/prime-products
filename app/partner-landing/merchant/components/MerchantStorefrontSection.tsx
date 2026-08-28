import { ArrowDown, ArrowUpRight, Lightning, Storefront } from "@phosphor-icons/react";
import Image from "next/image";
import styles from "./merchantStorefront.module.css";

type MerchantStorefrontSectionProps = {
  onPrimaryAction: () => void;
};

export function MerchantStorefrontSection({
  onPrimaryAction,
}: MerchantStorefrontSectionProps) {
  return (
    <section
      id="shopping-network"
      className={styles.storefrontSection}
      aria-labelledby="shopping-network-title"
    >
      <div className={styles.storefrontFrame}>
        <Image
          className={styles.storefrontBackground}
          src="/media/partner-landing/merchant-network/merchant-storefront-shopping-network-hero.webp"
          alt=""
          fill
          sizes="100vw"
          unoptimized
          aria-hidden="true"
        />

        <div className={styles.storefrontCopy}>
          <div className={styles.storefrontMark}>
            <Image
              src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp"
              alt="PrimeStyleAI"
              width={600}
              height={471}
              sizes="76px"
            />
          </div>

          <p className={styles.storefrontEyebrow}>02 · Your storefront</p>

          <h2 id="shopping-network-title">
            Your own store.
            <span>In our shopping network.</span>
          </h2>

          <p className={styles.storefrontBody}>
            Merchants can have a branded storefront inside PrimeStyleAI, while
            eligible products stay discoverable as shoppers browse the global
            Shop.
          </p>

          <div className={styles.storefrontProof}>
            <span>
              <Storefront size={19} weight="duotone" aria-hidden="true" />
            </span>
            <strong>Your brand · Your page · One connected catalog</strong>
          </div>

          <button
            type="button"
            className={styles.storefrontButton}
            onClick={onPrimaryAction}
          >
            Join the waitlist
            <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
          </button>

          <p className={styles.storefrontNote}>
            More places for shoppers to discover your products.
          </p>
        </div>

        <a className={styles.storefrontExampleFlash} href="#store-example">
          <Lightning size={28} weight="duotone" aria-hidden="true" />
          <span>
            <strong>See an example</strong>
            <small>of your store</small>
          </span>
          <ArrowDown size={18} weight="bold" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
