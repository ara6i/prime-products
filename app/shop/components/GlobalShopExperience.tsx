"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Handbag,
  Heart,
  List,
  MagnifyingGlass,
  Plus,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useCallback, useMemo, useRef, useState } from "react";
import { InfluencerFooter } from "../../partner-landing/influencer/components/InfluencerFooter";
import influencerStyles from "../../partner-landing/influencer/components/influencerLanding.module.css";
import { MerchantPdpSdkSection } from "../../partner-landing/merchant/components/MerchantPdpSdkSection";
import { dailyEditProducts } from "../data/dailyEdit.data";
import {
  SHOWCASE_PRODUCTS,
  showcaseAsset,
} from "../data/showcaseCatalog.data";
import { useShopNavigation } from "../hooks/useShopNavigation";
import { useShopBag } from "../bag/useShopBag";
import { ShopRunwayExperience } from "../runway/components/ShopRunwayExperience";
import { ShopMenuNavigation } from "./ShopMenuNavigation";
import { ShopCreatorHero } from "./ShopCreatorHero";
import { ShopAIStylistScenarioSection } from "./ShopAIStylistScenarioSection";
import { ShopMerchantSystemSection } from "./ShopMerchantSystemSection";
import { ShopSupplierNetworkSection } from "./ShopSupplierNetworkSection";
import type {
  GlobalShopCategoryFilter,
  GlobalShopProduct,
} from "../types/globalShop.types";
import styles from "./globalShop.module.css";

const products: GlobalShopProduct[] = dailyEditProducts;

const categories: GlobalShopCategoryFilter[] = [
  "All",
  "Women",
  "Men",
  "Accessories",
];

const catalogHighlightIds = [
  "women-camel-pinstripe-tailored-blazer",
  "women-chocolate-tailored-trouser",
  "women-oxblood-leather-slingback-pump",
  "men-espresso-double-breasted-blazer",
  "men-charcoal-pleated-trouser",
  "men-chocolate-suede-court-sneaker",
] as const;

const catalogHighlights = catalogHighlightIds.map((id) => {
  const product = SHOWCASE_PRODUCTS.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`Missing Shop catalog highlight ${id}`);
  return product;
});

const bagLooks = [
  {
    id: "lavender",
    name: "Lavender mini",
    price: 119,
    image: "/media/global-shop/outfit-builder-lavender-model.webp",
    color: "#b989e8",
  },
  {
    id: "coral",
    name: "Coral mini",
    price: 96,
    image: "/media/global-shop/outfit-builder-coral-model.webp",
    color: "#ff6756",
  },
] as const;

const moods = ["Everyday", "Statement", "Weekend"] as const;
const GOOGLE_BOOKING_URL = "https://calendar.app.google/4LeitboKs5KzemWL7";

export function GlobalShopExperience() {
  const [menuOpen, setMenuOpen] = useState(false);
  const afterMenuClose = useRef<(() => void) | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<GlobalShopCategoryFilter>("All");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const { bagCount, add: addProductToBag, setOpen: setCartOpen } = useShopBag();
  const [selectedBag, setSelectedBag] = useState<(typeof bagLooks)[number]>(
    bagLooks[0],
  );
  const openCreatorLanding = useCallback(() => {
    window.location.assign("https://creators.primestyleai.com");
  }, []);
  const [mood, setMood] = useState<(typeof moods)[number]>("Everyday");
  const [stylistReady, setStylistReady] = useState(false);
  const closeNavigation = useCallback(() => setMenuOpen(false), []);
  const { openCategoryPage } = useShopNavigation({
    onNavigate: closeNavigation,
  });

  function closeMenuThen(action: () => void) {
    afterMenuClose.current = action;
    closeNavigation();
  }

  const filteredProducts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;
      const matchesSearch =
        normalized.length === 0 ||
        `${product.name} ${product.brand} ${product.category}`
          .toLowerCase()
          .includes(normalized);
      return matchesCategory && matchesSearch;
    });
  }, [category, searchTerm]);

  function scrollTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  }

  function toggleFavorite(id: string) {
    setFavoriteIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function addToBag(product: GlobalShopProduct) {
    addProductToBag({
      productId: product.id,
      name: product.name,
      brandName: product.brand,
      image: product.image,
      href: product.href,
      size: "",
      color: product.tone,
      priceCents: Math.round(product.price * 100),
      currency: "USD",
    });
  }

  return (
    <Dialog.Root
      open={menuOpen}
      onOpenChange={(open) => {
        if (open) afterMenuClose.current = null;
        setMenuOpen(open);
      }}
    >
      <main className={styles.page}>
        <header className={styles.header}>
          <Link
            className={styles.brand}
            href="/shop"
            aria-label="PrimeStyleAI shop home"
          >
            <Image
              src="/media/partner-landing/primestyleai-new-mark.png"
              alt="PrimeStyleAI"
              width={1254}
              height={1254}
              sizes="38px"
              priority
            />
            <span>
              <strong>PrimeStyleAI</strong>
              <small>Global shop</small>
            </span>
          </Link>

          <nav className={styles.desktopNav} aria-label="Shop navigation">
            <Link href="/shop/category/women">Women</Link>
            <Link href="/shop/category/men">Men</Link>
            <Link href="/influencers">For Creators</Link>
            <Link href="/merchants">For Merchants</Link>
            <Link href="/suppliers">
              For Suppliers
            </Link>
          </nav>

          <div className={styles.headerActions}>
            <a
              className={styles.headerDemoLink}
              href={GOOGLE_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Opens in a new tab"
            >
              Schedule a Demo
              <ArrowUpRight size={15} weight="bold" />
            </a>
            <button
              type="button"
              className={styles.bagAction}
              aria-label={`Saved look with ${bagCount} items`}
              onClick={() => setCartOpen(true)}
            >
              <Handbag size={20} weight="regular" />
              <span>{bagCount}</span>
            </button>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className={styles.menuButton}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setSearchOpen(false)}
              >
                {menuOpen ? <X size={22} /> : <List size={22} />}
              </button>
            </Dialog.Trigger>
          </div>

          {searchOpen ? (
            <div className={styles.searchBar}>
              <MagnifyingGlass size={18} />
              <input
                autoFocus
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search products, brands, categories"
                aria-label="Search the global shop"
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          ) : null}
        </header>

        <Dialog.Portal>
          <Dialog.Overlay className={styles.menuSplash} />
          <Dialog.Content
            className={styles.menuOverlay}
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              const action = afterMenuClose.current;
              afterMenuClose.current = null;
              if (action) {
                event.preventDefault();
                action();
              }
            }}
          >
            <Dialog.Title className={styles.menuAccessibleTitle}>
              PrimeStyleAI site menu
            </Dialog.Title>
            <button
              type="button"
              className={styles.menuClose}
              aria-label="Close menu"
              onClick={closeNavigation}
            >
              <X size={48} weight="thin" />
            </button>

            <Link
              className={styles.menuWordmark}
              href="/shop"
              aria-label="PrimeStyleAI shop home"
              target="_blank"
              rel="noopener noreferrer"
              title="Opens in a new tab"
              prefetch={false}
            >
              <span
                className={styles.menuLogo}
                role="img"
                aria-label="PrimeStyleAI — Shopping Network"
              >
                <span className={styles.menuLogoMark} aria-hidden="true">
                  <Image
                    src="/media/partner-landing/primestyleai-new-mark.png"
                    alt=""
                    width={1254}
                    height={1254}
                    sizes="(max-width: 760px) 120px, 230px"
                    quality={90}
                    loading="eager"
                  />
                </span>
                <span className={styles.menuLogoText} aria-hidden="true">
                  <span className={styles.menuLogoName}>PrimeStyleAI</span>
                  <span className={styles.menuLogoTagline}>
                    Shopping Network
                  </span>
                </span>
              </span>
            </Link>

            <div className={styles.menuSearchUtility}>
              <button
                type="button"
                onClick={() => closeMenuThen(() => setSearchOpen(true))}
              >
                Search
              </button>
            </div>

            <nav
              className={styles.menuUtilityLinks}
              aria-label="Shop utilities"
            >
              <button
                type="button"
                onClick={() => closeMenuThen(() => setCartOpen(true))}
              >
                Saved look <span>[ {bagCount} ]</span>
              </button>
              <Link
                href="/customer/login"
                target="_blank"
                rel="noopener noreferrer"
                title="Opens in a new tab"
                prefetch={false}
              >
                Log in
              </Link>
              <a href="mailto:support@primestyleai.com">Help</a>
            </nav>

            <ShopMenuNavigation />
          </Dialog.Content>
        </Dialog.Portal>

        <section className={styles.hero} aria-labelledby="shop-hero-title">
          <div
            className={styles.demoBanner}
            role="note"
            aria-label="Demo site launching soon"
          >
            <div className={styles.demoBannerCopy}>
              <div className={styles.demoBannerStatus}>
                <span>Demo site</span>
                <strong>Launching soon</strong>
              </div>
              <p>Preview the network today, then book a guided walkthrough.</p>
            </div>
          </div>
          <div className={styles.heroHeadline}>
            <p>PrimeStyleAI Global Shopping Network · One network, every style</p>
            <h1 id="shop-hero-title">FEEL THE VIBES</h1>
          </div>
          <div className={styles.heroModelBreakout} aria-hidden="true">
            <Image
              src="/media/global-shop/hero-model-cutout-3d.webp"
              alt=""
              width={1024}
              height={1536}
              sizes="(max-width: 760px) 120vw, 40vw"
              priority
            />
          </div>
          <div className={styles.heroTicker} aria-hidden="true">
            <div className={styles.tickerSide}>
              <span>TRY THE LOOK</span>
              <Sparkle size={15} weight="fill" />
              <span>SIZE WITH AI</span>
            </div>
            <i className={styles.tickerModelGap} />
            <div className={styles.tickerSide}>
              <span>STYLE THE LOOK</span>
              <Sparkle size={15} weight="fill" />
              <span>SHOP THE NETWORK</span>
            </div>
          </div>
          <div className={styles.heroMedia} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <span>New season · Curated across the network</span>
            <h2>Fashion, styled around you.</h2>
            <p>
              Discover new pieces, build a look with your AI stylist, and find
              the size made for you.
            </p>
            <div>
              <button type="button" onClick={() => openCategoryPage("Women")}>
                Shop the edit <ArrowUpRight size={15} />
              </button>
              <button type="button" onClick={() => scrollTo("ai-stylist")}>
                Style me with AI
              </button>
            </div>
          </div>
          <button
            className={styles.heroSpot}
            type="button"
            onClick={() => openCategoryPage("Women")}
          >
            <span>Editor&apos;s pick</span>
            <strong>Sunset utility</strong>
            <ArrowUpRight size={16} />
          </button>
        </section>

        <ShopAIStylistScenarioSection />

        <MerchantPdpSdkSection productUrl="/shop#ai-fitting" />

        <ShopRunwayExperience onOpenCategory={openCategoryPage} />

        <section
          className={styles.arrivals}
          id="shop-edit"
          aria-labelledby="arrival-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <span>01 · Shop the network</span>
              <h2 id="arrival-title">New arrivals, made personal.</h2>
            </div>
            <p>
              New pieces selected around your style and ready for fit, try-on,
              and complete-look discovery.
            </p>
          </div>

          <div
            className={styles.categoryTabs}
            role="tablist"
            aria-label="Product categories"
          >
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                onClick={() => {
                  if (item === "All") setCategory("All");
                  else openCategoryPage(item);
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div className={styles.productGrid}>
            {filteredProducts.slice(0, 4).map((product) => {
              const favorite = favoriteIds.includes(product.id);
              const productImage = (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 700px) 82vw, (max-width: 1100px) 44vw, 24vw"
                />
              );
              return (
                <article className={styles.productCard} key={product.id}>
                  <div className={styles.productImage}>
                    {product.href ? (
                      <Link
                        className={styles.productImageLink}
                        href={product.href}
                        aria-label={`View ${product.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Opens in a new tab"
                        prefetch={false}
                      >
                        {productImage}
                      </Link>
                    ) : (
                      productImage
                    )}
                    <button
                      type="button"
                      className={favorite ? styles.favoriteActive : ""}
                      aria-label={
                        favorite
                          ? `Remove ${product.name} from favorites`
                          : `Add ${product.name} to favorites`
                      }
                      onClick={() => toggleFavorite(product.id)}
                    >
                      <Heart size={19} weight={favorite ? "fill" : "regular"} />
                    </button>
                    <span>{product.note}</span>
                  </div>
                  <div className={styles.productMeta}>
                    <p>{product.brand}</p>
                    <h3>
                      {product.href ? (
                        <Link
                          href={product.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Opens in a new tab"
                          prefetch={false}
                        >
                          {product.name}
                        </Link>
                      ) : (
                        product.name
                      )}
                    </h3>
                    <div>
                      <span>{product.tone}</span>
                      <strong>${product.price}</strong>
                    </div>
                  </div>
                  <button
                    className={styles.addButton}
                    type="button"
                    onClick={() => addToBag(product)}
                    aria-label={`Save ${product.name} to your look`}
                  >
                    Save to look <Plus size={16} />
                  </button>
                </article>
              );
            })}
          </div>
          {filteredProducts.length === 0 ? (
            <p className={styles.emptyState}>
              No pieces match that search yet. Try another category or brand.
            </p>
          ) : null}
        </section>

        <section
          className={styles.stylistSection}
          id="ai-stylist"
          aria-labelledby="stylist-title"
        >
          <div className={styles.stylistFrame}>
            <div className={styles.stylistMiniNav}>
              <strong>
                <Sparkle size={16} weight="fill" /> PrimeStyleAI
              </strong>
              <nav aria-label="AI Stylist moods">
                {moods.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={mood === item}
                    onClick={() => {
                      setMood(item);
                      setStylistReady(false);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </nav>
              <span>AI OUTFIT BUILDER</span>
            </div>

            <div className={styles.stylistHero}>
              <div className={styles.stylistHeroCopy}>
                <span>Interactive AI Stylist demo</span>
                <h2 id="stylist-title">Simply</h2>
                <b>/FASHION</b>
                <p>
                  Step into a world where fashion speaks your language. Build a
                  complete look around your taste, fit, and the products you
                  love.
                </p>
                <button
                  type="button"
                  className={styles.stylistPrimaryAction}
                  onClick={() => scrollTo("ai-stylist-scenario")}
                >
                  Build my outfit <ArrowUpRight size={15} />
                </button>
              </div>
              <div className={styles.stylistHeroModel}>
                <Image
                  key={selectedBag.id}
                  src={selectedBag.image}
                  alt={`Purple editorial outfit styled with the ${selectedBag.name}`}
                  fill
                  unoptimized
                  sizes="(max-width: 760px) 100vw, 52vw"
                />
              </div>
              <div className={styles.stylistHeroMetric}>
                <strong>5</strong>
                <span>ready outfit ideas</span>
              </div>
              <h3 className={styles.stylistHeroWord}>
                Beyond
                <br />
                Elegance
              </h3>
              <div
                className={styles.stylistBagDots}
                aria-label="Change the hero bag"
              >
                {bagLooks.map((bag) => (
                  <button
                    key={bag.id}
                    type="button"
                    aria-label={`Style with ${bag.name}`}
                    aria-pressed={selectedBag.id === bag.id}
                    onClick={() => {
                      setSelectedBag(bag);
                      setStylistReady(false);
                    }}
                  >
                    <i style={{ backgroundColor: bag.color }} />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.stylistEditorial}>
              <figure className={styles.stylistEditorialLeft}>
                <Image
                  src="/media/global-shop/product-coral-redhead-3d.webp"
                  alt="Coral fashion look"
                  fill
                  sizes="180px"
                />
              </figure>
              <div className={styles.stylistEditorialCopy}>
                <span>02 · YOUR AI EDIT</span>
                <h3>We build complete looks around your style preferences.</h3>
                <p>
                  Your stylist reads color, silhouette, occasion, and fit—then
                  shapes every piece into one coordinated look.
                </p>
                <button
                  type="button"
                  className={styles.stylistEditorialAction}
                  onClick={() => scrollTo("ai-stylist-scenario")}
                >
                  Create my look <ArrowRight size={14} />
                </button>
              </div>
              <figure className={styles.stylistEditorialRight}>
                <Image
                  src="/media/global-shop/product-lilac-lime-3d.webp"
                  alt="Lilac and lime fashion look"
                  fill
                  sizes="180px"
                />
              </figure>
            </div>

            <div className={styles.stylistBuilderDock}>
              <div className={styles.stylistProducts}>
                <span>YOUR COMPLETE LOOK</span>
                <div>
                  <p>
                    <b>Lilac Volume Jacket</b>
                    <small>Mara & Form · $188</small>
                  </p>
                  <Check size={15} weight="bold" />
                </div>
                <div>
                  <p>
                    <b>Ivory Knit Mini</b>
                    <small>Northline · $124</small>
                  </p>
                  <Check size={15} weight="bold" />
                </div>
                <div>
                  <p>
                    <b>{selectedBag.name}</b>
                    <small>Mara & Form · ${selectedBag.price}</small>
                  </p>
                  <Check size={15} weight="bold" />
                </div>
              </div>
              <div className={styles.bagPicker}>
                <span>Choose the bag</span>
                <div>
                  {bagLooks.map((bag) => (
                    <button
                      key={bag.id}
                      type="button"
                      aria-label={`Style with ${bag.name}`}
                      aria-pressed={selectedBag.id === bag.id}
                      onClick={() => {
                        setSelectedBag(bag);
                        setStylistReady(false);
                      }}
                    >
                      <i style={{ backgroundColor: bag.color }} />
                      <span>{bag.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                className={styles.stylistCta}
                type="button"
                onClick={() => setStylistReady(true)}
              >
                {stylistReady ? (
                  <>
                    <Check size={17} weight="bold" /> Look saved to your fitting
                    room
                  </>
                ) : (
                  <>
                    Try this outfit <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <section
          className={styles.brandsSection}
          id="brands"
          aria-labelledby="brands-title"
        >
          <div className={styles.brandsTop}>
            <span>03 · Women’s and Men’s collections</span>
            <h2 id="brands-title">
              THE PIECES
              <br />
              IN YOUR
              <br />
              <i>
                PERSONAL
                <br />EDIT.
              </i>
            </h2>
            <p>
              Shop only the products already available in our Women’s and
              Men’s edits. Every piece opens its product page with the prepared
              sizing, try-on, and outfit demo.
            </p>
          </div>
          <div className={styles.catalogProductGrid}>
            {catalogHighlights.map((product) => (
              <article key={product.id}>
                <Link
                  href={`/shop/product/${product.id}`}
                  aria-label={`View ${product.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Opens in a new tab"
                  prefetch={false}
                >
                  <div className={styles.catalogProductImage}>
                    <Image
                      src={showcaseAsset(product, "03-model-front")}
                      alt={`${product.name} from the ${product.gender} edit`}
                      fill
                      sizes="(max-width: 760px) 86vw, (max-width: 1120px) 44vw, 30vw"
                    />
                  </div>
                  <span>{product.gender} · PrimeStyleAI Atelier</span>
                  <h3>{product.name}</h3>
                  <p>{product.color}</p>
                  <small>
                    View product <ArrowUpRight size={14} aria-hidden="true" />
                  </small>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <ShopMerchantSystemSection />

        <div className={influencerStyles.page} data-audience="influencer">
          <ShopCreatorHero onLearnMore={openCreatorLanding} />
        </div>

        <ShopSupplierNetworkSection />

        <section className={styles.finalCta}>
          <p>See it. Style it. Size it. Try it. Buy it.</p>
          <h2>
            Your whole fashion world,
            <br />
            finally connected.
          </h2>
          <button type="button" onClick={() => openCategoryPage("Women")}>
            Start shopping <ArrowRight size={17} />
          </button>
        </section>

        <div className={styles.shopFooterWrap}>
          <InfluencerFooter />
        </div>
      </main>
    </Dialog.Root>
  );
}
