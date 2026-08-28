"use client";

import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";
import { SupplierCatalogMotion } from "./SupplierCatalogMotion";
import styles from "./merchantSupplierSections.module.css";

type MerchantSupplierSectionsProps = {
  onPrimaryAction: () => void;
};

export function MerchantSupplierSections({
  onPrimaryAction,
}: MerchantSupplierSectionsProps) {
  return (
    <div className={styles.supplierStory}>
      <section
        id="supplier-catalogs"
        className={styles.catalogSection}
        aria-labelledby="supplier-catalogs-title"
      >
        <div className={styles.catalogCopy}>
          <h2 id="supplier-catalogs-title">
            Turn supplier catalogs into <span>merchant-ready collections.</span>
          </h2>
          <p className={styles.catalogLead}>
            Connect with suppliers, choose the dresses, jackets, shoes, pants,
            and jewelry that fit your store, then publish them as your own
            curated assortment.
          </p>
          <button
            className={styles.catalogCta}
            type="button"
            onClick={onPrimaryAction}
          >
            Join the waitlist <ArrowRight size={16} weight="bold" />
          </button>
        </div>

        <SupplierCatalogMotion />
      </section>

      <section
        id="supplier-distribution"
        className={styles.distributionSection}
        aria-labelledby="supplier-distribution-title"
      >
        <div className={styles.distributionCopy}>
          <h2 id="supplier-distribution-title">
            List once. Reach every <span>matching merchant.</span>
          </h2>
          <p className={styles.distributionLead}>
            Suppliers publish products once. Merchants discover what fits their
            customer, add it to their storefront, and keep inventory, sizes, and
            fulfillment connected.
          </p>
          <button
            className={styles.distributionCta}
            type="button"
            onClick={onPrimaryAction}
          >
            Join the waitlist <ArrowRight size={16} weight="bold" />
          </button>
        </div>

        <figure className={styles.distributionVisual}>
          <Image
            src="/media/partner-landing/merchant-network/supplier-distribution-network-reference-scale-v3-4k.png"
            alt="A product-only supplier catalog distributing dresses, jackets, shoes, pants, and jewelry to merchant storefronts"
            width={3840}
            height={2160}
            sizes="100vw"
            unoptimized
          />
        </figure>
      </section>
    </div>
  );
}
