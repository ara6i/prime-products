import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/app/shared/components/ui/button";
import type { BrandEditorialViewModel } from "../types/brandCatalog.types";
import { formatBrandPrice } from "../utils/brandCatalog.utils";
import styles from "./brandCatalog.module.css";

interface BrandEditorialLandingProps {
  viewModel: BrandEditorialViewModel;
  activeCategories: string[];
  onCategorySelect: (category: string | null) => void;
}

export function BrandEditorialLanding({
  viewModel,
  activeCategories,
  onCategorySelect,
}: BrandEditorialLandingProps) {
  const {
    assets,
    catalog,
    categoryCards,
    droppedProducts,
    promoStories,
    newsStories,
  } = viewModel;

  return (
    <>
      <section className={styles.brandMasthead} aria-label={catalog.name}>
        <h1 className={styles.srOnly}>{catalog.name}</h1>
        <div className={styles.brandMastheadLogo}>
          {catalog.logo ? (
            <Image
              src={catalog.logo}
              alt={`${catalog.name} logo`}
              width={520}
              height={160}
              sizes="(max-width: 47.5rem) 70vw, 32vw"
              loading="eager"
              unoptimized={
                catalog.logo.startsWith("http") || catalog.logo.endsWith(".svg")
              }
            />
          ) : (
            <strong>{catalog.shortName}</strong>
          )}
        </div>
      </section>

      <section className={styles.droppedSection} aria-labelledby="just-dropped">
        <header className={styles.editorialHeader}>
          <p>{catalog.name} / The new collection</p>
          <h2 id="just-dropped">Just dropped</h2>
          <nav aria-label="New collection categories">
            <Link href="#collection">New in</Link>
            <Link href="/shop/category/men">Men</Link>
            <Link href="/shop/category/women">Women</Link>
            <Link href="/shop/category/accessories">Accessories</Link>
          </nav>
        </header>
      </section>

      <section
        className={styles.shopByCategory}
        aria-labelledby="shop-by-category-title"
      >
        <header className={styles.categoryHeader}>
          <div>
            <span>Browse the merchant edit</span>
            <h2 id="shop-by-category-title">Shop by category</h2>
          </div>
          <Button
            className={styles.categoryViewAll}
            type="button"
            variant="ghost"
            onClick={() => onCategorySelect(null)}
          >
            View all
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </header>

        <div className={styles.categoryRail}>
          {categoryCards.map((category) => {
            const meta =
              category.meta ??
              (typeof category.count === "number"
                ? `${category.count} styles`
                : "Explore");
            const selected = category.value
              ? activeCategories.includes(category.value)
              : !category.href && activeCategories.length === 0;
            const content = (
              <>
                <span
                  className={styles.categoryImage}
                  data-fit={category.imageFit ?? "contain"}
                >
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="(max-width: 47.5rem) 24vw, 8vw"
                    unoptimized={category.image.startsWith("http")}
                  />
                </span>
                <span className={styles.categoryLabel}>{category.label}</span>
                <small>{meta}</small>
              </>
            );

            if (category.href) {
              return (
                <Link
                  className={styles.categoryCard}
                  key={category.label}
                  href={category.href}
                  aria-label={`Shop ${category.label}. ${meta}`}
                >
                  {content}
                </Link>
              );
            }

            return (
              <Button
                className={styles.categoryCard}
                key={category.label}
                type="button"
                variant="ghost"
                aria-pressed={selected}
                aria-label={`Shop ${category.label}. ${meta}`}
                onClick={() => onCategorySelect(category.value)}
              >
                {content}
              </Button>
            );
          })}
        </div>
      </section>

      <section
        className={styles.droppedMediaSection}
        aria-label={`${catalog.name} just dropped collection`}
      >
        <div className={styles.droppedImage}>
          <Image
            src={assets.dropped}
            alt="Four adults styled in colorful contemporary fashion"
            fill
            sizes="100vw"
          />
        </div>
        <div className={styles.droppedCards}>
          {droppedProducts.map(({ product, eyebrow }) => (
            <Link key={product.id} href={`/shop/product/${product.id}`}>
              <span>{eyebrow}</span>
              <strong>{product.name}</strong>
              <small>{formatBrandPrice(product.price)}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.genderStory} aria-label="Shop women and men">
        <Image
          src={assets.gender}
          alt="Fashion collage featuring women and men in modern neutral outfits"
          fill
          sizes="100vw"
          loading="eager"
        />
        <Link className={styles.womenStory} href="/shop/category/women">
          Women
        </Link>
        <Link className={styles.menStory} href="/shop/category/men">
          Men
        </Link>
      </section>

      <section className={styles.promoSection} aria-label="Seasonal edits">
        <div className={styles.promoImage}>
          <Image
            src={assets.promos}
            alt="Sunglasses, activewear, and handbag fashion editorials"
            fill
            sizes="100vw"
          />
        </div>
        <div className={styles.promoLinks}>
          {promoStories.map((story) => (
            <Link key={story.title} href={story.href}>
              <small>{story.eyebrow}</small>
              <strong>{story.title}</strong>
              <span>Shop the edit</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.newsSection} aria-labelledby="our-news">
        <h2 id="our-news">Our news</h2>
        <div className={styles.newsImage}>
          <Image
            src={assets.news}
            alt="Coastal, city travel, and winter fashion stories"
            fill
            sizes="100vw"
          />
        </div>
        <div className={styles.newsLinks}>
          {newsStories.map((story) => (
            <Link key={story.title} href={story.href}>
              <small>{story.eyebrow}</small>
              <strong>{story.title}</strong>
              <span>Read story</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
