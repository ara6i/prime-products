"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarBlank,
  CaretDown,
  ChartLineUp,
  CheckCircle,
  Clock,
  DotsThree,
  DownloadSimple,
  EnvelopeSimple,
  Funnel,
  GlobeHemisphereWest,
  InstagramLogo,
  LinkedinLogo,
  List,
  MagnifyingGlass,
  MapPin,
  Package,
  Plus,
  SlidersHorizontal,
  Storefront,
  UsersThree,
  YoutubeLogo,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { useLandingNavigation } from "../../hooks/useLandingNavigation";
import { usePartnerInterest } from "../../hooks/usePartnerInterest";
import { SupplierInterestDialog } from "./SupplierInterestDialog";
import styles from "./supplierLanding.module.css";

const ASSET_ROOT = "/media/partner-landing/supplier";

const SOCIAL_LINKS = [
  {
    href: "https://www.instagram.com/primestyleai/",
    label: "Instagram",
    Icon: InstagramLogo,
  },
  {
    href: "https://www.linkedin.com/company/primestyleai/posts/?feedView=all",
    label: "LinkedIn",
    Icon: LinkedinLogo,
  },
  {
    href: "https://www.youtube.com/@PrimeStyleAI",
    label: "YouTube",
    Icon: YoutubeLogo,
  },
] as const;

const DASHBOARD_PARTNERS = [
  "/images/landing/avatar-elena.png",
  "/images/landing/avatar-sarah.png",
  "/images/landing/avatar-david.png",
  "/images/landing/avatar-marcus.png",
] as const;

const DASHBOARD_ORDERS = [
  {
    id: "PS-427-012",
    partner: "Merchant partner A",
    fulfillment: "West region",
    amount: "$53,154.00",
    status: "Unsent",
    avatar: DASHBOARD_PARTNERS[0],
  },
  {
    id: "PS-426-001",
    partner: "Merchant partner B",
    fulfillment: "Northeast region",
    amount: "$27,114.00",
    status: "Review",
    avatar: DASHBOARD_PARTNERS[2],
  },
  {
    id: "PS-424-112",
    partner: "Merchant partner C",
    fulfillment: "Central region",
    amount: "$61,223.00",
    status: "Ready",
    avatar: DASHBOARD_PARTNERS[1],
  },
  {
    id: "PS-417-020",
    partner: "Merchant partner D",
    fulfillment: "South region",
    amount: "$7,311.00",
    status: "Draft",
    avatar: DASHBOARD_PARTNERS[3],
  },
] as const;

type SectionSelect = (id: string) => void;

function SupplierHeader({
  mobileMenuOpen,
  onMenuClose,
  onMenuToggle,
  onPrimaryAction,
  onSectionSelect,
}: {
  mobileMenuOpen: boolean;
  onMenuClose: () => void;
  onMenuToggle: () => void;
  onPrimaryAction: () => void;
  onSectionSelect: SectionSelect;
}) {
  return (
    <header className={styles.header}>
      <Link
        href="/suppliers"
        className={styles.logoLink}
        aria-label="PrimeStyleAI suppliers home"
      >
        <Image
          src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
          alt=""
          width={1254}
          height={1254}
          sizes="42px"
          priority
        />
        <span>PrimeStyleAI</span>
      </Link>

      <nav className={styles.desktopNav} aria-label="Supplier navigation">
        <Link href="/suppliers" aria-current="page">
          Suppliers
        </Link>
        <button type="button" onClick={() => onSectionSelect("global-network")}>
          Global network
        </button>
        <button type="button" onClick={() => onSectionSelect("merchants")}>
          Merchants
        </button>
        <button type="button" onClick={() => onSectionSelect("influencers")}>
          Creators
        </button>
        <button
          type="button"
          onClick={() => onSectionSelect("supplier-dashboard")}
        >
          Performance preview
        </button>
      </nav>

      <div className={styles.headerActions}>
        <button type="button" className={styles.headerCta} onClick={onPrimaryAction}>
          Join waitlist
        </button>
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
        <nav className={styles.mobileNav} aria-label="Mobile supplier navigation">
          <button type="button" onClick={() => onSectionSelect("global-network")}>
            Global network
          </button>
          <button type="button" onClick={() => onSectionSelect("merchants")}>
            Merchant connections
          </button>
          <button type="button" onClick={() => onSectionSelect("influencers")}>
            Creator partnerships
          </button>
          <button
            type="button"
            onClick={() => onSectionSelect("supplier-dashboard")}
          >
            Performance preview
          </button>
          <button
            type="button"
            className={styles.mobileCta}
            onClick={() => {
              onMenuClose();
              onPrimaryAction();
            }}
          >
            Join waitlist
          </button>
        </nav>
      ) : null}
    </header>
  );
}

function SupplierAsset({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 800px) 100vw, 92vw",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={`${ASSET_ROOT}/${src}`}
      alt={alt}
      width={1586}
      height={992}
      sizes={sizes}
      className={className}
      priority={priority}
      quality={90}
    />
  );
}

function Hero({ onPrimaryAction }: { onPrimaryAction: () => void }) {
  return (
    <section className={styles.hero} aria-labelledby="supplier-hero-title">
      <div className={styles.heroCanvas}>
        <div className={styles.heroMedia}>
          <SupplierAsset
            src="supplier-merchant-influencer-wide-cast-v4.png"
            alt="Individual merchant and Creator fashion figures arranged as a spacious editorial cast"
            className={styles.heroImage}
            priority
            sizes="(max-width: 800px) 100vw, 62vw"
          />
          <div className={styles.heroRoleLabels} aria-hidden="true">
            <span className={`${styles.heroRoleLabel} ${styles.merchantLabel}`}>
              Merchant
            </span>
            <span className={`${styles.heroRoleLabel} ${styles.creatorLabel}`}>
              Creator
            </span>
            <span className={`${styles.heroRoleLabel} ${styles.boutiqueLabel}`}>
              Boutique
            </span>
            <span className={`${styles.heroRoleLabel} ${styles.liveSellerLabel}`}>
              Live seller
            </span>
          </div>
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>The supplier network for modern fashion</p>
          <h1 id="supplier-hero-title">
            One catalog.
            <span>More routes to market.</span>
          </h1>
          <p className={styles.heroLead}>
            Place your collection inside one connected shopping network, then
            connect with participating merchants and Creator-led demand.
          </p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryCta} onClick={onPrimaryAction}>
              Join the network <ArrowRight size={16} weight="bold" />
            </button>
            <a href="#catalog-story" className={styles.textCta}>
              Explore the system
            </a>
          </div>
        </div>
        <span className={styles.heroDirection}>01 / one product, one promise</span>
      </div>

      <div className={styles.valueStrip} aria-label="Supplier value">
        <p>From catalog to customer</p>
        <div>
          <span>Merchant-ready</span>
          <span>Creator-ready</span>
          <span>Network connected</span>
        </div>
      </div>
    </section>
  );
}

function CatalogStory({ onPrimaryAction }: { onPrimaryAction: () => void }) {
  return (
    <section
      className={styles.catalogStory}
      id="catalog-story"
      aria-labelledby="catalog-story-title"
    >
      <div className={styles.sectionIntro}>
        <p className={styles.eyebrow}>02 / Digital-native collection</p>
        <h2 id="catalog-story-title">
          Your catalog should feel <span>alive.</span>
        </h2>
        <div className={styles.introAside}>
          <p>
            Publish product stories, inventory, variants, terms, and campaign-ready
            assets once. Keep every selling partner working from the same source.
          </p>
          <button type="button" className={styles.inlineLink} onClick={onPrimaryAction}>
            Build your supplier catalog <ArrowUpRight size={15} weight="bold" />
          </button>
        </div>
      </div>

      <div className={styles.catalogVisual}>
        <SupplierAsset
          src="supplier-catalog-digital-native-3d-brand-v2.png"
          alt="Fashion collection presented through colorful digital commerce cards"
        />
        <div className={styles.catalogBadge}>
          <span>One upload</span>
          <strong>Many storefronts</strong>
        </div>
      </div>
    </section>
  );
}

function GlobalNetwork() {
  return (
    <section
      className={styles.globalNetwork}
      id="global-network"
      aria-labelledby="global-network-title"
    >
      <div className={styles.networkCopy}>
        <p className={styles.eyebrow}>03 / Expressive logistics</p>
        <h2 id="global-network-title">
          Expand distribution.
          <span>Keep fulfillment coordinated.</span>
        </h2>
        <p>
          PrimeStyleAI connects suppliers with participating merchants and Creators
          through coordinated routes to market. Available order, fulfillment, and
          performance signals depend on each integration and partner agreement.
        </p>
        <a href="#selling-routes" className={styles.orangeLink}>
          See every route <ArrowRight size={16} weight="bold" />
        </a>
      </div>

      <div className={styles.networkVisual}>
        <SupplierAsset
          src="supplier-global-network-3d-brand-v2.png"
          alt="Global fashion logistics network with shipping routes, parcels, and delivery transport"
        />
      </div>

      <div className={styles.networkRail} aria-label="Network capabilities">
        <article>
          <GlobeHemisphereWest size={23} weight="duotone" />
          <span>Market reach</span>
          <strong>Discover demand beyond your current channels.</strong>
        </article>
        <article>
          <Package size={23} weight="duotone" />
          <span>Order visibility</span>
          <strong>Keep products, partners, and fulfillment aligned.</strong>
        </article>
        <article>
          <ChartLineUp size={23} weight="duotone" />
          <span>Repeat growth</span>
          <strong>See what moves and build on real performance.</strong>
        </article>
      </div>
    </section>
  );
}

function Connections({ onPrimaryAction }: { onPrimaryAction: () => void }) {
  return (
    <section className={styles.connections} aria-labelledby="connections-title">
      <div className={styles.connectionsHeading}>
        <p className={styles.eyebrow}>04 / Product plus performance</p>
        <h2 id="connections-title">Get your products into the right hands.</h2>
      </div>

      <div className={styles.connectionsVisual}>
        <SupplierAsset
          src="supplier-merchant-creator-3d-brand-v2.png"
          alt="Supplier products connected to merchant storefronts and creator content"
        />
      </div>

      <div className={styles.connectionCards}>
        <article className={styles.merchantCard} id="merchants">
          <div className={styles.cardIcon}>
            <Storefront size={24} weight="duotone" />
          </div>
          <span>For merchant growth</span>
          <h3>Meet sellers who can move your collection.</h3>
          <p>
            Share available products with boutiques, ecommerce teams, and retailers.
            Review interest, answer requests, and grow long-term accounts.
          </p>
          <button type="button" onClick={onPrimaryAction}>
            Join for merchant matches <ArrowUpRight size={15} weight="bold" />
          </button>
        </article>

        <article className={styles.creatorCard} id="influencers">
          <div className={styles.cardIcon}>
            <UsersThree size={24} weight="duotone" />
          </div>
          <span>For creator demand</span>
          <h3>Let creators turn products into momentum.</h3>
          <p>
            Connect with Creators who can wear, explain, and showcase your
            products—then review attributed attention and sales where integrated.
          </p>
          <button type="button" onClick={onPrimaryAction}>
            Join for Creator matches <ArrowUpRight size={15} weight="bold" />
          </button>
        </article>
      </div>
    </section>
  );
}

function SupplierDashboard({ onPrimaryAction }: { onPrimaryAction: () => void }) {
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [activeOrderFilter, setActiveOrderFilter] = useState("Unsent");
  const selectedOrder = DASHBOARD_ORDERS[selectedOrderIndex];

  return (
    <section
      className={styles.dashboardStory}
      id="supplier-dashboard"
      aria-labelledby="supplier-dashboard-title"
    >
      <div className={styles.dashboardStoryIntro}>
        <p className={styles.eyebrow}>One command center</p>
        <h2 id="supplier-dashboard-title">
          Control your entire network from one dashboard.
        </h2>
        <p>
          Find and manage Creators, connect with merchants, publish products,
          run campaigns, keep partner orders and shipping moving, and review the
          activity and performance signals available through each integration.
        </p>
      </div>

      <p className={styles.dashboardPreviewLabel}>
        Illustrative dashboard preview · sample data
      </p>
      <button
        type="button"
        className={styles.generatedDashboardPreview}
        onClick={onPrimaryAction}
        aria-label="Join the supplier waitlist from the dashboard preview"
      >
        <Image
          src="/media/partner-landing/supplier/supplier-operations-dashboard-imagen-v2.png"
          alt="Illustrative PrimeStyleAI supplier operations dashboard with generic partner orders, catalog highlights, campaign signals, and performance sample data"
          width={1592}
          height={1019}
          sizes="(max-width: 800px) calc(100vw - 36px), 1280px"
          className={styles.generatedDashboardImage}
        />
      </button>
      <div className={styles.dashboardCanvas} hidden aria-hidden="true">
        <div className={styles.dashboardAppBar}>
          <div className={styles.dashboardBrand}>
            <Image
              src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
              alt=""
              width={28}
              height={28}
            />
            <strong>PrimeStyleAI</strong>
          </div>

          <nav className={styles.dashboardNav} aria-label="Dashboard preview navigation">
            <button type="button">Overview</button>
            <button type="button">Catalog</button>
            <button type="button" aria-current="page">
              Partner Orders
            </button>
            <button type="button">Campaigns</button>
            <button type="button">Performance</button>
          </nav>

          <div className={styles.dashboardUtilities} aria-label="Dashboard tools">
            <button type="button" aria-label="Download report">
              <DownloadSimple size={15} weight="bold" />
            </button>
            <button type="button" aria-label="Notifications">
              <Bell size={15} weight="bold" />
            </button>
            <Image
              src="/images/landing/avatar-marcus.png"
              alt="Supplier account"
              width={32}
              height={32}
            />
          </div>
        </div>

        <div className={styles.dashboardTitleRow}>
          <div>
            <p className={styles.eyebrow}>05 / Operational detail</p>
            <h3>Supplier operations</h3>
          </div>
          <div className={styles.dashboardTitleActions}>
            <button type="button" aria-label="Adjust dashboard view">
              <SlidersHorizontal size={15} weight="bold" />
            </button>
            <button type="button" className={styles.dashboardJoinButton} onClick={onPrimaryAction}>
              <Plus size={14} weight="bold" /> Join supplier network
            </button>
          </div>
        </div>

        <div className={styles.dashboardOverview}>
          <article className={styles.performanceCard}>
            <div className={styles.metricGrid}>
              <div>
                <span>Active partner orders</span>
                <strong>18</strong>
              </div>
              <div>
                <span>Units requested</span>
                <strong>1,240</strong>
              </div>
              <div>
                <span>Campaign activity</span>
                <strong>34<small> signals</small></strong>
              </div>
            </div>

            <div className={styles.monthlyProgress} aria-label="Monthly partner performance">
              {[
                ["Sep", 5],
                ["Oct", 3],
                ["Nov", 2],
                ["Dec", 1],
              ].map(([month, count], monthIndex) => (
                <div className={styles.monthTrack} key={month}>
                  <span>{month}</span>
                  <span className={styles.progressBar}>
                    <span
                      style={{
                        "--progress": `${35 + monthIndex * 17}%`,
                      } as CSSProperties}
                    />
                  </span>
                  <div className={styles.partnerFaces}>
                    {DASHBOARD_PARTNERS.slice(0, Number(count)).map((avatar, avatarIndex) => (
                      <Image
                        key={`${month}-${avatar}`}
                        src={avatar}
                        alt=""
                        width={26}
                        height={26}
                        style={{ zIndex: 8 - avatarIndex }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.payoutCard}>
            <div className={styles.payoutHeading}>
              <span>Partner activity</span>
              <ArrowUpRight size={16} weight="bold" />
            </div>
            <strong>Illustrative preview</strong>
            <div className={styles.payoutMethods}>
              <button type="button"><span>18</span><small>Orders</small></button>
              <button type="button" aria-pressed="true"><span>12</span><small>Merchants</small></button>
              <button type="button"><span>34</span><small>Campaigns</small></button>
              <button type="button"><span>7</span><small>Fulfillment updates</small></button>
            </div>
          </article>
        </div>

        <div className={styles.dashboardFilters}>
          <strong>Active filters <Funnel size={13} weight="fill" /></strong>
          <button type="button">All partners <CaretDown size={12} weight="bold" /></button>
          <button type="button">All channels <CaretDown size={12} weight="bold" /></button>
          <button type="button"><CalendarBlank size={13} /> November 2026</button>
          <button type="button"><CalendarBlank size={13} /> December 2026</button>
          <label>
            <span>Search orders</span>
            <input type="search" aria-label="Search orders" />
            <MagnifyingGlass size={14} weight="bold" />
          </label>
        </div>

        <div className={styles.ordersConsole}>
          <div className={styles.orderList}>
            <div className={styles.orderListHeader}>
              <strong>Partner orders</strong>
              <div>
                {["All orders", "Draft", "Unsent"].map((filter) => (
                  <button
                    type="button"
                    key={filter}
                    aria-pressed={activeOrderFilter === filter}
                    onClick={() => setActiveOrderFilter(filter)}
                  >
                    {filter}{filter === "Draft" ? " 3" : filter === "Unsent" ? " 5" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.orderRows}>
              {DASHBOARD_ORDERS.map((order, index) => (
                <button
                  type="button"
                  key={order.id}
                  className={index === selectedOrderIndex ? styles.activeOrder : undefined}
                  aria-pressed={index === selectedOrderIndex}
                  onClick={() => setSelectedOrderIndex(index)}
                >
                  <Image src={order.avatar} alt="" width={31} height={31} />
                  <span>
                    <strong>{order.id}</strong>
                    <small>{order.partner}</small>
                  </span>
                  <em>{order.status}</em>
                  <b>{order.amount}</b>
                </button>
              ))}
            </div>
          </div>

          <article className={styles.orderDetail} aria-live="polite">
            <div className={styles.detailHeading}>
              <div>
                <span>Order details</span>
                <strong>#{selectedOrder.id.replace("PS-", "")}</strong>
                <small>Current</small>
              </div>
              <div>
                <span>Merchant</span>
                <strong>{selectedOrder.partner}</strong>
              </div>
              <div className={styles.detailCustomer}>
                <span>Fulfillment</span>
                <Package size={27} weight="duotone" aria-hidden="true" />
                <p><strong>{selectedOrder.fulfillment}</strong><small>Minimum identity shown</small></p>
              </div>
            </div>

            <div className={styles.detailCards}>
              <button type="button">
                <span>$10,630.80</span>
                <small>Products</small>
                <ArrowUpRight size={12} />
              </button>
              <button type="button">
                <span>$31,892.40</span>
                <small>Merchant order</small>
                <ArrowUpRight size={12} />
              </button>
              <button type="button">
                <span>$10,630.80</span>
                <small>Creator campaign</small>
                <ArrowUpRight size={12} />
              </button>
              <button type="button" aria-label="Add order item">
                <Plus size={18} weight="bold" />
              </button>
            </div>

            <div className={styles.detailFooter}>
              <div><span>Order total</span><strong>{selectedOrder.amount}</strong></div>
              <div><span>Units</span><strong>320</strong></div>
              <div><span>Status</span><strong>{selectedOrder.status}</strong></div>
              <button type="button" aria-label="Partner order reviewed">
                <CheckCircle size={14} weight="fill" /> Reviewed
              </button>
              <button type="button" aria-label="More order actions">
                <DotsThree size={18} weight="bold" />
              </button>
            </div>
          </article>
        </div>

        <div className={styles.dashboardFootnote}>
          <span><Clock size={13} weight="fill" /> Illustrative dashboard preview · sample data</span>
          <span><ChartLineUp size={13} weight="fill" /> Catalog, partner-order, campaign, fulfillment, and performance signals where integrated</span>
        </div>
      </div>
    </section>
  );
}

function SellingRoutes() {
  return (
    <section
      className={styles.sellingRoutes}
      id="selling-routes"
      aria-labelledby="selling-routes-title"
    >
      <div className={styles.routesTitle}>
        <p className={styles.eyebrow}>One connected system</p>
        <h2 id="selling-routes-title">One catalog. Multiple routes to market.</h2>
      </div>

      <div className={styles.routeGrid}>
        <article>
          <span>01</span>
          <h3>Wholesale</h3>
          <p>Supply merchants with clear terms, available inventory, and reorder visibility where integrated.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Dropship</h3>
          <p>Let approved sellers offer your products without carrying stock.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Creator-led</h3>
          <p>Turn showcases, campaigns, and trusted recommendations into demand.</p>
        </article>
      </div>
    </section>
  );
}

function FinalCta({ onPrimaryAction }: { onPrimaryAction: () => void }) {
  return (
    <section className={styles.finalCta} aria-labelledby="supplier-final-title">
      <p className={styles.eyebrow}>Your next market is already connected</p>
      <h2 id="supplier-final-title">Bring the products. We’ll connect you to the network.</h2>
      <div className={styles.finalAction}>
        <button type="button" className={styles.finalButton} onClick={onPrimaryAction}>
          Join the supplier network <ArrowRight size={18} weight="bold" />
        </button>
        <span>Prelaunch supplier waitlist</span>
      </div>
    </section>
  );
}

function SupplierFooter({
  onPrimaryAction,
  onSectionSelect,
}: {
  onPrimaryAction: () => void;
  onSectionSelect: SectionSelect;
}) {
  return (
    <footer className={styles.networkFooter} id="site-footer">
      <div className={styles.footerFrame}>
        <section className={styles.footerMain} aria-label="PrimeStyleAI supplier footer">
          <Link href="/" className={styles.footerMark} aria-label="PrimeStyleAI home">
            <Image
              src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
              alt="PrimeStyleAI"
              width={1254}
              height={1254}
              sizes="120px"
            />
          </Link>

          <div className={styles.footerBrand}>
            <h2>PrimeStyleAI</h2>
            <p>Where every product finds more ways to sell.</p>
          </div>

          <div className={styles.footerContent}>
            <div className={styles.footerContact}>
              <h3>Contact</h3>
              <a href="mailto:support@primestyleai.com">
                <EnvelopeSimple size={16} /> support@primestyleai.com
              </a>
              <span>
                <MapPin size={16} /> 1968 S. Coast Hwy #4471, Laguna Beach, CA 92651
              </span>
              <nav aria-label="Social links">
                {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                  >
                    <Icon size={17} weight="fill" />
                  </a>
                ))}
              </nav>
            </div>

            <div className={styles.footerActions}>
              <button type="button" onClick={onPrimaryAction}>
                Join the network <ArrowUpRight size={14} weight="bold" />
              </button>
            </div>

            <nav className={styles.footerQuickLinks} aria-label="Footer navigation">
              <h3>Quick links</h3>
              <button type="button" onClick={() => onSectionSelect("global-network")}>
                Global network
              </button>
              <button type="button" onClick={() => onSectionSelect("merchants")}>
                Merchants
              </button>
              <button type="button" onClick={() => onSectionSelect("influencers")}>
                Creators
              </button>
              <button
                type="button"
                onClick={() => onSectionSelect("supplier-dashboard")}
              >
                Performance preview
              </button>
            </nav>
          </div>

          <div className={styles.footerLegal}>
            <span>© {new Date().getFullYear()} PrimeStyleAI</span>
            <nav aria-label="Legal links">
              <Link href="/terms">Terms &amp; participation</Link>
              <Link href="/privacy-policy">Privacy</Link>
              <Link href="/privacy-policy#section-3">AI &amp; photo data</Link>
              <Link href="/terms#section-22">Accessibility</Link>
              <Link href="/privacy-policy#section-6">Cookie &amp; privacy choices</Link>
              <a href="mailto:support@primestyleai.com">Contact</a>
            </nav>
          </div>
        </section>
      </div>
    </footer>
  );
}

export function SupplierNetworkSections() {
  const router = useRouter();
  const openSupplierLanding = () => router.push("/suppliers");
  return (
    <div className={styles.page} data-audience="supplier">
      <CatalogStory onPrimaryAction={openSupplierLanding} />
      <GlobalNetwork />
      <Connections onPrimaryAction={openSupplierLanding} />
      <SupplierDashboard onPrimaryAction={openSupplierLanding} />
      <SellingRoutes />
    </div>
  );
}

export function SupplierLandingExperience() {
  const navigation = useLandingNavigation();
  const interest = usePartnerInterest("supplier");

  return (
    <div className={styles.page} data-audience="supplier">
      <div className={styles.headerShell}>
        <SupplierHeader
          mobileMenuOpen={navigation.mobileMenuOpen}
          onMenuClose={navigation.closeMobileMenu}
          onMenuToggle={navigation.toggleMobileMenu}
          onPrimaryAction={interest.open}
          onSectionSelect={navigation.scrollToSection}
        />
      </div>
      <main>
        <Hero onPrimaryAction={interest.open} />
        <CatalogStory onPrimaryAction={interest.open} />
        <GlobalNetwork />
        <Connections onPrimaryAction={interest.open} />
        <SupplierDashboard onPrimaryAction={interest.open} />
        <SellingRoutes />
        <FinalCta onPrimaryAction={interest.open} />
      </main>
      <SupplierFooter
        onPrimaryAction={interest.open}
        onSectionSelect={navigation.scrollToSection}
      />
      <SupplierInterestDialog
        isOpen={interest.isOpen}
        message={interest.message}
        submissionState={interest.submissionState}
        onClose={interest.close}
        onSubmit={interest.submit}
      />
    </div>
  );
}
