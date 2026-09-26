import {
  ArrowRight,
  CaretRight,
  Handbag,
  Heart,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import styles from "./shopMerchantSystem.module.css";

const SIZING_VIDEO_SRC =
  "/media/partner-landing/merchant-network/one-photo-sizing/one-photo-sizing-european-omni-box-only-720p-v2.mp4";
const SIZING_POSTER_SRC =
  "/media/partner-landing/merchant-network/one-photo-sizing/one-photo-sizing-storyboard-european-v2.png";
const INFLUENCER_IMAGE_SRC =
  "/media/global-shop/merchant-system/merchant-influencer-editorial-v1.png";
const SUPPLIER_IMAGE_SRC =
  "/media/global-shop/merchant-system/supplier-apparel-box-v1.webp";
const WOMENS_COLLECTION_IMAGE_SRC =
  "/media/global-shop/merchant-system/womens-collection-landscape-v2.webp";

const visualSlots = [
  {
    key: "sizing",
    number: "01",
    title: "AI sizing + try-on",
    description: "Body fit, garment and virtual try-on visual",
    className: styles.sizingPlaceholder,
    ariaLabel: "AI sizing and try-on video",
  },
  {
    key: "store",
    number: "02",
    title: "Merchant store",
    description: "Storefront, products and merchant dashboard visual",
    className: styles.storePlaceholder,
    ariaLabel: "Merchant store image",
  },
  {
    key: "suppliers",
    number: "03",
    title: "Suppliers",
    description: "Catalog, sourcing and product flow visual",
    className: styles.suppliersPlaceholder,
    ariaLabel: "Supplier image",
  },
  {
    key: "influencer",
    number: "04",
    title: "Creator",
    description: "Creator and shoppable content visual",
    className: styles.influencerPlaceholder,
    ariaLabel: "Creator image",
  },
] as const;

export function ShopMerchantSystemSection() {
  return (
    <section
      id="merchant-system"
      className={styles.section}
      aria-labelledby="shop-merchant-title"
    >
      <div className={styles.shell}>
        <div className={styles.heroGrid}>
          <aside className={styles.sideNote} aria-label="Merchant system">
            <span className={styles.sideMarker} aria-hidden="true" />
            <p className={styles.kicker}>Merchants</p>
            <strong>Built for your store</strong>
            <span>Connect your catalog</span>
            <span>Size with AI</span>
            <span>Connect with creators</span>
          </aside>

          <div className={styles.mainCopy}>
            <h2 id="shop-merchant-title">
              <span className={styles.titleLead}>
                Have a store?
                <span className={styles.titleArrowGroup} aria-hidden="true">
                  <ArrowRight weight="bold" />
                  <CaretRight weight="bold" />
                </span>
              </span>
              <span className={styles.titleMiddle}>Join the Global Shopping Network</span>
              <span className={styles.titleEnd}>
                <em>powering</em> every look.
              </span>
            </h2>
          </div>

          <div className={styles.pitch}>
            <p>
              <strong>Connect your catalog to PrimeStyleAI.</strong> Add estimated
              AI sizing and illustrative virtual try-on, connect with suppliers
              and Creators, and place your products inside the{" "}
                <span className={styles.completeLook}>
                  &ldquo;Complete the Look&rdquo; feature
                </span>
                {`. Shoppers continue to your checkout, and you remain the seller of record.`}
            </p>
            <Link href="/merchants">
              Learn more <ArrowRight size={17} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div
          className={styles.placeholderGrid}
          aria-label="PrimeStyleAI merchant network"
        >
          {visualSlots.map((slot) => (
            <article
              key={slot.key}
              className={`${styles.placeholder} ${slot.className}`}
              aria-label={slot.ariaLabel}
            >
              {slot.key === "sizing" ? (
                <video
                  className={styles.slotVideo}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={SIZING_POSTER_SRC}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <source
                    src={SIZING_VIDEO_SRC}
                    type="video/mp4"
                    media="(prefers-reduced-motion: no-preference)"
                  />
                </video>
              ) : null}
              {slot.key === "influencer" ? (
                <Image
                  className={styles.slotImage}
                  src={INFLUENCER_IMAGE_SRC}
                  alt=""
                  fill
                  sizes="(max-width: 720px) calc(100vw - 28px), 22vw"
                />
              ) : null}
              {slot.key === "suppliers" ? (
                <Image
                  className={`${styles.slotImage} ${styles.supplierImage}`}
                  src={SUPPLIER_IMAGE_SRC}
                  alt=""
                  fill
                  sizes="(max-width: 720px) calc(100vw - 28px), 18vw"
                  unoptimized
                />
              ) : null}
              {slot.key === "store" ? (
                <figure className={styles.storePreview} aria-hidden="true">
                  <header className={styles.storePreviewHeader}>
                    <Image
                      src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp"
                      alt=""
                      width={32}
                      height={26}
                    />
                    <nav>
                      <span>Women</span>
                      <span>Men</span>
                      <span>New arrivals</span>
                    </nav>
                    <div className={styles.storePreviewTools}>
                      <MagnifyingGlass />
                      <Heart />
                      <Handbag />
                    </div>
                  </header>

                  <div className={styles.storePreviewHero}>
                    <div className={styles.storePreviewCopy}>
                      <small>New season · Modern tailoring</small>
                      <strong>
                        Fresh &amp;
                        <span>Styled</span>
                      </strong>
                      <em>Shop the edit ↗</em>
                    </div>
                    <Image
                      className={styles.storePreviewModel}
                      src="/media/partner-landing/merchant-network/store-example/example-store-hero-model.webp"
                      alt=""
                      fill
                      sizes="(max-width: 720px) 100vw, 24vw"
                    />
                  </div>

                  <div className={styles.storePreviewCollections}>
                    <div>
                      <Image
                        src="/media/partner-landing/merchant-network/store-example/example-store-mens-collection.webp"
                        alt=""
                        fill
                        sizes="(max-width: 720px) 50vw, 12vw"
                      />
                      <span>Men&apos;s collection</span>
                    </div>
                    <div>
                      <Image
                        src={WOMENS_COLLECTION_IMAGE_SRC}
                        alt=""
                        fill
                        sizes="(max-width: 720px) 50vw, 22vw"
                        unoptimized
                      />
                      <span>Women&apos;s collection</span>
                    </div>
                  </div>
                </figure>
              ) : null}
              <span className={styles.placeholderNumber}>{slot.number}</span>
              <div>
                <strong>{slot.title}</strong>
                <span>{slot.description}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
