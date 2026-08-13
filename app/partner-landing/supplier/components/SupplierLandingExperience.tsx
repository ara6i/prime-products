"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Buildings,
  ChartLineUp,
  Check,
  GlobeSimple,
  List,
  Package,
  Play,
  ShoppingBagOpen,
  Sparkle,
  Storefront,
  Truck,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useLandingNavigation } from "../../hooks/useLandingNavigation";
import styles from "./supplierLanding.module.css";

const journeySteps = [
  {
    number: "01",
    eyebrow: "Supplier profile",
    title: "Publish the collection merchants need.",
    copy: "Share verified products, pricing, MOQs, stock, lead times, shipping regions, and the selling models you support.",
  },
  {
    number: "02",
    eyebrow: "Merchant discovery",
    title: "Get discovered by the right buyers.",
    copy: "Retailers, boutiques, ecommerce teams, and dropship sellers can find, save, and shortlist your styles.",
  },
  {
    number: "03",
    eyebrow: "Samples + quotes",
    title: "Move from interest to a real conversation.",
    copy: "Receive sample requests, quote enquiries, and merchant questions in one connected workflow.",
  },
  {
    number: "04",
    eyebrow: "Orders + reorders",
    title: "Turn approved products into repeat business.",
    copy: "Manage wholesale and dropship orders while keeping availability and fulfillment expectations visible.",
  },
] as const;

function PrimeStyleBrand() {
  return (
    <span className={styles.brandLockup}>
      <Image
        src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
        alt=""
        width={256}
        height={256}
        sizes="42px"
        quality={90}
      />
      <span>Prime Style AI</span>
    </span>
  );
}

function SupplierHeader({
  mobileMenuOpen,
  onMenuClose,
  onMenuToggle,
  onSectionSelect,
}: {
  mobileMenuOpen: boolean;
  onMenuClose: () => void;
  onMenuToggle: () => void;
  onSectionSelect: (id: string) => void;
}) {
  return (
    <header className={styles.header}>
      <Link
        href="/"
        className={styles.logoLink}
        aria-label="Prime Style AI home"
      >
        <PrimeStyleBrand />
      </Link>

      <nav className={styles.desktopNav} aria-label="Supplier navigation">
        <button
          type="button"
          onClick={() => onSectionSelect("merchant-network")}
        >
          Merchant network
        </button>
        <button type="button" onClick={() => onSectionSelect("how-it-works")}>
          How it works
        </button>
        <button type="button" onClick={() => onSectionSelect("selling-models")}>
          Ways to sell
        </button>
        <button type="button" onClick={() => onSectionSelect("creator-demand")}>
          Creator demand
        </button>
      </nav>

      <div className={styles.headerActions}>
        <Link href="/suppliers/dashboard" className={styles.signIn}>
          Sign in
        </Link>
        <Link href="/suppliers/dashboard" className={styles.headerCta}>
          Join the network
          <ArrowUpRight size={15} weight="bold" />
        </Link>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuToggle}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={23} /> : <List size={23} />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <nav
          className={styles.mobileNav}
          aria-label="Mobile supplier navigation"
        >
          <button
            type="button"
            onClick={() => onSectionSelect("merchant-network")}
          >
            Merchant network
          </button>
          <button type="button" onClick={() => onSectionSelect("how-it-works")}>
            How it works
          </button>
          <button
            type="button"
            onClick={() => onSectionSelect("selling-models")}
          >
            Ways to sell
          </button>
          <button
            type="button"
            onClick={() => onSectionSelect("creator-demand")}
          >
            Creator demand
          </button>
          <Link href="/suppliers/dashboard" onClick={onMenuClose}>
            Sign in
          </Link>
          <Link
            href="/suppliers/dashboard"
            className={styles.mobileCta}
            onClick={onMenuClose}
          >
            Join the supplier network
            <ArrowRight size={17} weight="bold" />
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

function NetworkFlow() {
  return (
    <div
      className={styles.networkFlow}
      aria-label="Supplier to merchant to order flow"
    >
      <div className={styles.flowNode}>
        <span className={styles.flowIcon}>
          <Buildings size={19} />
        </span>
        <span>Suppliers</span>
      </div>
      <span className={styles.flowLine} aria-hidden="true" />
      <div className={styles.flowNode}>
        <span className={styles.flowIcon}>
          <Storefront size={19} />
        </span>
        <span>Merchants</span>
      </div>
      <span className={styles.flowLine} aria-hidden="true" />
      <div className={styles.flowNode}>
        <span className={styles.flowIcon}>
          <ShoppingBagOpen size={19} />
        </span>
        <span>Orders</span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className={styles.hero} id="merchant-network">
      <span className={styles.heroMonogram} aria-hidden="true">
        PS
      </span>
      <div className={styles.heroMedia}>
        <Image
          src="/media/partner-landing/supplier/supplier-merchant-hero.png"
          alt="Fashion supplier collection prepared for merchant discovery"
          fill
          preload
          quality={90}
          sizes="(max-width: 900px) 100vw, 61vw"
          className={styles.coverImage}
        />
        <div className={styles.productTag}>
          <span className={styles.productTagLabel}>Mint puffer</span>
          <span>Ready for merchant discovery</span>
          <Check size={15} weight="bold" />
        </div>
      </div>

      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>Supplier × merchant network</p>
        <h1>
          Meet the merchants <br />
          ready to sell <em>your collection.</em>
        </h1>
        <p className={styles.heroCopy}>
          PrimeStyleAI connects fashion suppliers and manufacturers with
          retailers, boutiques, ecommerce merchants, and dropship sellers ready
          to source, sample, and sell.
        </p>
        <div className={styles.heroActions}>
          <Link href="/suppliers/dashboard" className={styles.primaryButton}>
            Join the supplier network
            <span className={styles.buttonIcon}>
              <ArrowRight size={17} weight="bold" />
            </span>
          </Link>
          <Link href="/suppliers/dashboard" className={styles.textButton}>
            Meet the merchant network
            <span className={styles.playIcon}>
              <Play size={12} weight="fill" />
            </span>
          </Link>
        </div>
        <NetworkFlow />
      </div>
    </section>
  );
}

function ProfilePreview() {
  return (
    <div className={styles.profilePreview}>
      <div className={styles.profilePreviewTop}>
        <span className={styles.profileBadge}>
          <Check size={13} weight="bold" /> Verified supplier
        </span>
        <span>AW26</span>
      </div>
      <div className={styles.profileProduct}>
        <span className={styles.miniGarment}>
          <Package size={35} weight="thin" />
        </span>
        <div>
          <strong>Quilted outerwear</strong>
          <span>48 styles · Global shipping</span>
        </div>
      </div>
      <div className={styles.profileFacts}>
        <span>Wholesale</span>
        <span>Dropship</span>
        <span>Samples</span>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className={styles.journeySection} id="how-it-works">
      <div className={styles.sectionIntro}>
        <p className={styles.sectionNumber}>01</p>
        <h2>
          From discovery <br />
          <em>to a merchant relationship.</em>
        </h2>
        <p>
          A clear path from a qualified supplier profile to the samples, quotes,
          orders, and reorders that grow the relationship.
        </p>
        <Link href="/suppliers/dashboard" className={styles.primaryButton}>
          Meet the merchant network
          <span className={styles.buttonIcon}>
            <ArrowRight size={17} weight="bold" />
          </span>
        </Link>
      </div>

      <div className={styles.journeyGrid}>
        <article className={`${styles.journeyCard} ${styles.profileCard}`}>
          <div className={styles.cardHeading}>
            <span>{journeySteps[0].number}</span>
            <p>{journeySteps[0].eyebrow}</p>
          </div>
          <h3>{journeySteps[0].title}</h3>
          <p>{journeySteps[0].copy}</p>
          <ProfilePreview />
        </article>

        <article className={`${styles.journeyCard} ${styles.photoCard}`}>
          <div className={styles.photoFrame}>
            <Image
              src="/media/partner-landing/supplier/merchant-discovery.png"
              alt="Boutique merchant reviewing a supplier collection"
              fill
              quality={90}
              sizes="(max-width: 720px) 100vw, 36vw"
              className={styles.coverImage}
            />
          </div>
          <div className={styles.photoCardCopy}>
            <div className={styles.cardHeading}>
              <span>{journeySteps[1].number}</span>
              <p>{journeySteps[1].eyebrow}</p>
            </div>
            <h3>{journeySteps[1].title}</h3>
            <p>{journeySteps[1].copy}</p>
          </div>
        </article>

        <article className={`${styles.journeyCard} ${styles.photoCard}`}>
          <div className={styles.photoFrame}>
            <Image
              src="/media/partner-landing/supplier/samples-quotes.png"
              alt="Fashion sample package with garments and material swatches"
              fill
              quality={90}
              sizes="(max-width: 720px) 100vw, 36vw"
              className={styles.coverImage}
            />
          </div>
          <div className={styles.photoCardCopy}>
            <div className={styles.cardHeading}>
              <span>{journeySteps[2].number}</span>
              <p>{journeySteps[2].eyebrow}</p>
            </div>
            <h3>{journeySteps[2].title}</h3>
            <p>{journeySteps[2].copy}</p>
          </div>
        </article>

        <article className={`${styles.journeyCard} ${styles.photoCard}`}>
          <div className={styles.photoFrame}>
            <Image
              src="/media/partner-landing/supplier/orders-reorders.png"
              alt="Boutique owner preparing a supplier collection for customers"
              fill
              quality={90}
              sizes="(max-width: 720px) 100vw, 36vw"
              className={styles.coverImage}
            />
            <span className={styles.orderPill}>
              <ChartLineUp size={17} /> Orders return to you
            </span>
          </div>
          <div className={styles.photoCardCopy}>
            <div className={styles.cardHeading}>
              <span>{journeySteps[3].number}</span>
              <p>{journeySteps[3].eyebrow}</p>
            </div>
            <h3>{journeySteps[3].title}</h3>
            <p>{journeySteps[3].copy}</p>
          </div>
        </article>
      </div>
    </section>
  );
}

function SellingModels() {
  return (
    <section className={styles.sellingSection} id="selling-models">
      <div className={styles.sellingHeading}>
        <div>
          <p className={styles.sectionNumber}>02</p>
          <h2>
            One collection. <br />
            <em>More merchant opportunities.</em>
          </h2>
        </div>
        <p>
          You decide which commercial models each collection supports. Merchants
          can then approach you through the route that fits their business.
        </p>
      </div>

      <div className={styles.sellingGrid}>
        <article className={`${styles.sellingCard} ${styles.wholesaleCard}`}>
          <div className={styles.sellingCardTop}>
            <span className={styles.sellingIcon}>
              <Buildings size={24} />
            </span>
            <span className={styles.modeTag}>Core channel</span>
          </div>
          <h3>Bulk wholesale</h3>
          <p>
            Sell volume to retailers and boutiques with clear MOQs, tiered
            pricing, samples, lead times, and reorder terms.
          </p>
          <ul>
            <li>
              <Check size={15} weight="bold" /> Retailer and boutique discovery
            </li>
            <li>
              <Check size={15} weight="bold" /> Sample and quote requests
            </li>
            <li>
              <Check size={15} weight="bold" /> Purchase orders and reorders
            </li>
          </ul>
          <div className={styles.channelMark}>
            <span>MOQ</span>
            <ArrowRight size={18} />
            <span>Merchant order</span>
          </div>
        </article>

        <article className={`${styles.sellingCard} ${styles.dropshipCard}`}>
          <div className={styles.sellingCardTop}>
            <span className={styles.sellingIcon}>
              <Truck size={24} />
            </span>
            <span className={styles.modeTag}>Flexible channel</span>
          </div>
          <h3>Dropship</h3>
          <p>
            Let approved merchants list selected products while you fulfill
            individual customer orders from available stock.
          </p>
          <ul>
            <li>
              <Check size={15} weight="bold" /> Merchant-ready product details
            </li>
            <li>
              <Check size={15} weight="bold" /> Inventory and shipping
              expectations
            </li>
            <li>
              <Check size={15} weight="bold" /> Orders routed to your workflow
            </li>
          </ul>
          <div className={styles.channelMark}>
            <span>1 unit</span>
            <ArrowRight size={18} />
            <span>Fulfilled by you</span>
          </div>
        </article>

        <article className={`${styles.sellingCard} ${styles.directCard}`}>
          <div className={styles.directIcon}>
            <GlobeSimple size={25} />
          </div>
          <div>
            <span className={styles.modeTag}>Optional channel</span>
            <h3>Direct-to-consumer</h3>
            <p>
              Activate selected products for direct sales and add matched
              creator campaigns when you want consumer demand around the
              collection.
            </p>
          </div>
          <ArrowUpRight size={22} />
        </article>
      </div>
    </section>
  );
}

function CreatorDemand() {
  return (
    <section className={styles.creatorSection} id="creator-demand">
      <div className={styles.creatorCopy}>
        <p className={styles.sectionNumber}>03</p>
        <span className={styles.optionalLabel}>
          <Sparkle size={15} weight="fill" /> Optional DTC layer
        </span>
        <h2>
          Add creator demand <br />
          <em>when it supports the sale.</em>
        </h2>
        <p className={styles.creatorLead}>
          PrimeStyleAI can connect your selected products with relevant fashion
          creators. You choose what to activate; content helps generate demand
          and attributed orders come back to you.
        </p>
        <div className={styles.creatorSteps}>
          <div>
            <span>1</span>
            <p>
              <strong>Choose products</strong>Activate only the styles you want
              creators to feature.
            </p>
          </div>
          <div>
            <span>2</span>
            <p>
              <strong>Connect with creators</strong>Review matched creators and
              start the right partnership.
            </p>
          </div>
          <div>
            <span>3</span>
            <p>
              <strong>Track the result</strong>See content-led demand and
              attributed orders.
            </p>
          </div>
        </div>
        <Link href="/suppliers/dashboard" className={styles.darkButton}>
          Add creators to my growth plan
          <ArrowRight size={17} weight="bold" />
        </Link>
      </div>

      <div className={styles.creatorMedia}>
        <Image
          src="/media/partner-landing/supplier/creator-demand.png"
          alt="Fashion creator filming a supplier product"
          fill
          quality={90}
          sizes="(max-width: 900px) 100vw, 50vw"
          className={styles.coverImage}
        />
        <div className={styles.creatorOverlay}>
          <span>
            <UsersThree size={18} /> Creator connection
          </span>
          <strong>Selected by you</strong>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={styles.finalCta}>
      <div>
        <p>Ready for better distribution?</p>
        <h2>
          Put your collection in front of <br />
          <em>merchants ready to sell it.</em>
        </h2>
      </div>
      <Link href="/suppliers/dashboard" className={styles.primaryButton}>
        Join the supplier network
        <span className={styles.buttonIcon}>
          <ArrowRight size={17} weight="bold" />
        </span>
      </Link>
    </section>
  );
}

function SupplierFooter({
  onSectionSelect,
}: {
  onSectionSelect: (id: string) => void;
}) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <Link
          href="/"
          className={styles.footerLogoLink}
          aria-label="Prime Style AI home"
        >
          <PrimeStyleBrand />
        </Link>
        <p>
          One connected fashion network for suppliers, merchants, and creators.
        </p>
      </div>
      <nav aria-label="Supplier footer">
        <button type="button" onClick={() => onSectionSelect("how-it-works")}>
          How it works
        </button>
        <Link href="/merchants">For merchants</Link>
        <Link href="/influencers">For creators</Link>
        <Link href="/suppliers/dashboard">Supplier dashboard</Link>
      </nav>
      <p className={styles.copyright}>
        © {new Date().getFullYear()} PrimeStyleAI
      </p>
    </footer>
  );
}

export function SupplierLandingExperience() {
  const navigation = useLandingNavigation();

  return (
    <div className={styles.page} data-audience="supplier">
      <SupplierHeader
        mobileMenuOpen={navigation.mobileMenuOpen}
        onMenuClose={navigation.closeMobileMenu}
        onMenuToggle={navigation.toggleMobileMenu}
        onSectionSelect={navigation.scrollToSection}
      />
      <main>
        <Hero />
        <HowItWorks />
        <SellingModels />
        <CreatorDemand />
        <FinalCta />
      </main>
      <SupplierFooter onSectionSelect={navigation.scrollToSection} />
    </div>
  );
}
