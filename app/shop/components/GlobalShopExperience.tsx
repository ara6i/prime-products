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
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { InfluencerFooter } from "../../partner-landing/influencer/components/InfluencerFooter";
import { getCategoryHref } from "../category/mappers/categoryCatalog.mapper";
import { ShopRunwayExperience } from "../runway/components/ShopRunwayExperience";
import styles from "./globalShop.module.css";

type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: "Women" | "Men" | "Denim" | "Accessories";
  image: string;
  tone: string;
  note: string;
};

const products: Product[] = [
  {
    id: "vela-denim",
    name: "Vela Cropped Denim",
    brand: "Northline",
    price: 148,
    category: "Denim",
    image: "/media/global-shop/product-denim-blonde-3d.webp",
    tone: "Indigo / Ivory",
    note: "AI fit ready",
  },
  {
    id: "aero-tee",
    name: "Cobalt Track Set",
    brand: "Assembly 01",
    price: 72,
    category: "Men",
    image: "/media/global-shop/product-cobalt-3d.webp",
    tone: "Cobalt / Ivory",
    note: "4 creator looks",
  },
  {
    id: "cobalt-set",
    name: "Noir Halo Blazer",
    brand: "Onda Studio",
    price: 164,
    category: "Women",
    image: "/media/global-shop/product-coral-black-3d.webp",
    tone: "Black / Coral",
    note: "Trending now",
  },
  {
    id: "orange-shell",
    name: "Signal Sport Shell",
    brand: "Rove Athletics",
    price: 198,
    category: "Women",
    image: "/media/global-shop/product-coral-redhead-3d.webp",
    tone: "Signal coral",
    note: "Virtual try-on",
  },
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

const categories = ["All", "Women", "Men", "Denim", "Accessories"] as const;

const featuredBrands = [
  {
    id: "nike",
    label: "Nike",
    logo: "/media/global-shop/brand-logos/nike.svg",
  },
  {
    id: "adidas",
    label: "adidas",
    logo: "/media/global-shop/brand-logos/adidas.svg",
  },
  {
    id: "ganni",
    label: "GANNI",
    logo: "/media/global-shop/brand-logos/ganni.svg",
  },
  {
    id: "new-balance",
    label: "New Balance",
    logo: "/media/global-shop/brand-logos/new-balance.svg",
  },
  {
    id: "reiss",
    label: "Reiss",
    logo: "/media/global-shop/brand-logos/reiss.svg",
  },
  {
    id: "aritzia",
    label: "Aritzia",
    logo: "/media/global-shop/brand-logos/aritzia.svg",
  },
] as const;

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
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [bagCount, setBagCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedBag, setSelectedBag] = useState<(typeof bagLooks)[number]>(
    bagLooks[0],
  );
  const [mood, setMood] = useState<(typeof moods)[number]>("Everyday");
  const [stylistReady, setStylistReady] = useState(false);
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

  function addToBag() {
    setBagCount((count) => count + 1);
    setCartOpen(true);
  }

  function openCategoryPage(nextCategory: Product["category"]) {
    router.push(getCategoryHref(nextCategory));
    setMenuOpen(false);
  }

  function openBrandPage(brandId: string) {
    router.push(`/shop/brand/${brandId}`);
    setMenuOpen(false);
  }

  return (
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
          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <List size={22} />}
          </button>
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

        {menuOpen ? (
          <nav className={styles.mobileNav} aria-label="Mobile shop navigation">
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
        ) : null}
      </header>

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
        bagCount={bagCount}
        onAddToBag={addToBag}
        onOpenCart={() => setCartOpen(true)}
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
                  onClick={addToBag}
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
              <button type="button" onClick={() => scrollTo("outfit-edit")}>
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
              <button type="button" onClick={() => scrollTo("outfit-edit")}>
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
            <div className={styles.stylistLookRail}>
              {products.slice(0, 4).map((product) => (
                <article key={product.id}>
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
                </article>
              ))}
            </div>
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
          <span>03 · Connected brands</span>
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
            One global shop for established labels, emerging studios, and
            merchant collections—all ready for personalized discovery.
          </p>
        </div>
        <div className={styles.brandRail} aria-label="Featured brands">
          {featuredBrands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              aria-label={`Shop ${brand.label}`}
              onClick={() => openBrandPage(brand.id)}
            >
              <Image
                src={brand.logo}
                alt=""
                width={180}
                height={58}
                unoptimized
              />
            </button>
          ))}
        </div>
        <div className={styles.brandStories}>
          <article>
            <Image
              src="/media/global-shop/product-cobalt-3d.webp"
              alt="Assembly 01 cobalt seasonal menswear"
              fill
              sizes="50vw"
            />
            <div>
              <span>Assembly 01</span>
              <h3>The essential, rebuilt.</h3>
              <button
                type="button"
                onClick={() => openBrandPage("assembly-01")}
              >
                Explore brand <ArrowUpRight size={15} />
              </button>
            </div>
          </article>
          <article>
            <Image
              src="/media/global-shop/product-denim-blonde-3d.webp"
              alt="Northline dimensional denim collection"
              fill
              sizes="50vw"
            />
            <div>
              <span>Northline</span>
              <h3>A new language of denim.</h3>
              <button type="button" onClick={() => openBrandPage("northline")}>
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

      {cartOpen ? (
        <div
          className={styles.cartScrim}
          role="presentation"
          onMouseDown={() => setCartOpen(false)}
        >
          <aside
            className={styles.cartDrawer}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div>
              <h2>Your bag</h2>
              <button
                type="button"
                aria-label="Close shopping bag"
                onClick={() => setCartOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            {bagCount === 0 ? (
              <p>Your bag is ready for something personal.</p>
            ) : (
              <div className={styles.cartSuccess}>
                <Check size={24} weight="bold" />
                <h3>
                  {bagCount} {bagCount === 1 ? "piece" : "pieces"} in your bag
                </h3>
                <p>
                  Your fit profile and virtual try-on will be available before
                  checkout.
                </p>
              </div>
            )}
            <button type="button" onClick={() => setCartOpen(false)}>
              {bagCount ? "Review bag" : "Keep shopping"}
            </button>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
