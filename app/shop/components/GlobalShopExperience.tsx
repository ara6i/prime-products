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
  UserCircle,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useCallback, useMemo, useRef, useState } from "react";
import { InfluencerFooter } from "../../partner-landing/influencer/components/InfluencerFooter";
import { shopBrandProfiles } from "../brand/data/brandProfiles.data";
import { dailyEditProducts } from "../data/dailyEdit.data";
import { useShopNavigation } from "../hooks/useShopNavigation";
import { useShopBag } from "../bag/useShopBag";
import { ShopRunwayExperience } from "../runway/components/ShopRunwayExperience";
import { ShopMenuNavigation } from "./ShopMenuNavigation";
import type {
  GlobalShopCategoryFilter,
  GlobalShopProduct,
} from "../types/globalShop.types";
import styles from "./globalShop.module.css";

const products: GlobalShopProduct[] = [
  ...dailyEditProducts,
  {
    id: "lavender-set",
    name: "Lilac Volume Jacket",
    brand: "Mara & Form",
    price: 188,
    category: "Women",
    image: "/media/global-shop/product-lilac-lime-3d.webp",
    tone: "Soft lilac",
    note: "Styled by AI",
  },
  {
    id: "cobalt-bag",
    name: "Form 02 Handbag",
    brand: "Mara & Form",
    price: 119,
    category: "Accessories",
    image: "/media/global-shop/stylist-cobalt-3d.webp",
    tone: "Cobalt",
    note: "3 outfit matches",
  },
  {
    id: "coral-bag",
    name: "Arc Mini Bag",
    brand: "Mara & Form",
    price: 96,
    category: "Accessories",
    image: "/media/global-shop/stylist-coral-3d.webp",
    tone: "Coral",
    note: "New arrival",
  },
  {
    id: "ice-streetwear",
    name: "Cloudline Layer Set",
    brand: "Afterglow",
    price: 132,
    category: "Women",
    image: "/media/global-shop/product-camel-3d.webp",
    tone: "Camel / Black",
    note: "Creator favorite",
  },
];

const categories: GlobalShopCategoryFilter[] = [
  "All",
  "Women",
  "Men",
  "Denim",
  "Accessories",
];

const featuredBrands = shopBrandProfiles.slice(0, 6);

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
  const [mood, setMood] = useState<(typeof moods)[number]>("Everyday");
  const [stylistReady, setStylistReady] = useState(false);
  const closeNavigation = useCallback(() => setMenuOpen(false), []);
  const { aiStylistHref, openBrandPage, openCategoryPage } = useShopNavigation({
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
          <button type="button" onClick={() => openCategoryPage("Women")}>
            Women
          </button>
          <button type="button" onClick={() => openCategoryPage("Men")}>
            Men
          </button>
          <button type="button" onClick={() => openCategoryPage("Denim")}>
            Denim
          </button>
          <button type="button" onClick={() => scrollTo("ai-stylist")}>
            AI Stylist
          </button>
          <button type="button" onClick={() => scrollTo("brands")}>
            Brands
          </button>
        </nav>

        <div className={styles.headerActions}>
          <button
            type="button"
            aria-label="Search products"
            onClick={() => setSearchOpen((open) => !open)}
          >
            <MagnifyingGlass size={20} weight="regular" />
          </button>
          <button
            type="button"
            className={styles.profileAction}
            aria-label="Account"
          >
            <UserCircle size={21} weight="regular" />
          </button>
          <button
            type="button"
            className={styles.bagAction}
            aria-label={`Shopping bag with ${bagCount} items`}
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
          <Dialog.Title className={styles.menuAccessibleTitle}>PrimeStyleAI site menu</Dialog.Title>
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
            <span className={styles.menuLogo} role="img" aria-label="PrimeStyleAI — Shopping Network">
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
                <span className={styles.menuLogoTagline}>Shopping Network</span>
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

          <nav className={styles.menuUtilityLinks} aria-label="Shop utilities">
            <button
              type="button"
              onClick={() => closeMenuThen(() => setCartOpen(true))}
            >
              Bag <span>[ {bagCount} ]</span>
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
        <div className={styles.heroHeadline}>
          <p>PrimeStyleAI global shop · One network, every style</p>
          <h1 id="shop-hero-title">FEEL THE VIBES</h1>
        </div>
        <div className={styles.heroModelBreakout} aria-hidden="true">
          <Image
            src="/media/global-shop/hero-model-cutout-3d.webp"
            alt=""
            width={1024}
            height={1536}
            priority
            unoptimized
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
          <h2>Fashion that already knows your next move.</h2>
          <p>
            Discover connected brands, build a look with your AI stylist, and
            shop the size made for you.
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

      <ShopRunwayExperience
        onOpenCategory={openCategoryPage}
      />

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
            Products from connected merchants, selected around your style and
            ready for fit, try-on, and complete-look discovery.
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
            return (
              <article className={styles.productCard} key={product.id}>
                <div className={styles.productImage}>
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 700px) 82vw, (max-width: 1100px) 44vw, 24vw"
                  />
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
                  <h3>{product.name}</h3>
                  <div>
                    <span>{product.tone}</span>
                    <strong>${product.price}</strong>
                  </div>
                </div>
                <button
                  className={styles.addButton}
                  type="button"
                  onClick={() => addToBag(product)}
                  aria-label={`Add ${product.name} to bag`}
                >
                  Add to bag <Plus size={16} />
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
              <span>New Spring AI Edit</span>
              <h2 id="stylist-title">Simply</h2>
              <b>/FASHION</b>
              <p>
                Step into a world where fashion speaks your language. Build a
                complete look around your taste, fit, and the products you love.
              </p>
              <Link
                className={styles.stylistPrimaryAction}
                href={aiStylistHref}
                prefetch={false}
              >
                Build my outfit <ArrowUpRight size={15} />
              </Link>
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
              <strong>450K</strong>
              <span>style combinations</span>
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
              <h3>We build the perfect outfit to match your identity.</h3>
              <p>
                Your stylist reads color, silhouette, occasion, fit, and live
                products from connected brands—then turns them into one complete
                shoppable look.
              </p>
              <Link
                className={styles.stylistEditorialAction}
                href="/shop/dressing-room"
              >
                Create my look <ArrowRight size={14} />
              </Link>
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

          <div className={styles.stylistRunway} id="outfit-edit">
            <header>
              <h3>
                Runway Ready
                <br />
                Your Daily Edit
              </h3>
              <p>
                {mood} pieces chosen to work together, fit together, and shop
                together.
              </p>
              <div className={styles.moodTabs} aria-label="Outfit mood">
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
              </div>
            </header>
            <nav className={styles.stylistLookRail} aria-label="Daily Edit products">
              {dailyEditProducts.map((product) => (
                <article key={product.id}>
                  <Link href={`/shop/product/${product.id}`} aria-label={`View ${product.name}`}>
                    <div>
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 760px) 72vw, 22vw"
                      />
                    </div>
                    <span>{product.note}</span>
                    <h4>{product.name}</h4>
                    <p>
                      {product.brand} · ${product.price}
                    </p>
                    <small className={styles.dailyEditProductLink}>
                      View product <ArrowUpRight size={14} aria-hidden="true" />
                    </small>
                  </Link>
                </article>
              ))}
            </nav>
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
          <span>03 · Imported brand collections</span>
          <h2 id="brands-title">
            THE NAMES
            <br />
            YOU KNOW.
            <br />
            <i>
              AND THE ONES
              <br />
              YOU&apos;LL DISCOVER.
            </i>
          </h2>
          <p>
            Real brand names from products already imported through Trendsi,
            organized for clean and personalized discovery.
          </p>
        </div>
        <div className={styles.brandRail} aria-label="Featured imported brands">
          {featuredBrands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              aria-label={`Shop ${brand.name}`}
              onClick={() => openBrandPage(brand.id)}
            >
              {brand.logo ? (
                <Image
                  src={brand.logo}
                  alt={`${brand.name} logo`}
                  width={180}
                  height={58}
                  unoptimized
                />
              ) : (
                <strong>{brand.shortName}</strong>
              )}
            </button>
          ))}
        </div>
        <div className={styles.brandStories}>
          <article>
            <Image
              src="/media/global-shop/brand-campaigns/judy-blue-denim-sculpture-v1.png"
              alt="Judy Blue denim campaign concept: two women in blue jeans beside an oversized sculptural denim cuff"
              fill
              sizes="(max-width: 760px) 92vw, 46vw"
              quality={90}
            />
            <div>
              <span>Judy Blue</span>
              <h3>Denim made for every body.</h3>
              <button type="button" onClick={() => openBrandPage("judy-blue")}>
                Explore brand <ArrowUpRight size={15} />
              </button>
            </div>
          </article>
          <article>
            <Image
              src="/media/global-shop/brand-campaigns/zenana-soft-sculpture-v2.png"
              alt="Zenana comfortwear campaign concept: two women in soft neutral lounge layers beside a sculptural knitted cuff"
              fill
              sizes="(max-width: 760px) 92vw, 46vw"
              quality={90}
            />
            <div>
              <span>Zenana</span>
              <h3>Everyday comfort, refined.</h3>
              <button type="button" onClick={() => openBrandPage("zenana")}>
                Explore brand <ArrowUpRight size={15} />
              </button>
            </div>
          </article>
        </div>
      </section>

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
