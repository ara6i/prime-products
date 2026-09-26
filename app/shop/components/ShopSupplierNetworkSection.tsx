import {
  ArrowRight,
  ArrowUpRight,
  GlobeHemisphereWest,
  Package,
  Storefront,
  VideoCamera,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import styles from "./shopSupplierNetwork.module.css";

const networkBenefits = [
  { icon: Storefront, label: "Merchant connections" },
  { icon: VideoCamera, label: "Creator demand" },
  { icon: GlobeHemisphereWest, label: "Broader network reach" },
];

export function ShopSupplierNetworkSection() {
  return (
    <section
      className={styles.section}
      id="supplier-network"
      aria-labelledby="supplier-network-title"
    >
      <div className={styles.shell}>
        <div className={styles.titleBand}>
          <h2
            id="supplier-network-title"
            className={styles.titleLeft}
            aria-label="Could your collection reach further?"
          >
            <em>Could your</em>
            <strong>COLLECTION</strong>
          </h2>
          <div className={styles.titleSpacer} aria-hidden="true" />
          <div className={styles.titleRight} aria-hidden="true">
            <em>reach</em>
            <strong>FURTHER?</strong>
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.stageCopy}>
            <p className={styles.eyebrow}>For suppliers</p>
            <h3>Turn one catalog into more routes to market.</h3>
            <p className={styles.description}>
              Share products with participating merchants and Creator-led
              campaigns through one connected supplier system. Availability and
              distribution depend on each partner relationship.
            </p>
            <Link href="/suppliers" className={styles.primaryCta}>
              Grow as a supplier
              <ArrowRight size={19} weight="bold" />
            </Link>
          </div>

          <div className={styles.sceneFrame}>
            <Image
              src="/media/global-shop/supplier-network/supplier-merchant-influencer-cutout-v1.png"
              alt="A European supplier handing a garment box to a European merchant while a European Creator films the exchange"
              fill
              sizes="(max-width: 800px) calc(100vw - 72px), 48vw"
              className={styles.sceneImage}
            />
          </div>

          <div className={styles.networkPanel}>
            <p>Built for suppliers</p>
            <div className={styles.benefits}>
              {networkBenefits.map(({ icon: Icon, label }) => (
                <div className={styles.benefit} key={label}>
                  <span>
                    <Icon size={19} weight="fill" />
                  </span>
                  <strong>{label}</strong>
                </div>
              ))}
            </div>

            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>
                <Package size={26} weight="fill" />
              </span>
              <div>
                <small>Supplier dashboard</small>
                <strong>One catalog. Full visibility.</strong>
              </div>
              <ArrowUpRight size={19} weight="bold" />
            </div>
          </div>
        </div>

        <div className={styles.flow} aria-label="Supplier network flow">
          <span>Upload once</span>
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
          <span>Reach merchants</span>
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
          <span>Expand network reach</span>
        </div>
      </div>
    </section>
  );
}
