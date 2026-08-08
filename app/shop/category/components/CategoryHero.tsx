import { ArrowUpRight } from "@phosphor-icons/react";
import Image from "next/image";
import type { CategoryCatalog } from "../types/categoryCatalog.types";
import styles from "./categoryCatalog.module.css";

type CategoryHeroProps = {
  catalog: CategoryCatalog;
  onShopEdit: () => void;
};

export function CategoryHero({ catalog, onShopEdit }: CategoryHeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="category-title">
      <div className={styles.heroHeading}>
        <p>{catalog.label.toUpperCase()} · CONNECTED CATEGORY</p>
        <h1 id="category-title">{catalog.seasonTitle}</h1>
      </div>
      <div className={styles.heroMedia}>
        <Image
          src={catalog.heroImage}
          alt={catalog.heroAlt}
          fill
          priority
          unoptimized={catalog.id === "denim"}
          sizes="(max-width: 760px) 100vw, 94vw"
          className={
            catalog.mobileHeroImage ? styles.heroDesktopImage : undefined
          }
          style={{ objectPosition: catalog.heroObjectPosition }}
        />
        {catalog.mobileHeroImage ? (
          <Image
            src={catalog.mobileHeroImage}
            alt={catalog.heroAlt}
            fill
            priority
            unoptimized
            sizes="100vw"
            className={styles.heroMobileImage}
          />
        ) : null}
        <div className={styles.heroCopy}>
          <span>Fresh designs.</span>
          <strong>Bold looks.</strong>
          <p>{catalog.intro}</p>
          <button type="button" onClick={onShopEdit}>
            Shop the edit <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
