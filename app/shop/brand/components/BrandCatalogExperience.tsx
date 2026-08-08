"use client";

import {
  CaretDown,
  Check,
  Handbag,
  List,
  MagnifyingGlass,
  Minus,
  Plus,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveBrandFilters,
  BrandCatalog,
  BrandProduct,
  BrandSortId,
} from "../types/brandCatalog.types";
import styles from "./brandCatalog.module.css";

type BrandCatalogExperienceProps = {
  catalog: BrandCatalog;
};

const emptyFilters: ActiveBrandFilters = {
  categories: [],
  seasons: [],
  colors: [],
  sizes: [],
  price: "all",
};

const colorValues: Record<string, string> = {
  Black: "#111111",
  Camel: "#b3926f",
  Cobalt: "#2453d4",
  Coral: "#f05d49",
  "Ice blue": "#c9dce9",
  Lilac: "#c8afe8",
  White: "#f3f2ed",
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BrandCatalogExperience({
  catalog,
}: BrandCatalogExperienceProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortId, setSortId] = useState<BrandSortId>("popular");
  const [filters, setFilters] = useState<ActiveBrandFilters>(emptyFilters);
  const [visibleCount, setVisibleCount] = useState(9);
  const productGridRef = useRef<HTMLDivElement>(null);
  const pendingCardRects = useRef<Map<string, DOMRect> | null>(null);

  const options = useMemo(
    () => ({
      categories: unique(catalog.products.map((product) => product.category)),
      categoryCounts: Object.fromEntries(
        unique(catalog.products.map((product) => product.category)).map(
          (category) => [
            category,
            catalog.products.filter((product) => product.category === category)
              .length,
          ],
        ),
      ),
      seasons: unique(catalog.products.map((product) => product.season)),
      colors: unique(catalog.products.map((product) => product.color)),
      sizes: unique(catalog.products.flatMap((product) => product.sizes)),
    }),
    [catalog.products],
  );

  const products = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = catalog.products.filter((product) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${product.name} ${product.category} ${product.color}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory =
        filters.categories.length === 0 ||
        filters.categories.includes(product.category);
      const matchesSeason =
        filters.seasons.length === 0 ||
        filters.seasons.includes(product.season);
      const matchesColor =
        filters.colors.length === 0 || filters.colors.includes(product.color);
      const matchesSize =
        filters.sizes.length === 0 ||
        filters.sizes.some((size) => product.sizes.includes(size));
      const matchesPrice =
        filters.price === "all" ||
        (filters.price === "under-125" && product.price < 125) ||
        (filters.price === "125-175" &&
          product.price >= 125 &&
          product.price <= 175) ||
        (filters.price === "over-175" && product.price > 175);

      return (
        matchesQuery &&
        matchesCategory &&
        matchesSeason &&
        matchesColor &&
        matchesSize &&
        matchesPrice
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortId === "price-low") return a.price - b.price;
      if (sortId === "price-high") return b.price - a.price;
      if (sortId === "newest") {
        return (
          Number(Boolean(b.badge === "NEW")) -
          Number(Boolean(a.badge === "NEW"))
        );
      }
      return b.popularity - a.popularity;
    });
  }, [catalog.products, filters, searchQuery, sortId]);

  const activeFilterCount =
    filters.categories.length +
    filters.seasons.length +
    filters.colors.length +
    filters.sizes.length +
    Number(filters.price !== "all");

  useLayoutEffect(() => {
    const firstRects = pendingCardRects.current;
    const grid = productGridRef.current;
    if (!firstRects || !grid) return;

    pendingCardRects.current = null;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    grid
      .querySelectorAll<HTMLElement>("[data-brand-product-card]")
      .forEach((card) => {
        const productId = card.dataset.productId;
        const first = productId ? firstRects.get(productId) : undefined;
        if (!first) return;

        const last = card.getBoundingClientRect();
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        const scaleX = first.width / last.width;
        const scaleY = first.height / last.height;

        card.animate(
          [
            {
              transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
              transformOrigin: "top left",
            },
            {
              transform: "translate(0, 0) scale(1, 1)",
              transformOrigin: "top left",
            },
          ],
          {
            duration: 560,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );
      });
  }, [filterOpen]);

  function toggleFilterPanel() {
    const grid = productGridRef.current;
    if (grid) {
      pendingCardRects.current = new Map(
        Array.from(
          grid.querySelectorAll<HTMLElement>("[data-brand-product-card]"),
        ).map((card) => [
          card.dataset.productId ?? "",
          card.getBoundingClientRect(),
        ]),
      );
    }
    setFilterOpen((open) => !open);
  }

  function toggleFilter(
    group: "categories" | "seasons" | "colors" | "sizes",
    value: string,
  ) {
    setFilters((current) => {
      const values = current[group];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [group]: nextValues };
    });
    setVisibleCount(9);
  }

  return (
    <main className={styles.page}>
      <div className={styles.canvas}>
        <BrandHeader
          catalog={catalog}
          bagCount={0}
          menuOpen={menuOpen}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          onMenuToggle={() => setMenuOpen((open) => !open)}
          onSearchToggle={() => setSearchOpen((open) => !open)}
          onSearchChange={setSearchQuery}
        />

        <section className={styles.catalog} aria-labelledby="brand-edit-title">
          <header className={styles.catalogHeader}>
            <div>
              <p>{catalog.descriptor}</p>
              <h1 id="brand-edit-title">{catalog.name} Edit</h1>
            </div>
            <nav aria-label="Breadcrumb">
              <Link href="/shop">Home</Link>
              <span>/</span>
              <Link href="/shop#brands">Brands</Link>
              <span>/</span>
              <b>{catalog.name}</b>
            </nav>
          </header>

          <div className={styles.catalogControls}>
            <button
              className={styles.filterToggle}
              type="button"
              aria-expanded={filterOpen}
              onClick={toggleFilterPanel}
            >
              {filterOpen ? <Minus size={13} /> : <Plus size={13} />}
              Filter
              {activeFilterCount > 0 ? <b>{activeFilterCount}</b> : null}
            </button>
            <label className={styles.sortControl}>
              <span>Sort by:</span>
              <select
                value={sortId}
                onChange={(event) =>
                  setSortId(event.target.value as BrandSortId)
                }
              >
                <option value="popular">Popular</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>

          <div
            className={`${styles.catalogLayout} ${filterOpen ? styles.filtersOpen : ""}`}
          >
            <BrandFilterPanel
              filters={filters}
              options={options}
              newCount={
                catalog.products.filter((product) => product.badge === "NEW")
                  .length
              }
              saleCount={
                catalog.products.filter((product) => product.badge === "SALE")
                  .length
              }
              onToggle={toggleFilter}
              onPriceChange={(price) =>
                setFilters((current) => ({ ...current, price }))
              }
              onClear={() => setFilters(emptyFilters)}
            />

            <div className={styles.productsArea}>
              {products.length > 0 ? (
                <div
                  ref={productGridRef}
                  className={styles.productGrid}
                  aria-live="polite"
                >
                  {products.slice(0, visibleCount).map((product, index) => (
                    <BrandProductCard
                      key={product.id}
                      product={product}
                      priority={index < 6}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <strong>No pieces match those filters.</strong>
                  <button
                    type="button"
                    onClick={() => setFilters(emptyFilters)}
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {products.length > visibleCount ? (
                <button
                  className={styles.showMore}
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 3)}
                >
                  Show more <span>›</span>
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type HeaderProps = {
  catalog: BrandCatalog;
  bagCount: number;
  menuOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  onMenuToggle: () => void;
  onSearchToggle: () => void;
  onSearchChange: (value: string) => void;
};

function BrandHeader({
  catalog,
  bagCount,
  menuOpen,
  searchOpen,
  searchQuery,
  onMenuToggle,
  onSearchToggle,
  onSearchChange,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <Link
        className={styles.brandMark}
        href="/shop"
        aria-label="PrimeStyleAI shop home"
      >
        {catalog.logo ? (
          <Image
            className={styles.officialBrandLogo}
            src={catalog.logo}
            alt={`${catalog.name} logo`}
            width={130}
            height={44}
            priority
            unoptimized
          />
        ) : (
          <>
            <Image
              src="/media/partner-landing/primestyleai-new-mark.png"
              alt=""
              width={42}
              height={42}
              priority
            />
            <span>{catalog.shortName}</span>
          </>
        )}
      </Link>

      <nav className={styles.desktopNavigation} aria-label="Shop navigation">
        <Link href="/shop/category/men">Men</Link>
        <Link href="/shop/category/women">Women</Link>
        <Link href="/shop/category/denim">Denim</Link>
        <Link href="/shop/category/accessories">Accessories</Link>
        <Link href="/shop#brands">Brands</Link>
      </nav>

      <div className={styles.headerActions}>
        {searchOpen ? (
          <label className={styles.searchField}>
            <MagnifyingGlass size={15} />
            <span className={styles.srOnly}>Search {catalog.name}</span>
            <input
              autoFocus
              type="search"
              value={searchQuery}
              placeholder="Search"
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={onSearchToggle}
            >
              <X size={15} />
            </button>
          </label>
        ) : (
          <button type="button" onClick={onSearchToggle}>
            <MagnifyingGlass size={15} /> Search
          </button>
        )}
        <button
          type="button"
          aria-label={`Shopping bag with ${bagCount} ${bagCount === 1 ? "item" : "items"}`}
        >
          <Handbag size={16} /> My bag ({bagCount})
        </button>
        <button
          className={styles.menuButton}
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={onMenuToggle}
        >
          {menuOpen ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {menuOpen ? (
        <nav
          className={styles.mobileNavigation}
          aria-label="Mobile shop navigation"
        >
          <Link href="/shop/category/men">Men</Link>
          <Link href="/shop/category/women">Women</Link>
          <Link href="/shop/category/denim">Denim</Link>
          <Link href="/shop/category/accessories">Accessories</Link>
          <Link href="/shop#brands">Brands</Link>
        </nav>
      ) : null}
    </header>
  );
}

type FilterPanelProps = {
  filters: ActiveBrandFilters;
  options: {
    categories: string[];
    categoryCounts: Record<string, number>;
    seasons: string[];
    colors: string[];
    sizes: string[];
  };
  newCount: number;
  saleCount: number;
  onToggle: (
    group: "categories" | "seasons" | "colors" | "sizes",
    value: string,
  ) => void;
  onPriceChange: (price: ActiveBrandFilters["price"]) => void;
  onClear: () => void;
};

function BrandFilterPanel({
  filters,
  options,
  newCount,
  saleCount,
  onToggle,
  onPriceChange,
  onClear,
}: FilterPanelProps) {
  return (
    <aside className={styles.filterPanel} aria-label="Filter brand products">
      <div className={styles.quickFilters}>
        <button type="button">
          New items <span>({newCount})</span>
        </button>
        <button type="button">
          Sell-out <span>({saleCount})</span>
        </button>
      </div>

      <FilterGroup title="Categories">
        <div className={styles.categoryOptions}>
          {options.categories.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filters.categories.includes(option)}
              onClick={() => onToggle("categories", option)}
            >
              {option} <span>({options.categoryCounts[option]})</span>
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Season">
        <div className={styles.checkboxGrid}>
          {options.seasons.map((option) => (
            <label key={option}>
              <input
                type="checkbox"
                checked={filters.seasons.includes(option)}
                onChange={() => onToggle("seasons", option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Color">
        <div className={styles.colorGrid}>
          {options.colors.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={`Filter by ${option}`}
              aria-pressed={filters.colors.includes(option)}
              style={{ backgroundColor: colorValues[option] ?? "#ddd" }}
              onClick={() => onToggle("colors", option)}
            >
              {filters.colors.includes(option) ? (
                <Check size={10} weight="bold" />
              ) : null}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Size">
        <div className={styles.sizeGrid}>
          {options.sizes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filters.sizes.includes(option)}
              onClick={() => onToggle("sizes", option)}
            >
              {option}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Price">
        <div className={styles.priceOptions}>
          {(
            [
              ["all", "All prices"],
              ["under-125", "Under $125"],
              ["125-175", "$125 – $175"],
              ["over-175", "$175+"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="brand-price"
                checked={filters.price === value}
                onChange={() => onPriceChange(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <button className={styles.clearFilters} type="button" onClick={onClear}>
        Clear all filters
      </button>
    </aside>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.filterGroup}>
      <header>
        <span>{title}</span>
        <CaretDown size={12} />
      </header>
      {children}
    </section>
  );
}

function BrandProductCard({
  product,
  priority = false,
}: {
  product: BrandProduct;
  priority?: boolean;
}) {
  return (
    <article
      className={styles.productCard}
      data-brand-product-card
      data-product-id={product.id}
    >
      <Link
        href={`/shop/product/${product.id}`}
        aria-label={`View ${product.name}`}
      >
        <span className={styles.productImage}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 760px) 44vw, (max-width: 1050px) 38vw, 290px"
            priority={priority}
          />
          {product.badge ? <b>{product.badge}</b> : null}
        </span>
        <span className={styles.productCopy}>
          <strong>{product.name}</strong>
          <span>
            {product.originalPrice ? (
              <s>{money(product.originalPrice)}</s>
            ) : null}
            {money(product.price)}
          </span>
        </span>
      </Link>
    </article>
  );
}
