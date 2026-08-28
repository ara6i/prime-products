"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChartLineUp,
  Check,
  Handshake,
  MagnifyingGlass,
  Package,
  ShoppingBagOpen,
  Storefront,
  Sun,
  Truck,
  UsersThree,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "./merchantDashboardShowcase.module.css";

const dashboardViews = {
  Overview: {
    label: "Network sales",
    metric: "$84,620",
    change: "+18.4% this month",
    title: "Your commerce network",
    summary: "Products, partners, creators, and customer demand in one live view.",
    stats: [
      ["Catalog ready", "96%", "1,248 products"],
      ["Active suppliers", "28", "4 need review"],
      ["Creator partners", "42", "18 new matches"],
      ["Network orders", "1,904", "+16% this month"],
    ],
  },
  Suppliers: {
    label: "Supplier network",
    metric: "28 active",
    change: "4 new products today",
    title: "Supplier relationships",
    summary: "Review availability, approve products, and keep fulfillment moving.",
    stats: [
      ["Products sourced", "1,248", "Across 28 suppliers"],
      ["Ready to publish", "84", "Images and sizes complete"],
      ["Needs attention", "12", "Stock or size gaps"],
      ["On-time fulfillment", "97%", "+2.1% this month"],
    ],
  },
  Creators: {
    label: "Creator partnerships",
    metric: "42 live",
    change: "18 matched creators",
    title: "Creator collaborations",
    summary: "Find the right creators, approve requests, and follow every story to sale.",
    stats: [
      ["New matches", "18", "Based on your catalog"],
      ["Requests", "5", "Waiting for review"],
      ["Content live", "42", "Across 8 channels"],
      ["Creator orders", "612", "+24% this month"],
    ],
  },
  Catalog: {
    label: "Catalog readiness",
    metric: "96% ready",
    change: "84 products publishable",
    title: "Product catalog",
    summary: "Prepare products for your store, AI fitting, creators, and network discovery.",
    stats: [
      ["Live products", "1,248", "In your storefront"],
      ["Try-on ready", "1,196", "Sizing data complete"],
      ["Needs content", "31", "Images or details missing"],
      ["Network matched", "684", "Shown in relevant looks"],
    ],
  },
  Orders: {
    label: "Orders and demand",
    metric: "1,904",
    change: "+16% this month",
    title: "Orders and customers",
    summary: "Track demand from storefront, creator, and shopping-network discovery.",
    stats: [
      ["Storefront", "1,012", "Direct product orders"],
      ["Creator-led", "612", "Attributed to content"],
      ["Network discovery", "280", "From matched outfits"],
      ["Repeat customers", "38%", "+4.2% this month"],
    ],
  },
} as const;

type DashboardView = keyof typeof dashboardViews;

const viewIcons = {
  Overview: Storefront,
  Suppliers: Truck,
  Creators: UsersThree,
  Catalog: Package,
  Orders: ShoppingBagOpen,
} as const;

export function MerchantDashboardShowcase({
  onPrimaryAction,
}: {
  onPrimaryAction: () => void;
}) {
  const [activeView, setActiveView] = useState<DashboardView>("Overview");
  const view = dashboardViews[activeView];

  return (
    <section
      id="merchant-dashboard"
      className={styles.section}
      aria-labelledby="merchant-dashboard-showcase-title"
    >
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand} aria-label="PrimeStyleAI home">
            <Image
              src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp"
              alt=""
              width={28}
              height={23}
            />
            <strong>PrimeStyleAI</strong>
          </Link>

          <nav aria-label="Merchant workspace preview">
            {(Object.keys(dashboardViews) as DashboardView[]).map((item) => (
              <button
                key={item}
                type="button"
                className={activeView === item ? styles.navActive : undefined}
                onClick={() => setActiveView(item)}
              >
                {item}
              </button>
            ))}
          </nav>

          <button type="button" className={styles.topbarLink} onClick={onPrimaryAction}>
            Join the waitlist
          </button>
        </header>

        <div className={styles.heroCopy}>
          <div>
            <p>Welcome to your merchant workspace</p>
            <h2 id="merchant-dashboard-showcase-title">
              Keep every side of commerce moving.
            </h2>
          </div>
          <div className={styles.heroSummary}>
            <p>
              Manage suppliers, connect with influencers, prepare products, and
              follow every order from one clear dashboard.
            </p>
            <button type="button" onClick={onPrimaryAction}>
              Join the waitlist
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.dashboardScene}>
          <article className={`${styles.floatingCard} ${styles.supplierCard}`}>
            <span className={styles.floatingIcon}>
              <Truck size={20} weight="duotone" aria-hidden="true" />
            </span>
            <small>Supplier network</small>
            <strong>28 active</strong>
            <p><Check size={12} weight="bold" aria-hidden="true" /> 97% on-time fulfillment</p>
          </article>

          <article className={`${styles.floatingCard} ${styles.creatorCard}`}>
            <Image
              src="/media/partner-landing/merchant-network/creator-discovery/creator-susan.webp"
              alt="Susan Adams, fashion creator"
              width={46}
              height={46}
            />
            <span>
              <small>New creator match</small>
              <strong>Susan Adams</strong>
              <em>92% product fit</em>
            </span>
          </article>

          <article className={`${styles.floatingCard} ${styles.productCard}`}>
            <Image
              src="/media/partner-landing/merchant-network/studio-jacket-cobalt.png"
              alt="Cobalt Arc Jacket"
              width={76}
              height={76}
            />
            <span>
              <small>Catalog ready</small>
              <strong>Arc Jacket</strong>
              <em>Live in your store</em>
            </span>
          </article>

          <div className={styles.browserWindow}>
            <div className={styles.browserBar} aria-hidden="true">
              <span><i /><i /><i /></span>
              <p>merchant.primestyleai.com</p>
              <b>•••</b>
            </div>

            <div className={styles.dashboardBody}>
              <aside className={styles.sidebar} aria-label="Dashboard preview navigation">
                <span className={styles.sidebarBrand}>
                  <Image
                    src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp"
                    alt=""
                    width={24}
                    height={20}
                  />
                  <b>Merchant</b>
                </span>
                {(Object.keys(dashboardViews) as DashboardView[]).map((item) => {
                  const Icon = viewIcons[item];
                  return (
                    <button
                      key={item}
                      type="button"
                      className={activeView === item ? styles.sidebarActive : undefined}
                      onClick={() => setActiveView(item)}
                    >
                      <Icon size={15} weight={activeView === item ? "fill" : "regular"} aria-hidden="true" />
                      {item}
                      {item === "Creators" ? <span>5</span> : null}
                    </button>
                  );
                })}
                <button type="button" className={styles.sidebarWaitlist} onClick={onPrimaryAction}>
                  <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
                  Join the waitlist
                </button>
              </aside>

              <div className={styles.workspace} aria-live="polite">
                <div className={styles.workspaceToolbar}>
                  <div>
                    <p><Sun size={17} weight="fill" aria-hidden="true" /> Good morning, Maya</p>
                    <span>{view.summary}</span>
                  </div>
                  <label>
                    <MagnifyingGlass size={15} aria-hidden="true" />
                    <input type="search" placeholder="Search your workspace" />
                  </label>
                  <button type="button" aria-label="Dashboard notifications">
                    <Bell size={16} weight="regular" aria-hidden="true" />
                    <span />
                  </button>
                </div>

                <div className={styles.workspaceGrid}>
                  <div className={styles.workspaceMain}>
                    <article className={styles.primaryMetric}>
                      <div>
                        <span>{view.label}</span>
                        <strong>{view.metric}</strong>
                        <small><ChartLineUp size={14} weight="bold" aria-hidden="true" /> {view.change}</small>
                      </div>
                      <div>
                        <Link href="/merchants/dashboard/catalog">Add product</Link>
                        <Link href="/merchants/dashboard/campaigns">New campaign</Link>
                      </div>
                    </article>

                    <div className={styles.statGrid}>
                      {view.stats.map(([label, value, note]) => (
                        <article key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                          <small>{note}</small>
                        </article>
                      ))}
                    </div>
                  </div>

                  <aside className={styles.activityPanel}>
                    <div>
                      <span>Needs your attention</span>
                      <Link href="/merchants/dashboard">View all</Link>
                    </div>
                    <article>
                      <span className={styles.activityIcon}><Handshake size={18} weight="duotone" /></span>
                      <p><strong>5 creator requests</strong><small>Review new collaborations</small></p>
                      <ArrowRight size={14} weight="bold" />
                    </article>
                    <article>
                      <span className={styles.activityIcon}><Truck size={18} weight="duotone" /></span>
                      <p><strong>4 supplier updates</strong><small>Stock and size changes</small></p>
                      <ArrowRight size={14} weight="bold" />
                    </article>
                    <article>
                      <span className={styles.activityIcon}><Package size={18} weight="duotone" /></span>
                      <p><strong>12 products need details</strong><small>Complete before publishing</small></p>
                      <ArrowRight size={14} weight="bold" />
                    </article>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.capabilities} aria-label="Merchant dashboard capabilities">
          <span>Catalog</span>
          <span>Supplier network</span>
          <span>Creator partnerships</span>
          <span>Customer demand</span>
          <span>Orders</span>
        </div>
      </div>
    </section>
  );
}
