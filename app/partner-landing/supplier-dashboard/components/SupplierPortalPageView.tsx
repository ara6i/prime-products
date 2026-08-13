"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Buildings,
  ChartLineUp,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  DownloadSimple,
  EnvelopeSimple,
  FileText,
  Handshake,
  MapPin,
  Megaphone,
  Package,
  PaperPlaneTilt,
  PencilSimple,
  ShieldCheck,
  ShoppingBagOpen,
  Sparkle,
  Storefront,
  TrendUp,
  Truck,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  SupplierDialog,
  SupplierPageId,
} from "./SupplierDashboardExperience";
import styles from "./supplierDashboard.module.css";

type ViewProps = {
  page: SupplierPageId;
  notify: (message: string) => void;
  openDialog: (dialog: SupplierDialog) => void;
};

type Metric = {
  label: string;
  value: string;
  detail: string;
  direction?: "up" | "down" | "steady";
  tone?: "plain" | "mint" | "blue" | "lime";
  icon: ReactNode;
};

const performanceTrend = [
  { day: "Mon", bulk: 34, dropship: 23, dtc: 18 },
  { day: "Tue", bulk: 42, dropship: 28, dtc: 25 },
  { day: "Wed", bulk: 38, dropship: 36, dtc: 31 },
  { day: "Thu", bulk: 54, dropship: 42, dtc: 35 },
  { day: "Fri", bulk: 49, dropship: 48, dtc: 44 },
  { day: "Sat", bulk: 61, dropship: 53, dtc: 51 },
  { day: "Sun", bulk: 72, dropship: 61, dtc: 58 },
];

const relationshipTrend = [
  { day: "Mon", value: 28 },
  { day: "Tue", value: 43 },
  { day: "Wed", value: 37 },
  { day: "Thu", value: 58 },
  { day: "Fri", value: 52 },
  { day: "Sat", value: 72 },
  { day: "Sun", value: 84 },
];

const productRows = [
  {
    image: "/media/influencer-dashboard/products/cotton-tshirt.webp",
    name: "FlexPro Medical Scrub Set",
    sku: "NS-FP-2401",
    modes: ["Bulk", "Dropship", "DTC"],
    inventory: "2,840",
    status: "Active",
  },
  {
    image: "/media/influencer-dashboard/products/vermilion-cardigan.webp",
    name: "CoreFlex Zip Jacket",
    sku: "NS-CF-1844",
    modes: ["Bulk", "Dropship"],
    inventory: "1,260",
    status: "Active",
  },
  {
    image: "/media/influencer-dashboard/products/coastal-stripe-cardigan.webp",
    name: "Harbor Utility Overshirt",
    sku: "NS-HU-1092",
    modes: ["Bulk", "DTC"],
    inventory: "680",
    status: "Review",
  },
  {
    image: "/media/influencer-dashboard/products/ruffle-trimmed-blouse.webp",
    name: "Contour Performance Top",
    sku: "NS-CT-2880",
    modes: ["DTC"],
    inventory: "420",
    status: "Draft",
  },
];

const merchantMatches = [
  {
    name: "Atlas Retail Group",
    location: "United States & Canada",
    category: "Medical uniforms",
    mode: "Bulk + Dropship",
    score: 94,
    demand: "$84k estimated annual demand",
    verified: true,
  },
  {
    name: "Fieldwork Supply Co.",
    location: "United States",
    category: "Utility workwear",
    mode: "Bulk",
    score: 91,
    demand: "$62k estimated annual demand",
    verified: true,
  },
  {
    name: "Studio North Retail",
    location: "United Kingdom & EU",
    category: "Premium essentials",
    mode: "Dropship + DTC",
    score: 88,
    demand: "$49k estimated annual demand",
    verified: false,
  },
];

const influencerMatches = [
  {
    name: "Maya Laurent",
    image: "/media/partner-landing/optimized/creator-match-maya.webp",
    category: "Everyday fashion",
    audience: "1.8M",
    engagement: "5.8%",
    rate: "12%",
    score: 96,
    products: 84,
    href: "/influencers/maya-laurent",
  },
  {
    name: "Sienna Brooks",
    image: "/media/partner-landing/optimized/creator-orange-white.webp",
    category: "Workwear style",
    audience: "820k",
    engagement: "7.1%",
    rate: "10%",
    score: 93,
    products: 66,
    href: "/influencers/maya-laurent",
  },
  {
    name: "Rae Morgan",
    image: "/media/partner-landing/optimized/creator-collective-03.webp",
    category: "Inclusive sizing",
    audience: "640k",
    engagement: "8.4%",
    rate: "14%",
    score: 90,
    products: 71,
    href: "/influencers/maya-laurent",
  },
];

export function SupplierPortalPageView({
  page,
  notify,
  openDialog,
}: ViewProps) {
  switch (page) {
    case "dashboard":
      return <DashboardHome notify={notify} openDialog={openDialog} />;
    case "merchant-matches":
      return <MerchantMatches notify={notify} openDialog={openDialog} />;
    case "influencer-matches":
      return <InfluencerMatches notify={notify} openDialog={openDialog} />;
    case "company":
      return <CompanyPage notify={notify} />;
    case "products":
      return <ProductsPage notify={notify} openDialog={openDialog} />;
    case "selling-options":
      return <SellingOptionsPage notify={notify} />;
    case "messages":
      return <MessagesPage notify={notify} />;
    case "orders":
      return <OrdersPage notify={notify} />;
    case "relationships":
      return <RelationshipsPage notify={notify} openDialog={openDialog} />;
    case "campaigns":
      return <CampaignsPage notify={notify} openDialog={openDialog} />;
    case "payments":
      return <PaymentsPage notify={notify} openDialog={openDialog} />;
    case "performance":
      return <PerformancePage notify={notify} />;
    case "policies":
      return <PoliciesPage notify={notify} />;
    case "team":
      return <TeamPage notify={notify} openDialog={openDialog} />;
  }
}

function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <section className={styles.metricGrid} aria-label="Page summary">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className={`${styles.metricCard} ${styles[`metricTone${capitalize(metric.tone ?? "plain")}`]}`}
        >
          <div className={styles.metricIcon}>{metric.icon}</div>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>
            {metric.direction === "up" ? (
              <ArrowUp size={11} aria-hidden />
            ) : null}
            {metric.direction === "down" ? (
              <ArrowDown size={11} aria-hidden />
            ) : null}
            {metric.detail}
          </small>
        </article>
      ))}
    </section>
  );
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function PanelHeader({
  eyebrow,
  title,
  caption,
  action,
}: {
  eyebrow?: string;
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.panelHeader}>
      <div>
        {eyebrow ? <span className={styles.cardEyebrow}>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {caption ? <p>{caption}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`${styles.statusPill} ${styles[`status${capitalize(tone)}`]}`}
    >
      {children}
    </span>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className={styles.channelTag}>{children}</span>;
}

function SmallAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.smallAction} onClick={onClick}>
      {children}
      <ArrowUpRight size={13} aria-hidden />
    </button>
  );
}

function DashboardHome({ notify, openDialog }: Omit<ViewProps, "page">) {
  const actionQueue = [
    { name: "RFQs", value: 6, color: "#72d2cc" },
    { name: "Samples", value: 3, color: "#d8eeea" },
    { name: "Campaigns", value: 4, color: "#eff3f2" },
  ];

  return (
    <section
      className={styles.dashboardGrid}
      aria-label="Supplier dashboard overview"
    >
      <article className={`${styles.card} ${styles.discoveryCard}`}>
        <PanelHeader
          eyebrow="Partner matching"
          title="Discovery network"
          action={
            <button
              type="button"
              className={styles.roundAction}
              aria-label="Refresh recommendations"
              onClick={() =>
                notify("Partner recommendations refreshed from your profile.")
              }
            >
              <TrendUp size={16} aria-hidden />
            </button>
          }
        />
        <div className={styles.discoveryVisual}>
          <Image
            src="/media/supplier-dashboard/catalog-prism-card.webp"
            fill
            sizes="(max-width: 720px) 100vw, 330px"
            alt="Iridescent fashion-network prism above a pedestal"
            preload
          />
        </div>
        <div className={styles.discoveryDetails}>
          <div className={styles.splitHeading}>
            <div>
              <h3>32 qualified matches</h3>
              <p>24 merchant buyers · 8 influencers</p>
            </div>
            <StatusPill tone="lime">+15 new</StatusPill>
          </div>
          <div
            className={styles.progressTrack}
            aria-label="Profile match readiness 92 percent"
          >
            <span style={{ width: "92%" }} />
          </div>
          <div className={styles.progressLabels}>
            <span>
              <strong>92%</strong> match readiness
            </span>
            <span>Strong profile</span>
          </div>
          <button
            type="button"
            className={styles.darkAction}
            onClick={() => openDialog("partner")}
          >
            Review all matches
            <ArrowUpRight size={16} aria-hidden />
          </button>
        </div>
      </article>

      <article className={`${styles.card} ${styles.dashboardMerchantCard}`}>
        <div className={styles.splitHeading}>
          <div>
            <span className={styles.cardEyebrow}>Merchant match</span>
            <strong className={styles.largeNumber}>
              94<small>%</small>
            </strong>
          </div>
          <StatusPill tone="lime">
            <CheckCircle size={12} weight="fill" /> Verified
          </StatusPill>
        </div>
        <div className={styles.identityRow}>
          <span className={styles.identityIcon}>
            <Storefront size={20} weight="fill" />
          </span>
          <span>
            <strong>Atlas Retail Group</strong>
            <small>Uniform retailer · US & Canada</small>
          </span>
        </div>
        <dl className={styles.compactFacts}>
          <dt>Looking for</dt>
          <dd>Medical uniforms</dd>
          <dt>Buying mode</dt>
          <dd>Bulk + dropship</dd>
        </dl>
        <Link
          href="/suppliers/dashboard/merchant-matches"
          className={styles.matchAction}
        >
          Review merchant <ArrowUpRight size={14} />
        </Link>
      </article>

      <article className={`${styles.card} ${styles.dashboardPipelineCard}`}>
        <PanelHeader eyebrow="Partnership pipeline" title="42 opportunities" />
        <span className={styles.positiveDelta}>8 new this week</span>
        <div className={styles.channelBars}>
          {[
            ["Merchants", 57],
            ["Influencers", 24],
            ["Active", 19],
          ].map(([label, value]) => (
            <div key={label} className={styles.channelRow}>
              <span>{label}</span>
              <div>
                <i style={{ width: `${value}%` }} />
              </div>
              <strong>{value}%</strong>
            </div>
          ))}
        </div>
        <Link
          href="/suppliers/dashboard/relationships"
          className={styles.textLink}
        >
          Open pipeline <ArrowUpRight size={13} />
        </Link>
      </article>

      <article className={`${styles.card} ${styles.dashboardCreatorCard}`}>
        <div className={styles.splitHeading}>
          <span className={styles.cardEyebrow}>Best influencer match</span>
          <UsersThree size={20} weight="fill" aria-hidden />
        </div>
        <Image
          src="/media/partner-landing/optimized/creator-match-maya.webp"
          width={1254}
          height={1254}
          sizes="52px"
          alt="Maya Laurent"
          className={styles.creatorAvatar}
        />
        <strong className={styles.largeNumber}>96%</strong>
        <p>Maya Laurent · Fashion creator</p>
        <small>12% requested rate · 84 eligible DTC products</small>
        <Link
          href="/suppliers/dashboard/influencer-matches"
          className={styles.creatorArrow}
          aria-label="Review influencer matches"
        >
          <ArrowUpRight size={17} />
        </Link>
      </article>

      <article className={`${styles.card} ${styles.dashboardTrendCard}`}>
        <PanelHeader
          eyebrow="Relationship activity"
          title="31 introductions"
          caption="Merchant introductions and accepted creator campaigns"
          action={<StatusPill tone="mint">+21% this week</StatusPill>}
        />
        <div
          className={styles.dashboardChart}
          aria-label="Relationship activity chart"
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 500, height: 140 }}
          >
            <LineChart
              data={relationshipTrend}
              margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#f0f0ee" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#797980" }}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{ border: 0, borderRadius: 12, fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#18181b"
                strokeWidth={1.8}
                dot={{ r: 2.7, fill: "#18181b", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "#e9ff55", stroke: "#18181b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className={`${styles.card} ${styles.dashboardActionCard}`}>
        <PanelHeader eyebrow="Actions due" title="13 items" />
        <div className={styles.donutArea}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 150, height: 130 }}
          >
            <PieChart>
              <Pie
                data={actionQueue}
                dataKey="value"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                stroke="none"
              >
                {actionQueue.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.donutCenter}>
            <strong>13</strong>
            <span>open</span>
          </div>
        </div>
        <div className={styles.actionLegend}>
          {actionQueue.map((item) => (
            <span key={item.name}>
              <i style={{ background: item.color }} />
              {item.value} {item.name}
            </span>
          ))}
        </div>
        <button
          type="button"
          className={styles.matchAction}
          onClick={() => notify("All 13 supplier actions are now in view.")}
        >
          Open action queue <ArrowUpRight size={14} />
        </button>
      </article>
    </section>
  );
}

function MerchantMatches({ notify, openDialog }: Omit<ViewProps, "page">) {
  const [saved, setSaved] = useState<string[]>(["Atlas Retail Group"]);
  const metrics: Metric[] = [
    {
      label: "Qualified matches",
      value: "24",
      detail: "+6 this week",
      direction: "up",
      tone: "blue",
      icon: <Storefront size={18} />,
    },
    {
      label: "90%+ fit",
      value: "8",
      detail: "High-priority buyers",
      tone: "lime",
      icon: <Sparkle size={18} />,
    },
    {
      label: "Open RFQs",
      value: "6",
      detail: "$146k potential",
      tone: "mint",
      icon: <FileText size={18} />,
    },
    {
      label: "Saved merchants",
      value: String(saved.length),
      detail: "Ready for outreach",
      icon: <Handshake size={18} />,
    },
  ];

  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.panelWide}`}>
          <PanelHeader
            eyebrow="Recommended buyers"
            title="Best merchant matches"
            caption="Ranked from your categories, capacity, regions and selling modes."
            action={
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => openDialog("partner")}
              >
                Refine matching
              </button>
            }
          />
          <div className={styles.matchList}>
            {merchantMatches.map((merchant) => {
              const isSaved = saved.includes(merchant.name);
              return (
                <article
                  key={merchant.name}
                  className={styles.merchantMatchRow}
                >
                  <div className={styles.matchScore}>
                    <strong>{merchant.score}</strong>
                    <span>% match</span>
                  </div>
                  <span className={styles.identityIcon}>
                    <Storefront size={21} weight="fill" />
                  </span>
                  <div className={styles.matchMain}>
                    <div className={styles.nameLine}>
                      <strong>{merchant.name}</strong>
                      {merchant.verified ? (
                        <StatusPill tone="mint">Verified</StatusPill>
                      ) : null}
                    </div>
                    <span>
                      <MapPin size={12} /> {merchant.location}
                    </span>
                    <div className={styles.tagRow}>
                      <Tag>{merchant.category}</Tag>
                      <Tag>{merchant.mode}</Tag>
                    </div>
                  </div>
                  <div className={styles.matchDemand}>
                    <span>Demand signal</span>
                    <strong>{merchant.demand}</strong>
                  </div>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={
                        isSaved ? styles.savedButton : styles.secondaryButton
                      }
                      onClick={() => {
                        setSaved((current) =>
                          isSaved
                            ? current.filter((name) => name !== merchant.name)
                            : [...current, merchant.name],
                        );
                        notify(
                          isSaved
                            ? `${merchant.name} removed from saved merchants.`
                            : `${merchant.name} saved to your shortlist.`,
                        );
                      }}
                    >
                      {isSaved ? (
                        <>
                          <Check size={13} /> Saved
                        </>
                      ) : (
                        "Save"
                      )}
                    </button>
                    <SmallAction
                      onClick={() =>
                        notify(`${merchant.name} profile opened for review.`)
                      }
                    >
                      Review
                    </SmallAction>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className={styles.panel}>
          <PanelHeader eyebrow="Matching readiness" title="Profile strength" />
          <div className={styles.readinessScore}>
            <strong>92%</strong>
            <span>Strong profile</span>
          </div>
          <div className={styles.progressTrack}>
            <span style={{ width: "92%" }} />
          </div>
          <ul className={styles.checkList}>
            <li>
              <CheckCircle size={16} weight="fill" /> Capacity and lead times
              complete
            </li>
            <li>
              <CheckCircle size={16} weight="fill" /> Regions and certifications
              verified
            </li>
            <li>
              <Clock size={16} /> Add private-label material options
            </li>
          </ul>
          <Link
            href="/suppliers/dashboard/company"
            className={styles.darkAction}
          >
            Improve company page <ArrowUpRight size={15} />
          </Link>
        </aside>

        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Saved search"
            title="Medical uniform buyers"
            caption="Bulk or dropship · US & Canada"
          />
          <div className={styles.savedSearchMeta}>
            <strong>11</strong>
            <span>new buyers since 4 Aug</span>
          </div>
          <button
            type="button"
            className={styles.textLink}
            onClick={() => notify("Saved search opened with 11 new matches.")}
          >
            View results <ArrowUpRight size={13} />
          </button>
        </section>
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Outreach"
            title="Start with a warm introduction"
            caption="Protected relationship terms appear before contact details are exchanged."
          />
          <button
            type="button"
            className={styles.darkAction}
            onClick={() =>
              notify(
                "A protected introduction draft is ready for Atlas Retail Group.",
              )
            }
          >
            Message best match <PaperPlaneTilt size={15} />
          </button>
        </section>
      </div>
    </div>
  );
}

function InfluencerMatches({ notify, openDialog }: Omit<ViewProps, "page">) {
  const metrics: Metric[] = [
    {
      label: "Eligible creators",
      value: "21",
      detail: "+8 recommended",
      direction: "up",
      tone: "blue",
      icon: <UsersThree size={18} />,
    },
    {
      label: "Average requested rate",
      value: "11.4%",
      detail: "Net merchandise",
      tone: "lime",
      icon: <Megaphone size={18} />,
    },
    {
      label: "Combined audience",
      value: "4.8M",
      detail: "Across top matches",
      tone: "mint",
      icon: <ChartLineUp size={18} />,
    },
    {
      label: "Eligible DTC products",
      value: "84",
      detail: "Ready after acceptance",
      icon: <Package size={18} />,
    },
  ];

  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.panelWide}`}>
          <PanelHeader
            eyebrow="Creator discovery"
            title="Recommended influencer partners"
            caption="Review audience fit, requested commission and eligible DTC inventory before accepting."
            action={
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => openDialog("partner")}
              >
                Refine audience
              </button>
            }
          />
          <div className={styles.creatorMatchGrid}>
            {influencerMatches.map((creator) => (
              <article key={creator.name} className={styles.creatorMatchCard}>
                <div className={styles.creatorImageWrap}>
                  <Image
                    src={creator.image}
                    fill
                    sizes="(max-width: 720px) 100vw, 220px"
                    alt={creator.name}
                    loading="eager"
                  />
                  <StatusPill tone="lime">{creator.score}% match</StatusPill>
                </div>
                <div className={styles.creatorMatchBody}>
                  <div className={styles.nameLine}>
                    <strong>{creator.name}</strong>
                    <span>{creator.rate}</span>
                  </div>
                  <p>{creator.category}</p>
                  <dl className={styles.creatorStats}>
                    <div>
                      <dt>Audience</dt>
                      <dd>{creator.audience}</dd>
                    </div>
                    <div>
                      <dt>Engagement</dt>
                      <dd>{creator.engagement}</dd>
                    </div>
                    <div>
                      <dt>Products</dt>
                      <dd>{creator.products}</dd>
                    </div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link
                      href={creator.href}
                      className={styles.secondaryButton}
                    >
                      View profile
                    </Link>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() =>
                        notify(
                          `${creator.name}'s ${creator.rate} rate and campaign terms opened.`,
                        )
                      }
                    >
                      Review terms
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.panel}>
          <PanelHeader
            eyebrow="Campaign gate"
            title="How products become available"
          />
          <ol className={styles.stepList}>
            <li>
              <span>1</span>
              <div>
                <strong>Select a creator</strong>
                <p>Review audience fit and conditions.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Accept the rate</strong>
                <p>Confirm attribution and reversal terms.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Choose DTC products</strong>
                <p>The creator can publish only eligible items.</p>
              </div>
            </li>
          </ol>
          <button
            type="button"
            className={styles.darkAction}
            onClick={() => openDialog("campaign")}
          >
            Create campaign <ArrowUpRight size={15} />
          </button>
        </aside>

        <section className={`${styles.panel} ${styles.panelFull}`}>
          <PanelHeader
            eyebrow="Recently reviewed"
            title="Creator rate comparison"
            caption="Rates apply only to eligible net DTC merchandise revenue."
          />
          <div className={styles.rateComparison}>
            {influencerMatches.map((creator) => (
              <div key={creator.name}>
                <Image src={creator.image} width={42} height={42} alt="" />
                <span>
                  <strong>{creator.name}</strong>
                  <small>{creator.category}</small>
                </span>
                <strong>{creator.rate}</strong>
                <span>{creator.products} eligible products</span>
                <SmallAction
                  onClick={() =>
                    notify(`${creator.name} added to the campaign shortlist.`)
                  }
                >
                  Shortlist
                </SmallAction>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CompanyPage({ notify }: Pick<ViewProps, "notify">) {
  const metrics: Metric[] = [
    {
      label: "Profile completeness",
      value: "92%",
      detail: "+4% this month",
      direction: "up",
      tone: "blue",
      icon: <Buildings size={18} />,
    },
    {
      label: "Merchant views",
      value: "1,284",
      detail: "+18% this period",
      direction: "up",
      tone: "mint",
      icon: <Storefront size={18} />,
    },
    {
      label: "Verified credentials",
      value: "7",
      detail: "2 renew next quarter",
      tone: "lime",
      icon: <ShieldCheck size={18} />,
    },
    {
      label: "Supported regions",
      value: "6",
      detail: "US, Canada and EU",
      icon: <MapPin size={18} />,
    },
  ];
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.companyHeroPanel}`}>
          <div className={styles.companyHeroImage}>
            <Image
              src="/media/partner-landing/supplier/supplier-merchant-hero.png"
              fill
              sizes="(max-width: 720px) 100vw, 55vw"
              alt="Northstar supplier and merchant partnership"
            />
          </div>
          <div className={styles.companyHeroContent}>
            <div className={styles.nameLine}>
              <StatusPill tone="mint">
                <CheckCircle size={12} weight="fill" /> Verified supplier
              </StatusPill>
              <span>4.8 merchant rating</span>
            </div>
            <h2>Northstar Uniform Manufacturing</h2>
            <p>
              Cut-and-sew manufacturing for medical uniforms and modern
              workwear, serving the United States and Canada.
            </p>
            <div className={styles.tagRow}>
              <Tag>Bulk</Tag>
              <Tag>Dropshipping</Tag>
              <Tag>DTC</Tag>
              <Tag>Private label</Tag>
            </div>
            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => notify("Company profile editor opened.")}
              >
                <PencilSimple size={14} /> Edit company page
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() =>
                  notify("Merchant-facing company preview opened.")
                }
              >
                Merchant preview
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => notify("Consumer DTC preview opened.")}
              >
                DTC preview
              </button>
            </div>
          </div>
        </section>

        <aside className={styles.panel}>
          <PanelHeader eyebrow="Profile readiness" title="Complete 3 details" />
          <ul className={styles.checkList}>
            <li>
              <CheckCircle size={16} weight="fill" /> Company story and
              capabilities
            </li>
            <li>
              <CheckCircle size={16} weight="fill" /> Production locations
            </li>
            <li>
              <Clock size={16} /> Private-label material library
            </li>
            <li>
              <Clock size={16} /> Canada shipping estimate
            </li>
            <li>
              <Clock size={16} /> ISO certificate renewal
            </li>
          </ul>
          <button
            type="button"
            className={styles.darkAction}
            onClick={() =>
              notify("The next incomplete company section is ready to edit.")
            }
          >
            Continue profile <ArrowUpRight size={15} />
          </button>
        </aside>

        <section className={styles.panel}>
          <PanelHeader eyebrow="Capabilities" title="Production profile" />
          <dl className={styles.detailList}>
            <div>
              <dt>Capacity</dt>
              <dd>18,000 units / month</dd>
            </div>
            <div>
              <dt>Lead time</dt>
              <dd>30–45 days</dd>
            </div>
            <div>
              <dt>Locations</dt>
              <dd>Los Angeles · Tijuana</dd>
            </div>
            <div>
              <dt>Customization</dt>
              <dd>Labels, colors, packaging</dd>
            </div>
          </dl>
        </section>
        <section className={styles.panel}>
          <PanelHeader eyebrow="Visibility" title="What each audience sees" />
          <div className={styles.visibilityCards}>
            <div>
              <Storefront size={18} />
              <strong>Merchants</strong>
              <span>Wholesale, MOQ, dropship and DTC disclosure</span>
            </div>
            <div>
              <UsersThree size={18} />
              <strong>Creators</strong>
              <span>Only accepted DTC campaign products</span>
            </div>
            <div>
              <ShoppingBagOpen size={18} />
              <strong>Consumers</strong>
              <span>Retail products, seller identity and policies</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProductsPage({ notify, openDialog }: Omit<ViewProps, "page">) {
  const [tab, setTab] = useState("All products");
  const metrics: Metric[] = [
    {
      label: "Active products",
      value: "84",
      detail: "Across all channels",
      tone: "blue",
      icon: <Package size={18} />,
    },
    {
      label: "Drafts",
      value: "12",
      detail: "5 need size data",
      tone: "lime",
      icon: <FileText size={18} />,
    },
    {
      label: "Pending review",
      value: "3",
      detail: "Expected within 24h",
      tone: "mint",
      icon: <Clock size={18} />,
    },
    {
      label: "Channel-ready",
      value: "79",
      detail: "94% of active catalog",
      direction: "up",
      icon: <CheckCircle size={18} />,
    },
  ];
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <section className={styles.panel}>
        <PanelHeader
          eyebrow="Shared catalog"
          title="Product library"
          caption="Shared facts update every enabled channel; prices and inventory remain separate."
          action={
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => openDialog("product")}
            >
              <Package size={14} /> Add product
            </button>
          }
        />
        <div
          className={styles.segmentedTabs}
          role="tablist"
          aria-label="Product status"
        >
          {["All products", "Active", "Draft", "Needs attention"].map(
            (item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                className={tab === item ? styles.segmentedActive : ""}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Selling modes</th>
                <th>Available inventory</th>
                <th>Status</th>
                <th>
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {productRows
                .filter(
                  (row) =>
                    tab === "All products" ||
                    (tab === "Needs attention"
                      ? row.status !== "Active"
                      : row.status === tab),
                )
                .map((row) => (
                  <tr key={row.sku}>
                    <td>
                      <div className={styles.productCell}>
                        <Image src={row.image} width={48} height={56} alt="" />
                        <span>
                          <strong>{row.name}</strong>
                          <small>{row.sku}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.tagRow}>
                        {row.modes.map((mode) => (
                          <Tag key={mode}>{mode}</Tag>
                        ))}
                      </div>
                    </td>
                    <td>{row.inventory} units</td>
                    <td>
                      <StatusPill
                        tone={
                          row.status === "Active"
                            ? "mint"
                            : row.status === "Review"
                              ? "lime"
                              : "neutral"
                        }
                      >
                        {row.status}
                      </StatusPill>
                    </td>
                    <td>
                      <SmallAction
                        onClick={() =>
                          notify(`${row.name} opened in the product editor.`)
                        }
                      >
                        Edit
                      </SmallAction>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SellingOptionsPage({ notify }: Pick<ViewProps, "notify">) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    "FlexPro Medical Scrub Set:Bulk": true,
    "FlexPro Medical Scrub Set:Dropship": true,
    "FlexPro Medical Scrub Set:DTC": true,
    "CoreFlex Zip Jacket:Bulk": true,
    "CoreFlex Zip Jacket:Dropship": true,
    "CoreFlex Zip Jacket:DTC": false,
    "Harbor Utility Overshirt:Bulk": true,
    "Harbor Utility Overshirt:Dropship": false,
    "Harbor Utility Overshirt:DTC": true,
  });
  const offers = [
    {
      product: "FlexPro Medical Scrub Set",
      bulk: "$22 · MOQ 100",
      dropship: "$31 · 1–2 days",
      dtc: "$59 · 920 units",
    },
    {
      product: "CoreFlex Zip Jacket",
      bulk: "$28 · MOQ 80",
      dropship: "$38 · 2 days",
      dtc: "$74 · 0 units",
    },
    {
      product: "Harbor Utility Overshirt",
      bulk: "$34 · MOQ 60",
      dropship: "$44 · 3 days",
      dtc: "$86 · 240 units",
    },
  ];
  const metrics: Metric[] = [
    {
      label: "Bulk enabled",
      value: "76",
      detail: "0% sales commission",
      tone: "blue",
      icon: <Buildings size={18} />,
    },
    {
      label: "Dropship enabled",
      value: "58",
      detail: "Neutral packaging",
      tone: "mint",
      icon: <Truck size={18} />,
    },
    {
      label: "DTC enabled",
      value: "84",
      detail: "Independent retail stock",
      tone: "lime",
      icon: <ShoppingBagOpen size={18} />,
    },
    {
      label: "Needs attention",
      value: "5",
      detail: "Missing policy or price",
      icon: <Clock size={18} />,
    },
  ];
  function toggle(product: string, channel: string) {
    const key = `${product}:${channel}`;
    const next = !enabled[key];
    setEnabled((current) => ({ ...current, [key]: next }));
    notify(`${channel} ${next ? "enabled" : "paused"} for ${product}.`);
  }
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <section className={styles.panel}>
        <PanelHeader
          eyebrow="Channel controls"
          title="Product selling options"
          caption="Turning off one channel does not change the others or cancel accepted orders."
        />
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Bulk Wholesale</th>
                <th>Dropshipping</th>
                <th>Direct-to-consumer</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((row) => (
                <tr key={row.product}>
                  <td>
                    <strong>{row.product}</strong>
                  </td>
                  {(["Bulk", "Dropship", "DTC"] as const).map((channel) => {
                    const key = `${row.product}:${channel}`;
                    const detail =
                      channel === "Bulk"
                        ? row.bulk
                        : channel === "Dropship"
                          ? row.dropship
                          : row.dtc;
                    return (
                      <td key={channel}>
                        <div className={styles.offerCell}>
                          <button
                            type="button"
                            className={
                              enabled[key]
                                ? styles.channelOn
                                : styles.channelOff
                            }
                            onClick={() => toggle(row.product, channel)}
                          >
                            {enabled[key] ? "On" : "Off"}
                          </button>
                          <span>{detail}</span>
                          <button
                            type="button"
                            className={styles.inlineEdit}
                            onClick={() =>
                              notify(
                                `${channel} offer editor opened for ${row.product}.`,
                              )
                            }
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MessagesPage({ notify }: Pick<ViewProps, "notify">) {
  const threads = [
    {
      id: "atlas",
      name: "Atlas Retail Group",
      subject: "RFQ · 500 FlexPro sets",
      time: "8m",
      unread: 3,
      body: "Can you confirm the navy and ceil-blue allocation and quote delivery to Toronto?",
    },
    {
      id: "fieldwork",
      name: "Fieldwork Supply Co.",
      subject: "Sample request · Utility Overshirt",
      time: "1h",
      unread: 1,
      body: "We would like one sample in charcoal, size M, before finalizing our opening order.",
    },
    {
      id: "studio",
      name: "Studio North Retail",
      subject: "Dropship packaging requirements",
      time: "3h",
      unread: 0,
      body: "Please review our neutral packaging and packing-slip requirements for approval.",
    },
  ];
  const [selected, setSelected] = useState(threads[0]);
  const [reply, setReply] = useState("");
  const metrics: Metric[] = [
    {
      label: "Unread messages",
      value: "7",
      detail: "Across 4 relationships",
      tone: "blue",
      icon: <EnvelopeSimple size={18} />,
    },
    {
      label: "Open RFQs",
      value: "6",
      detail: "$146k merchandise",
      tone: "lime",
      icon: <FileText size={18} />,
    },
    {
      label: "Sample requests",
      value: "3",
      detail: "2 due today",
      tone: "mint",
      icon: <Package size={18} />,
    },
    {
      label: "Response time",
      value: "2.1h",
      detail: "18% faster",
      direction: "up",
      icon: <Clock size={18} />,
    },
  ];
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <section className={`${styles.panel} ${styles.messagingPanel}`}>
        <div className={styles.threadList}>
          <PanelHeader eyebrow="Inbox" title="Merchant conversations" />
          {threads.map((thread) => (
            <button
              type="button"
              key={thread.id}
              className={selected.id === thread.id ? styles.threadActive : ""}
              onClick={() => setSelected(thread)}
            >
              <span className={styles.identityIcon}>
                <Storefront size={18} />
              </span>
              <span>
                <strong>{thread.name}</strong>
                <small>{thread.subject}</small>
              </span>
              <span className={styles.threadMeta}>
                {thread.time}
                {thread.unread ? <i>{thread.unread}</i> : null}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.conversationPane}>
          <div className={styles.conversationHeader}>
            <div>
              <strong>{selected.name}</strong>
              <span>{selected.subject}</span>
            </div>
            <StatusPill tone="mint">Protected relationship</StatusPill>
          </div>
          <div className={styles.conversationBody}>
            <div className={styles.messageBubbleIncoming}>
              <strong>{selected.name}</strong>
              <p>{selected.body}</p>
              <span>Today · {selected.time} ago</span>
            </div>
            <div className={styles.messageBubbleOutgoing}>
              <strong>You</strong>
              <p>
                Thanks. We have checked availability and can reserve the
                requested units while the quote is open.
              </p>
              <span>Draft response</span>
            </div>
          </div>
          <form
            className={styles.replyForm}
            onSubmit={(event) => {
              event.preventDefault();
              if (!reply.trim()) return;
              notify(`Reply sent to ${selected.name}`);
              setReply("");
            }}
          >
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Write a reply…"
              aria-label="Message reply"
            />
            <button type="submit" aria-label="Send reply">
              <PaperPlaneTilt size={17} weight="fill" />
            </button>
          </form>
        </div>
        <aside className={styles.quoteSummary}>
          <PanelHeader
            eyebrow="Linked RFQ"
            title="RFQ-2084"
            caption="Expires 17 Aug 2026"
          />
          <dl className={styles.detailList}>
            <div>
              <dt>Product</dt>
              <dd>FlexPro Scrub Set</dd>
            </div>
            <div>
              <dt>Quantity</dt>
              <dd>500 sets</dd>
            </div>
            <div>
              <dt>Quoted price</dt>
              <dd>$20 / set</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>$10,000</dd>
            </div>
            <div>
              <dt>Lead time</dt>
              <dd>30–45 days</dd>
            </div>
          </dl>
          <button
            type="button"
            className={styles.darkAction}
            onClick={() => notify("RFQ-2084 revision editor opened.")}
          >
            Revise quote <PencilSimple size={14} />
          </button>
        </aside>
      </section>
    </div>
  );
}

function OrdersPage({ notify }: Pick<ViewProps, "notify">) {
  const baseOrders = [
    {
      id: "PS-10482",
      buyer: "Atlas Retail Group",
      channel: "Bulk",
      total: "$10,000.00",
      placed: "10 Aug",
      status: "Awaiting acceptance",
    },
    {
      id: "PS-10479",
      buyer: "Urban Shift Store",
      channel: "Dropship",
      total: "$48.40",
      placed: "10 Aug",
      status: "Ready to ship",
    },
    {
      id: "PS-10474",
      buyer: "Emma W.",
      channel: "DTC",
      total: "$68.20",
      placed: "9 Aug",
      status: "Shipped",
    },
    {
      id: "PS-10461",
      buyer: "Fieldwork Supply Co.",
      channel: "Bulk",
      total: "$6,720.00",
      placed: "8 Aug",
      status: "In production",
    },
    {
      id: "PS-10448",
      buyer: "Mason K.",
      channel: "DTC",
      total: "$92.00",
      placed: "7 Aug",
      status: "Return open",
    },
  ];
  const [orders, setOrders] = useState(baseOrders);
  const [channel, setChannel] = useState("All channels");
  const metrics: Metric[] = [
    {
      label: "Awaiting acceptance",
      value: "4",
      detail: "Oldest 7 hours",
      tone: "lime",
      icon: <Clock size={18} />,
    },
    {
      label: "In production",
      value: "18",
      detail: "$74k merchandise",
      tone: "blue",
      icon: <Package size={18} />,
    },
    {
      label: "Shipments due",
      value: "7",
      detail: "3 due today",
      tone: "mint",
      icon: <Truck size={18} />,
    },
    {
      label: "Returns & claims",
      value: "3",
      detail: "1 needs evidence",
      icon: <FileText size={18} />,
    },
  ];
  function advanceOrder(id: string) {
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? {
              ...order,
              status:
                order.status === "Awaiting acceptance"
                  ? "In production"
                  : order.status === "Ready to ship"
                    ? "Shipped"
                    : order.status,
            }
          : order,
      ),
    );
    notify(`${id} moved to its next fulfillment status.`);
  }
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <section className={styles.panel}>
        <PanelHeader
          eyebrow="One order center"
          title="Bulk, Dropship and DTC orders"
          caption="Acceptance, production, shipment, delivery, return and dispute status stay together."
          action={
            <div className={styles.segmentedTabs}>
              {["All channels", "Bulk", "Dropship", "DTC"].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={channel === item ? styles.segmentedActive : ""}
                  onClick={() => setChannel(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          }
        />
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Buyer</th>
                <th>Channel</th>
                <th>Total</th>
                <th>Placed</th>
                <th>Status</th>
                <th>
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter(
                  (order) =>
                    channel === "All channels" || order.channel === channel,
                )
                .map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.id}</strong>
                    </td>
                    <td>{order.buyer}</td>
                    <td>
                      <Tag>{order.channel}</Tag>
                    </td>
                    <td>
                      <strong>{order.total}</strong>
                    </td>
                    <td>{order.placed}</td>
                    <td>
                      <StatusPill
                        tone={
                          order.status === "Awaiting acceptance" ||
                          order.status === "Return open"
                            ? "lime"
                            : order.status === "Shipped"
                              ? "mint"
                              : "neutral"
                        }
                      >
                        {order.status}
                      </StatusPill>
                    </td>
                    <td>
                      <SmallAction onClick={() => advanceOrder(order.id)}>
                        {order.status === "Awaiting acceptance"
                          ? "Accept"
                          : order.status === "Ready to ship"
                            ? "Add tracking"
                            : "Open"}
                      </SmallAction>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RelationshipsPage({ notify, openDialog }: Omit<ViewProps, "page">) {
  const rows = [
    {
      merchant: "Atlas Retail Group",
      trigger: "RFQ accepted",
      introduced: "2 Aug 2026",
      protected: "2 Feb 2028",
      orders: "4 · $38,420",
      terms: "Net 30 · Tier 2",
      status: "Active",
    },
    {
      merchant: "Fieldwork Supply Co.",
      trigger: "Sample request",
      introduced: "28 Jul 2026",
      protected: "28 Jan 2028",
      orders: "2 · $12,940",
      terms: "50% deposit",
      status: "Active",
    },
    {
      merchant: "Studio North Retail",
      trigger: "Message",
      introduced: "20 Jul 2026",
      protected: "20 Jan 2028",
      orders: "0",
      terms: "In negotiation",
      status: "Introduced",
    },
    {
      merchant: "Urban Shift Store",
      trigger: "Dropship offer",
      introduced: "13 Jun 2026",
      protected: "13 Dec 2027",
      orders: "186 · $8,944",
      terms: "Weekly payout",
      status: "Active",
    },
  ];
  const metrics: Metric[] = [
    {
      label: "Active relationships",
      value: "18",
      detail: "+3 this month",
      direction: "up",
      tone: "blue",
      icon: <Handshake size={18} />,
    },
    {
      label: "Introductions",
      value: "31",
      detail: "6 awaiting reply",
      tone: "lime",
      icon: <Storefront size={18} />,
    },
    {
      label: "Protected volume",
      value: "$128k",
      detail: "Trailing 90 days",
      tone: "mint",
      icon: <ShieldCheck size={18} />,
    },
    {
      label: "Repeat buyers",
      value: "72%",
      detail: "Across active merchants",
      icon: <TrendUp size={18} />,
    },
  ];
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <section className={styles.protectedNotice}>
        <ShieldCheck size={20} weight="fill" />
        <div>
          <strong>Protected relationship records</strong>
          <span>
            Qualifying introductions and transactions remain recorded with their
            protected-through dates.
          </span>
        </div>
        <button
          type="button"
          onClick={() => notify("Relationship protection details opened.")}
        >
          View details
        </button>
      </section>
      <section className={styles.panel}>
        <PanelHeader
          eyebrow="Merchant network"
          title="Relationship records"
          caption="First interaction, negotiated terms and order history in one place."
          action={
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => openDialog("partner")}
            >
              Find merchants
            </button>
          }
        />
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Introduction</th>
                <th>Protected through</th>
                <th>Order history</th>
                <th>Terms</th>
                <th>Status</th>
                <th>
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.merchant}>
                  <td>
                    <strong>{row.merchant}</strong>
                    <small className={styles.cellSubtext}>
                      {row.trigger} · {row.introduced}
                    </small>
                  </td>
                  <td>{row.trigger}</td>
                  <td>{row.protected}</td>
                  <td>{row.orders}</td>
                  <td>{row.terms}</td>
                  <td>
                    <StatusPill
                      tone={row.status === "Active" ? "mint" : "lime"}
                    >
                      {row.status}
                    </StatusPill>
                  </td>
                  <td>
                    <SmallAction
                      onClick={() =>
                        notify(`${row.merchant} relationship record opened.`)
                      }
                    >
                      Open
                    </SmallAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CampaignsPage({ notify, openDialog }: Omit<ViewProps, "page">) {
  const [accepted, setAccepted] = useState<string[]>([]);
  const proposals = influencerMatches.slice(0, 2);
  const metrics: Metric[] = [
    {
      label: "Active campaigns",
      value: "6",
      detail: "84 eligible products",
      tone: "blue",
      icon: <Megaphone size={18} />,
    },
    {
      label: "Pending proposals",
      value: String(Math.max(0, 4 - accepted.length)),
      detail: "Rates need review",
      tone: "lime",
      icon: <Clock size={18} />,
    },
    {
      label: "Qualified clicks",
      value: "8,420",
      detail: "+24% this period",
      direction: "up",
      tone: "mint",
      icon: <ChartLineUp size={18} />,
    },
    {
      label: "Pending commission",
      value: "$2,184",
      detail: "After validation",
      icon: <Wallet size={18} />,
    },
  ];
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.panelWide}`}>
          <PanelHeader
            eyebrow="Rates to review"
            title="Creator proposals"
            caption="Products become available only after you accept the displayed rate and campaign terms."
          />
          <div className={styles.proposalList}>
            {proposals.map((creator) => {
              const isAccepted = accepted.includes(creator.name);
              return (
                <article key={creator.name}>
                  <Image
                    src={creator.image}
                    width={64}
                    height={64}
                    alt={creator.name}
                  />
                  <div>
                    <div className={styles.nameLine}>
                      <strong>{creator.name}</strong>
                      <StatusPill tone="lime">
                        {creator.score}% match
                      </StatusPill>
                    </div>
                    <p>
                      {creator.category} · {creator.audience} audience ·{" "}
                      {creator.engagement} engagement
                    </p>
                    <div className={styles.tagRow}>
                      <Tag>30-day attribution</Tag>
                      <Tag>Last eligible click</Tag>
                      <Tag>{creator.products} products</Tag>
                    </div>
                  </div>
                  <div className={styles.proposalRate}>
                    <span>Requested rate</span>
                    <strong>{creator.rate}</strong>
                  </div>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() =>
                        notify(`${creator.name} campaign terms opened.`)
                      }
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      disabled={isAccepted}
                      className={
                        isAccepted ? styles.savedButton : styles.primaryButton
                      }
                      onClick={() => {
                        setAccepted((current) => [...current, creator.name]);
                        notify(
                          `${creator.name}'s ${creator.rate} rate accepted. Eligible DTC products are now available.`,
                        );
                      }}
                    >
                      {isAccepted ? (
                        <>
                          <Check size={13} /> Accepted
                        </>
                      ) : (
                        "Accept rate"
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <aside className={styles.panel}>
          <PanelHeader eyebrow="Attribution" title="Launch campaign rules" />
          <dl className={styles.detailList}>
            <div>
              <dt>Qualifying event</dt>
              <dd>Eligible product click</dd>
            </div>
            <div>
              <dt>Attribution window</dt>
              <dd>30 days</dd>
            </div>
            <div>
              <dt>Multiple referrals</dt>
              <dd>Last eligible click</dd>
            </div>
            <div>
              <dt>Commission basis</dt>
              <dd>Net merchandise</dd>
            </div>
            <div>
              <dt>Return handling</dt>
              <dd>Proportional reversal</dd>
            </div>
          </dl>
          <button
            type="button"
            className={styles.darkAction}
            onClick={() => openDialog("campaign")}
          >
            Create campaign <ArrowUpRight size={15} />
          </button>
        </aside>
        <section className={`${styles.panel} ${styles.panelFull}`}>
          <PanelHeader
            eyebrow="Active campaigns"
            title="Campaign performance"
          />
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Creator</th>
                  <th>Rate</th>
                  <th>Products</th>
                  <th>Qualified clicks</th>
                  <th>Attributed sales</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>FlexPro launch</strong>
                  </td>
                  <td>Maya Laurent</td>
                  <td>12%</td>
                  <td>24</td>
                  <td>3,482</td>
                  <td>$14,620</td>
                  <td>$1,754 pending</td>
                  <td>
                    <StatusPill tone="mint">Active</StatusPill>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Workday essentials</strong>
                  </td>
                  <td>Sienna Brooks</td>
                  <td>10%</td>
                  <td>18</td>
                  <td>1,884</td>
                  <td>$7,940</td>
                  <td>$794 pending</td>
                  <td>
                    <StatusPill tone="mint">Active</StatusPill>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function PaymentsPage({ notify, openDialog }: Omit<ViewProps, "page">) {
  const metrics: Metric[] = [
    {
      label: "Available balance",
      value: "$18,420",
      detail: "+$6,840 this week",
      direction: "up",
      tone: "blue",
      icon: <Wallet size={18} />,
    },
    {
      label: "Pending payout",
      value: "$7,260",
      detail: "Releases 14 Aug",
      tone: "mint",
      icon: <Clock size={18} />,
    },
    {
      label: "Influencer commission",
      value: "$2,184",
      detail: "Pending validation",
      tone: "lime",
      icon: <Megaphone size={18} />,
    },
    {
      label: "Reserve",
      value: "$1,040",
      detail: "4.1% of unsettled",
      icon: <ShieldCheck size={18} />,
    },
  ];
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.balancePanel}`}>
          <div>
            <span className={styles.cardEyebrow}>Available to pay out</span>
            <strong>$18,420.60</strong>
            <p>Business checking •••• 4821</p>
          </div>
          <button
            type="button"
            className={styles.darkAction}
            onClick={() => openDialog("payout")}
          >
            Request payout <ArrowUpRight size={15} />
          </button>
        </section>
        <aside className={styles.panel}>
          <PanelHeader
            eyebrow="Plan usage"
            title="Growth plan"
            caption="84 of 250 active products"
          />
          <div className={styles.progressTrack}>
            <span style={{ width: "34%" }} />
          </div>
          <div className={styles.progressLabels}>
            <span>
              <strong>84</strong> active
            </span>
            <span>166 remaining</span>
          </div>
          <Link
            href="/suppliers/dashboard/products"
            className={styles.textLink}
          >
            Manage active products <ArrowUpRight size={13} />
          </Link>
        </aside>
        <section className={`${styles.panel} ${styles.panelWide}`}>
          <PanelHeader
            eyebrow="Transaction statement"
            title="What changed your balance"
            caption="Sales, processing, refunds, commissions and try-on usage reconcile here."
          />
          <div className={styles.statementList}>
            {[
              ["Gross merchandise received", "+$42,680.00", "positive"],
              ["Processing charges", "−$1,284.40", "neutral"],
              ["Influencer commissions", "−$2,184.00", "neutral"],
              ["Completed DTC try-ons", "−$486.00", "neutral"],
              ["Refunds and return adjustments", "−$1,920.00", "neutral"],
              ["Net payable this period", "$36,805.60", "strong"],
            ].map(([label, value, tone]) => (
              <div
                key={label}
                className={tone === "strong" ? styles.statementTotal : ""}
              >
                <span>{label}</span>
                <strong
                  className={tone === "positive" ? styles.positiveValue : ""}
                >
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </section>
        <section className={`${styles.panel} ${styles.panelFull}`}>
          <PanelHeader
            eyebrow="Payout history"
            title="Recent transfers"
            action={
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => notify("Payout statement downloaded.")}
              >
                <DownloadSimple size={14} /> Download
              </button>
            }
          />
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Payout</th>
                  <th>Period</th>
                  <th>Gross</th>
                  <th>Adjustments</th>
                  <th>Net payout</th>
                  <th>Destination</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>PO-8042</strong>
                  </td>
                  <td>28 Jul–3 Aug</td>
                  <td>$28,440.00</td>
                  <td>−$3,684.20</td>
                  <td>$24,755.80</td>
                  <td>•••• 4821</td>
                  <td>
                    <StatusPill tone="mint">Paid</StatusPill>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>PO-7961</strong>
                  </td>
                  <td>21–27 Jul</td>
                  <td>$22,186.00</td>
                  <td>−$2,194.60</td>
                  <td>$19,991.40</td>
                  <td>•••• 4821</td>
                  <td>
                    <StatusPill tone="mint">Paid</StatusPill>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function PerformancePage({ notify }: Pick<ViewProps, "notify">) {
  const [metric, setMetric] = useState("Demand");
  const metrics: Metric[] = [
    {
      label: "Gross merchandise",
      value: "$126k",
      detail: "+18% vs last period",
      direction: "up",
      tone: "blue",
      icon: <Wallet size={18} />,
    },
    {
      label: "Quote conversion",
      value: "34.8%",
      detail: "+4.2 points",
      direction: "up",
      tone: "lime",
      icon: <FileText size={18} />,
    },
    {
      label: "On-time shipment",
      value: "96.2%",
      detail: "Target 95%",
      tone: "mint",
      icon: <Truck size={18} />,
    },
    {
      label: "Return rate",
      value: "4.1%",
      detail: "0.8 points lower",
      direction: "down",
      icon: <Package size={18} />,
    },
  ];
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <div className={styles.contentGrid}>
        <section
          className={`${styles.panel} ${styles.panelWide} ${styles.performanceChartPanel}`}
        >
          <PanelHeader
            eyebrow="Channel trend"
            title={`${metric} by selling channel`}
            caption="Bulk, Dropship and DTC stay separated for clearer decisions."
            action={
              <div className={styles.segmentedTabs}>
                {["Demand", "Revenue", "Orders"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={metric === item ? styles.segmentedActive : ""}
                    onClick={() => setMetric(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            }
          />
          <div className={styles.legendRow}>
            <span>
              <i className={styles.legendBulk} /> Bulk
            </span>
            <span>
              <i className={styles.legendDropship} /> Dropship
            </span>
            <span>
              <i className={styles.legendDtc} /> DTC
            </span>
          </div>
          <div
            className={styles.performanceChart}
            aria-label={`${metric} by channel chart`}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              initialDimension={{ width: 700, height: 270 }}
            >
              <LineChart
                data={performanceTrend}
                margin={{ top: 20, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#efefef" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#77777e" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#8b8b91" }}
                />
                <Tooltip
                  contentStyle={{ border: 0, borderRadius: 12, fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="bulk"
                  stroke="#17171a"
                  strokeWidth={2.2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dropship"
                  stroke="#72d2cc"
                  strokeWidth={2.2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dtc"
                  stroke="#aebecf"
                  strokeWidth={2.2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <aside className={styles.panel}>
          <PanelHeader eyebrow="Fulfillment" title="Operational health" />
          <div className={styles.healthScores}>
            <div>
              <span>Bulk on-time</span>
              <strong>94%</strong>
              <i>
                <b style={{ width: "94%" }} />
              </i>
            </div>
            <div>
              <span>Dropship on-time</span>
              <strong>98%</strong>
              <i>
                <b style={{ width: "98%" }} />
              </i>
            </div>
            <div>
              <span>DTC on-time</span>
              <strong>97%</strong>
              <i>
                <b style={{ width: "97%" }} />
              </i>
            </div>
          </div>
          <button
            type="button"
            className={styles.textLink}
            onClick={() => notify("Fulfillment performance details opened.")}
          >
            View shipment detail <ArrowUpRight size={13} />
          </button>
        </aside>
        <section className={`${styles.panel} ${styles.panelFull}`}>
          <PanelHeader
            eyebrow="Channel comparison"
            title="Commercial performance"
          />
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Views</th>
                  <th>Requests / orders</th>
                  <th>Conversion</th>
                  <th>Cancellation</th>
                  <th>Returns</th>
                  <th>Net payout</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Tag>Bulk</Tag>
                  </td>
                  <td>4,820</td>
                  <td>68 RFQs</td>
                  <td>34.8%</td>
                  <td>1.2%</td>
                  <td>2.0%</td>
                  <td>
                    <strong>$76,420</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <Tag>Dropship</Tag>
                  </td>
                  <td>18,640</td>
                  <td>486 orders</td>
                  <td>2.6%</td>
                  <td>1.8%</td>
                  <td>4.4%</td>
                  <td>
                    <strong>$24,880</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <Tag>DTC</Tag>
                  </td>
                  <td>24,180</td>
                  <td>394 orders</td>
                  <td>1.6%</td>
                  <td>2.1%</td>
                  <td>5.2%</td>
                  <td>
                    <strong>$25,260</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function PoliciesPage({ notify }: Pick<ViewProps, "notify">) {
  const policies = [
    {
      name: "Bulk Wholesale",
      detail: "Payments, production, shipping and claims",
      version: "v2.1",
      accepted: "2 Aug 2026",
      tone: "mint",
    },
    {
      name: "Dropshipping",
      detail: "Fulfillment, packaging, inventory and returns",
      version: "v1.8",
      accepted: "2 Aug 2026",
      tone: "mint",
    },
    {
      name: "DTC Seller",
      detail: "Consumer shipping, returns, support and try-on rate",
      version: "v2.4",
      accepted: "2 Aug 2026",
      tone: "lime",
    },
  ];
  const metrics: Metric[] = [
    {
      label: "Accepted schedules",
      value: "4",
      detail: "Core + 3 selling modes",
      tone: "blue",
      icon: <ShieldCheck size={18} />,
    },
    {
      label: "Updates to review",
      value: "1",
      detail: "DTC return timing",
      tone: "lime",
      icon: <Clock size={18} />,
    },
    {
      label: "Custom addenda",
      value: "2",
      detail: "Enterprise merchants",
      tone: "mint",
      icon: <FileText size={18} />,
    },
    {
      label: "Policy coverage",
      value: "100%",
      detail: "All active offers",
      icon: <CheckCircle size={18} />,
    },
  ];
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.panelWide}`}>
          <PanelHeader
            eyebrow="Mode-specific acceptance"
            title="Marketplace schedules"
            caption="Each enabled selling mode keeps its own accepted version and commercial summary."
          />
          <div className={styles.policyList}>
            {policies.map((policy) => (
              <article key={policy.name}>
                <span className={styles.identityIcon}>
                  <ShieldCheck size={20} weight="fill" />
                </span>
                <div>
                  <strong>{policy.name}</strong>
                  <p>{policy.detail}</p>
                </div>
                <div>
                  <span>{policy.version}</span>
                  <small>Accepted {policy.accepted}</small>
                </div>
                <StatusPill tone={policy.tone}>
                  {policy.tone === "lime" ? "Review update" : "Current"}
                </StatusPill>
                <button
                  type="button"
                  className={styles.iconTextButton}
                  onClick={() =>
                    notify(`${policy.name} ${policy.version} downloaded.`)
                  }
                >
                  <DownloadSimple size={15} /> Download
                </button>
              </article>
            ))}
          </div>
        </section>
        <aside className={styles.panel}>
          <PanelHeader
            eyebrow="Policy alert"
            title="DTC return timing changed"
            caption="Review the commercial summary before accepting version 2.5."
          />
          <div className={styles.policyAlert}>
            <Clock size={20} />
            <strong>Effective 24 Aug 2026</strong>
            <span>Existing accepted orders keep their displayed terms.</span>
          </div>
          <button
            type="button"
            className={styles.darkAction}
            onClick={() => notify("DTC Seller Schedule v2.5 review opened.")}
          >
            Review update <ArrowUpRight size={15} />
          </button>
        </aside>
        <section className={styles.panel}>
          <PanelHeader
            eyebrow="Your policies"
            title="Published channel policies"
          />
          <dl className={styles.detailList}>
            <div>
              <dt>Bulk claims</dt>
              <dd>14 days from delivery</dd>
            </div>
            <div>
              <dt>Dropship handling</dt>
              <dd>1–2 business days</dd>
            </div>
            <div>
              <dt>DTC returns</dt>
              <dd>30 days from delivery</dd>
            </div>
            <div>
              <dt>Customer service</dt>
              <dd>Mon–Fri · 9am–5pm PT</dd>
            </div>
          </dl>
          <button
            type="button"
            className={styles.textLink}
            onClick={() => notify("Published policy editor opened.")}
          >
            Edit published policies <PencilSimple size={13} />
          </button>
        </section>
        <section className={styles.panel}>
          <PanelHeader eyebrow="Acceptance history" title="Recent records" />
          <ul className={styles.activityList}>
            <li>
              <CheckCircle size={15} weight="fill" />
              <span>
                <strong>Core Marketplace Terms v3.2</strong>
                <small>Accepted by Elena Vasquez · 2 Aug</small>
              </span>
            </li>
            <li>
              <CheckCircle size={15} weight="fill" />
              <span>
                <strong>DTC campaign terms · Maya Laurent</strong>
                <small>Accepted by David Chen · 6 Aug</small>
              </span>
            </li>
            <li>
              <FileText size={15} />
              <span>
                <strong>Atlas custom payment addendum</strong>
                <small>Added by Marcus Reed · 8 Aug</small>
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function TeamPage({ notify, openDialog }: Omit<ViewProps, "page">) {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    rfqs: true,
    orders: true,
    payouts: false,
    campaigns: true,
  });
  const team = [
    {
      name: "Marcus Reed",
      role: "Owner",
      email: "marcus@northstar.co",
      image: "/images/landing/avatar-marcus.png",
      access: "All access",
    },
    {
      name: "Elena Vasquez",
      role: "Sales manager",
      email: "elena@northstar.co",
      image: "/images/landing/avatar-elena.png",
      access: "Sales · Partners",
    },
    {
      name: "David Chen",
      role: "Catalog manager",
      email: "david@northstar.co",
      image: "/images/landing/avatar-david.png",
      access: "Catalog · Campaigns",
    },
    {
      name: "Sarah Brooks",
      role: "Finance manager",
      email: "sarah@northstar.co",
      image: "/images/landing/avatar-sarah.png",
      access: "Payments · Reports",
    },
  ];
  const metrics: Metric[] = [
    {
      label: "Active team members",
      value: "9",
      detail: "4 manager roles",
      tone: "blue",
      icon: <UsersThree size={18} />,
    },
    {
      label: "Pending invitations",
      value: "2",
      detail: "Expire in 5 days",
      tone: "lime",
      icon: <EnvelopeSimple size={18} />,
    },
    {
      label: "Selling modes",
      value: "3",
      detail: "Bulk, Dropship and DTC",
      tone: "mint",
      icon: <SlidersHorizontalIcon />,
    },
    {
      label: "Account security",
      value: "Strong",
      detail: "2FA required",
      icon: <ShieldCheck size={18} />,
    },
  ];
  return (
    <div className={styles.pageStack}>
      <MetricStrip metrics={metrics} />
      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.panelWide}`}>
          <PanelHeader
            eyebrow="Authorized users"
            title="Northstar team"
            caption="Give each person only the workspace access they need."
            action={
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => openDialog("manager")}
              >
                <UsersThree size={14} /> Add manager
              </button>
            }
          />
          <div className={styles.teamList}>
            {team.map((member) => (
              <article key={member.email}>
                <Image src={member.image} width={46} height={46} alt="" />
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                </div>
                <StatusPill tone={member.role === "Owner" ? "lime" : "neutral"}>
                  {member.role}
                </StatusPill>
                <span>{member.access}</span>
                <SmallAction
                  onClick={() => notify(`${member.name}'s permissions opened.`)}
                >
                  Manage
                </SmallAction>
              </article>
            ))}
          </div>
        </section>
        <aside className={styles.panel}>
          <PanelHeader eyebrow="Selling-mode access" title="Account roles" />
          <div className={styles.modeStatus}>
            <div>
              <Buildings size={17} />
              <span>
                <strong>Bulk Wholesale</strong>
                <small>Enabled</small>
              </span>
              <StatusPill tone="mint">On</StatusPill>
            </div>
            <div>
              <Truck size={17} />
              <span>
                <strong>Dropshipping</strong>
                <small>Enabled</small>
              </span>
              <StatusPill tone="mint">On</StatusPill>
            </div>
            <div>
              <ShoppingBagOpen size={17} />
              <span>
                <strong>Direct-to-consumer</strong>
                <small>Enabled</small>
              </span>
              <StatusPill tone="mint">On</StatusPill>
            </div>
          </div>
          <button
            type="button"
            className={styles.textLink}
            onClick={() => notify("Selling-mode access settings opened.")}
          >
            Manage account roles <ArrowUpRight size={13} />
          </button>
        </aside>
        <section className={styles.panel}>
          <PanelHeader eyebrow="Notifications" title="Operational alerts" />
          <div className={styles.preferenceList}>
            {[
              ["rfqs", "New RFQs and samples"],
              ["orders", "Order and shipment deadlines"],
              ["payouts", "Payout and reserve updates"],
              ["campaigns", "Influencer proposals"],
            ].map(([id, label]) => (
              <label key={id}>
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={notifications[id]}
                  onChange={() =>
                    setNotifications((current) => ({
                      ...current,
                      [id]: !current[id],
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </section>
        <section className={styles.panel}>
          <PanelHeader eyebrow="Support" title="Supplier success contact" />
          <div className={styles.supportContact}>
            <Image
              src="/images/landing/avatar-sarah.png"
              width={50}
              height={50}
              alt=""
            />
            <span>
              <strong>Amelia Hart</strong>
              <small>Supplier success manager</small>
            </span>
          </div>
          <button
            type="button"
            className={styles.darkAction}
            onClick={() =>
              notify("A support conversation with Amelia is ready.")
            }
          >
            Message support <EnvelopeSimple size={14} />
          </button>
        </section>
      </div>
    </div>
  );
}

function SlidersHorizontalIcon() {
  return <CreditCard size={18} aria-hidden />;
}
