import {
  ArrowUpRight,
  Handbag,
  Heart,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import Image from "next/image";
import styles from "./merchantStoreExample.module.css";

const collections = [
  {
    id: "store-example-men",
    title: "Men's",
    image: "/media/partner-landing/merchant-network/store-example/example-store-mens-collection.webp",
    alt: "Male model wearing a dark oxblood patterned tailoring look",
    detail: "Modern tailoring with a confident point of view.",
  },
  {
    id: "store-example-women",
    title: "Women's",
    image: "/media/partner-landing/merchant-network/store-example/example-store-womens-collection.webp",
    alt: "Female model wearing a sculptural coral occasion dress",
    detail: "Polished silhouettes made for every arrival.",
  },
] as const;

export function MerchantStoreExampleSection() {
  return (
    <section
      id="store-example"
      className={styles.section}
      aria-labelledby="store-example-title"
    >
      <div className={styles.sectionHeading}>
        <p>03 · Store example</p>
        <span>One possible storefront, powered by PrimeStyleAI</span>
      </div>

      <div className={styles.storeWindow}>
        <header className={styles.storeHeader} aria-label="Example store navigation">
          <a className={styles.brand} href="#store-example" aria-label="Example store home">
            <Image
              src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp"
              alt=""
              width={42}
              height={34}
              aria-hidden="true"
            />
          </a>

          <nav aria-label="Store collections">
            <a href="#store-example-women">Women</a>
            <a href="#store-example-men">Men</a>
            <a href="#store-example-categories">New arrivals</a>
            <a href="#store-example-categories">The edit</a>
          </nav>

          <div className={styles.storeTools}>
            <a href="#store-example-categories" aria-label="Search the example store">
              <MagnifyingGlass size={18} weight="regular" />
            </a>
            <a href="#store-example-categories" aria-label="View saved pieces">
              <Heart size={18} weight="regular" />
            </a>
            <a href="#store-example-categories" aria-label="View shopping bag">
              <Handbag size={18} weight="regular" />
              <span>0</span>
            </a>
          </div>
        </header>

        <div className={styles.storeHero}>
          <div className={styles.welcomeRow}>
            <span>Hello, Brooklyn.</span>
            <span>A storefront made for your brand.</span>
          </div>

          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>New season · Modern tailoring</p>
            <h2 id="store-example-title">
              Fresh &amp;
              <span>
                <Image
                  src="/media/partner-landing/merchant-network/store-example/example-store-womens-collection.webp"
                  alt=""
                  width={110}
                  height={110}
                  aria-hidden="true"
                />
                Styled
              </span>
            </h2>
            <div className={styles.heroActionRow}>
              <p>Your gateway to confident, contemporary dressing.</p>
              <a href="#store-example-categories">
                Shop the edit
                <ArrowUpRight size={16} weight="bold" />
              </a>
            </div>
          </div>

          <figure className={styles.heroVisual}>
            <Image
              src="/media/partner-landing/merchant-network/store-example/example-store-hero-model.webp"
              alt="Male model in a black shirt, brown tailored trousers, sunglasses, and a wide-brim hat"
              fill
              sizes="(max-width: 720px) 92vw, 48vw"
              unoptimized
            />
          </figure>

          <span className={styles.scrollNote}>Scroll to shop</span>
        </div>

        <div id="store-example-categories" className={styles.collectionGrid}>
          {collections.map((collection) => (
            <a
              key={collection.id}
              id={collection.id}
              className={styles.collectionCard}
              href="#ai-fitting"
            >
              <div className={styles.collectionImage}>
                <Image
                  src={collection.image}
                  alt={collection.alt}
                  fill
                  sizes="(max-width: 720px) 44vw, 19vw"
                  unoptimized
                />
              </div>
              <div className={styles.collectionCopy}>
                <strong>{collection.title}</strong>
                <span>Collection</span>
                <p>{collection.detail}</p>
              </div>
              <ArrowUpRight className={styles.collectionArrow} size={18} weight="bold" />
            </a>
          ))}

          <a className={styles.viewAll} href="#ai-fitting" aria-label="View the full example collection">
            <ArrowUpRight size={24} weight="bold" />
          </a>
        </div>
      </div>
    </section>
  );
}
