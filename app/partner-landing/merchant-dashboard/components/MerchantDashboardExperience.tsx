"use client";

import {
  ArrowClockwise,
  ArrowRight,
  ChartLineUp,
  CheckCircle,
  ClipboardText,
  ClockCountdown,
  Coins,
  Database,
  DownloadSimple,
  Eye,
  FileText,
  FunnelSimple,
  GearSix,
  Handbag,
  House,
  LinkSimple,
  LockKey,
  MagnifyingGlass,
  Package,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Sparkle,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MERCHANT_DASHBOARD_DATA } from "../data/merchantDashboardData";
import { useMerchantDashboard } from "../hooks/useMerchantDashboard";
import type {
  MerchantDashboardSection,
  MerchantFeatureCard,
  MerchantField,
  MerchantIconName,
  MerchantMetric,
  MerchantStatus,
  MerchantTabView,
  MerchantTimelineItem,
  MerchantTone,
} from "../types";
import { BillingHubExperience } from "./BillingHubExperience";
import { CreatorPartnershipsExperience } from "./CreatorPartnershipsExperience";
import { AccountGovernanceWorkspace } from "./AccountGovernanceWorkspace";
import { MerchantReportsExperience } from "./reports/MerchantReportsExperience";
import { ShopperBehaviorExperience } from "./shopper-behavior/ShopperBehaviorExperience";
import styles from "./merchantDashboard.module.css";
import { ProductOperationsExperience } from "./ProductOperationsExperience";
import {
  MerchantPreviewDrawer,
  type MerchantPreviewDrawerContent,
} from "./MerchantPreviewDrawer";

type Icon = ComponentType<{
  size?: number;
  weight?: "regular" | "fill" | "duotone" | "bold";
  "aria-hidden"?: boolean;
}>;

const navigation: Array<{
  id: MerchantDashboardSection;
  label: string;
  href: string;
  icon: Icon;
}> = [
  {
    id: "overview",
    label: "Overview",
    href: "/merchants/dashboard",
    icon: House,
  },
  {
    id: "products",
    label: "Products",
    href: "/merchants/dashboard/products",
    icon: Package,
  },
  {
    id: "integrations",
    label: "Shopper Behavior",
    href: "/merchants/dashboard/integrations",
    icon: Eye,
  },
  {
    id: "commerce",
    label: "Commerce",
    href: "/merchants/dashboard/commerce",
    icon: ShoppingCart,
  },
  {
    id: "campaigns",
    label: "Creators",
    href: "/merchants/dashboard/campaigns",
    icon: UsersThree,
  },
  {
    id: "billing",
    label: "Billing & Reports",
    href: "/merchants/dashboard/billing",
    icon: ChartLineUp,
  },
  {
    id: "account",
    label: "Account & Governance",
    href: "/merchants/dashboard/account",
    icon: GearSix,
  },
];

const icons: Record<MerchantIconName, Icon> = {
  activity: ClipboardText,
  agreement: FileText,
  ai: Sparkle,
  attribution: LinkSimple,
  billing: Coins,
  campaign: UsersThree,
  cart: ShoppingCart,
  catalog: Package,
  connection: Database,
  contact: UsersThree,
  decision: CheckCircle,
  document: FileText,
  incident: WarningCircle,
  order: Handbag,
  permission: ShieldCheck,
  privacy: LockKey,
  publisher: UsersThree,
  return: ArrowClockwise,
  sizing: Ruler,
  support: WarningCircle,
};

const toneClass: Record<MerchantTone, string> = {
  blue: styles.toneBlue,
  rose: styles.toneRose,
  orange: styles.toneOrange,
  mint: styles.toneMint,
  cyan: styles.toneCyan,
  lilac: styles.toneLilac,
  neutral: styles.toneNeutral,
};

function sectionFromPathname(pathname: string): MerchantDashboardSection {
  const segment = pathname.split("/").filter(Boolean)[2];
  return navigation.some((item) => item.id === segment)
    ? (segment as MerchantDashboardSection)
    : "overview";
}

function StatusBadge({ status }: { status: MerchantStatus }) {
  const StatusIcon =
    status.tone === "positive"
      ? CheckCircle
      : status.tone === "critical"
        ? WarningCircle
        : status.tone === "warning"
          ? ClockCountdown
          : status.tone === "info"
            ? ShieldCheck
            : LockKey;

  return (
    <span className={`${styles.statusBadge} ${styles[`status${status.tone}`]}`}>
      <StatusIcon size={13} weight="fill" aria-hidden />
      {status.label}
    </span>
  );
}

function MerchantIdentity() {
  const merchant = MERCHANT_DASHBOARD_DATA.merchant;
  return (
    <div className={styles.merchantIdentity}>
      <Image src={merchant.avatar} width={38} height={38} alt="" />
      <span>
        <strong>{merchant.name}</strong>
        <small>Merchant workspace</small>
      </span>
    </div>
  );
}

export function MerchantDashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeSection = sectionFromPathname(pathname);
  const activeIndex = navigation.findIndex((item) => item.id === activeSection);
  const activePageTitle =
    navigation.find((item) => item.id === activeSection)?.label ?? "Overview";

  return (
    <main className={styles.stage}>
      <div className={styles.appShell}>
        <aside className={styles.rail}>
          <Link
            href="/merchants"
            className={styles.brand}
            aria-label="Back to PrimeStyleAI merchants"
          >
            <Image
              src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp"
              width={42}
              height={33}
              sizes="42px"
              alt="PrimeStyleAI"
              priority
            />
          </Link>

          <nav
            aria-label="Merchant dashboard navigation"
            style={
              { "--rail-offset": `${activeIndex * 44}px` } as CSSProperties
            }
          >
            <span className={styles.railCutout} aria-hidden="true" />
            <span className={styles.railSelector} aria-hidden="true" />
            {navigation.map((item) => {
              const IconComponent = item.icon;
              const active = item.id === activeSection;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={active ? styles.railActive : undefined}
                  scroll={false}
                >
                  <IconComponent
                    size={active ? 20 : 22}
                    weight="regular"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </nav>

          <div className={styles.railBottom}>
            <Link
              href="/merchants/dashboard/account"
              aria-label="Open merchant account"
              title="Account"
            >
              <Image
                src={MERCHANT_DASHBOARD_DATA.merchant.avatar}
                width={32}
                height={32}
                alt=""
              />
            </Link>
          </div>
        </aside>

        <section className={styles.workspace} aria-live="polite">
          <header className={styles.pageTopbar}>
            <h1>{activePageTitle}</h1>
            <div className={styles.headerMeta}>
              <span className={styles.demoBadge}>
                <i aria-hidden="true" /> Demo workspace
              </span>
              <MerchantIdentity />
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}

function SectionHeader({ section }: { section: MerchantDashboardSection }) {
  const copy = MERCHANT_DASHBOARD_DATA.sections[section];
  return (
    <header
      className={`${styles.sectionHeader} ${section === "overview" ? styles.homeSectionHeader : ""}`}
    >
      <div className={styles.headingCopy}>
        <p>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <span>{copy.detail}</span>
      </div>
    </header>
  );
}

function TabNavigation({
  dashboard,
}: {
  dashboard: ReturnType<typeof useMerchantDashboard>;
}) {
  const { tabs } = dashboard.viewModel.section;
  if (tabs.length <= 1) return null;

  return (
    <div className={styles.tabsViewport}>
      <div
        className={styles.tabs}
        role="tablist"
        aria-label={`${dashboard.viewModel.section.title} views`}
      >
        {tabs.map((tab) => {
          const active = tab.id === dashboard.activeTabId;
          return (
            <button
              key={tab.id}
              id={`${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="merchant-tab-panel"
              tabIndex={active ? 0 : -1}
              className={active ? styles.tabActive : undefined}
              onClick={() => dashboard.setActiveTab(tab.id)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const currentIndex = tabs.findIndex(
                  (item) => item.id === tab.id,
                );
                const nextIndex =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : event.key === "ArrowRight"
                        ? (currentIndex + 1) % tabs.length
                        : (currentIndex - 1 + tabs.length) % tabs.length;
                const nextTab = tabs[nextIndex];
                dashboard.setActiveTab(nextTab.id);
                window.requestAnimationFrame(() =>
                  document.getElementById(`${nextTab.id}-tab`)?.focus(),
                );
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ViewHeading({ view }: { view: MerchantTabView }) {
  return (
    <div className={styles.viewHeading}>
      <div>
        <span>{view.eyebrow ?? view.label}</span>
        <h2>{view.title}</h2>
        <p>{view.description}</p>
      </div>
      <span className={styles.readOnlyPill}>
        <Eye size={14} weight="duotone" aria-hidden /> Interactive demo
      </span>
    </div>
  );
}

function MetricGrid({
  metrics,
  compact = false,
}: {
  metrics?: MerchantMetric[];
  compact?: boolean;
}) {
  if (!metrics?.length) return null;
  return (
    <section
      className={`${styles.metricGrid} ${compact ? styles.metricGridCompact : ""}`}
      aria-label="Merchant metrics"
    >
      {metrics.map((metric) => (
        <article key={metric.label} className={toneClass[metric.tone]}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.detail}</small>
          {metric.trend ? <em>{metric.trend}</em> : null}
        </article>
      ))}
    </section>
  );
}

function FieldGrid({
  fields,
  compact = false,
}: {
  fields?: MerchantField[];
  compact?: boolean;
}) {
  if (!fields?.length) return null;
  return (
    <dl
      className={`${styles.fieldGrid} ${compact ? styles.fieldGridCompact : ""}`}
    >
      {fields.map((field) => (
        <div key={`${field.label}-${field.value}`}>
          <dt>{field.label}</dt>
          <dd className={field.tone ? styles[`field${field.tone}`] : undefined}>
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DemoButton({
  children,
  icon: ButtonIcon = LockKey,
}: {
  children: ReactNode;
  icon?: Icon;
}) {
  return (
    <button
      type="button"
      className={styles.demoButton}
      disabled
      title="Unavailable in the demo workspace"
    >
      <ButtonIcon size={15} weight="duotone" aria-hidden />
      {children}
      <span>Demo only</span>
    </button>
  );
}

function ChartCard({
  view,
  compact = false,
}: {
  view: MerchantTabView;
  compact?: boolean;
}) {
  const chart = view.chart;
  if (!chart) return null;
  return (
    <section
      className={`${styles.chartCard} ${compact ? styles.chartCardCompact : ""}`}
    >
      <div className={styles.panelTitle}>
        <div>
          <h3>{chart.title}</h3>
          <p>{chart.detail}</p>
        </div>
        <div className={styles.chartLegend}>
          <span>
            <i className={styles.legendBlue} />
            {chart.primaryLabel}
          </span>
          <span>
            <i className={styles.legendNavy} />
            {chart.secondaryLabel}
          </span>
        </div>
      </div>
      <div
        className={styles.chartArea}
        aria-label={`${chart.title}: ${chart.detail}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chart.points}
            margin={{ top: 8, right: 2, left: -28, bottom: 0 }}
            barGap={1}
          >
            <CartesianGrid vertical={false} stroke="#eceef4" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#858793", fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9a9ca6", fontSize: 9 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(44,99,238,.05)" }}
              contentStyle={{
                border: "1px solid #e8e9ef",
                borderRadius: 12,
                fontSize: 11,
              }}
            />
            <Bar
              dataKey="primary"
              name={chart.primaryLabel}
              fill="#4d7df3"
              radius={[5, 5, 1, 1]}
            />
            <Bar
              dataKey="secondary"
              name={chart.secondaryLabel}
              fill="#1d1d32"
              radius={[5, 5, 1, 1]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ProgressCard({ view }: { view: MerchantTabView }) {
  const progress = view.progress;
  if (!progress) return null;
  const percent = Math.min(
    100,
    Math.round((progress.value / progress.max) * 100),
  );
  return (
    <section className={styles.progressCard}>
      <div className={styles.panelTitle}>
        <div>
          <h3>{progress.label}</h3>
          <p>{progress.detail}</p>
        </div>
        <strong>{percent}%</strong>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuenow={progress.value}
        aria-valuemin={0}
        aria-valuemax={progress.max}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.progressLabels}>
        <span>{progress.valueLabel}</span>
        <span>{progress.maxLabel}</span>
      </div>
    </section>
  );
}

function Timeline({
  items,
  horizontal = false,
}: {
  items?: MerchantTimelineItem[];
  horizontal?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <ol
      className={`${styles.timeline} ${horizontal ? styles.timelineHorizontal : ""}`}
    >
      {items.map((item, index) => {
        const IconComponent = icons[item.icon];
        return (
          <li key={item.id}>
            <span className={styles.timelineIcon}>
              <IconComponent size={18} weight="duotone" aria-hidden />
            </span>
            <div>
              <span className={styles.timelineStep}>Step {index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <small>{item.meta}</small>
            </div>
            <StatusBadge status={item.status} />
          </li>
        );
      })}
    </ol>
  );
}

function SelectableCards({
  view,
  gallery = false,
}: {
  view: MerchantTabView;
  gallery?: boolean;
}) {
  const cards = view.cards ?? [];
  const [selectedId, setSelectedId] = useState(cards[0]?.id ?? "");
  const selected = cards.find((item) => item.id === selectedId) ?? cards[0];
  if (!cards.length) return null;
  return (
    <div
      className={`${styles.cardWorkspace} ${gallery ? styles.galleryWorkspace : ""}`}
    >
      <div className={styles.cardCollection}>
        {cards.map((item) => {
          const IconComponent = icons[item.icon];
          const selectedCard = item.id === selected?.id;
          return (
            <button
              type="button"
              key={item.id}
              className={`${styles.featureCardButton} ${selectedCard ? styles.featureCardSelected : ""}`}
              onClick={() => setSelectedId(item.id)}
              aria-pressed={selectedCard}
            >
              <article
                className={`${styles.featureCard} ${toneClass[item.tone]} ${item.illustration ? styles.hasCardImage : ""}`}
              >
                {item.illustration ? (
                  <span className={styles.featureCardImage}>
                    <Image
                      src={item.illustration}
                      alt={item.illustrationAlt ?? ""}
                      fill
                      sizes="(max-width: 760px) 100vw, 320px"
                    />
                  </span>
                ) : null}
                <div className={styles.cardTopline}>
                  <span className={styles.cardIcon}>
                    <IconComponent size={21} weight="duotone" aria-hidden />
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <small>{item.meta}</small>
              </article>
            </button>
          );
        })}
      </div>
      {selected ? (
        <aside className={styles.detailPanel} aria-live="polite">
          <div className={styles.detailHeader}>
            <div>
              <span>{selected.id}</span>
              <h3>{selected.title}</h3>
              <p>{selected.detail}</p>
            </div>
            <StatusBadge status={selected.status} />
          </div>
          <FieldGrid fields={selected.fields} />
          {view.notice ? (
            <p className={styles.notice}>
              <ShieldCheck size={16} weight="duotone" aria-hidden />
              {view.notice}
            </p>
          ) : null}
          {view.layout === "gallery" ? (
            <DemoButton icon={Sparkle}>Regenerate asset</DemoButton>
          ) : null}
          {view.layout === "publishers" ? (
            <DemoButton icon={UsersThree}>Change access</DemoButton>
          ) : null}
          {view.layout === "cases" ? (
            <DemoButton icon={FileText}>Submit decision</DemoButton>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

function RecordWorkspace({
  view,
  compact = false,
}: {
  view: MerchantTabView;
  compact?: boolean;
}) {
  const records = view.records ?? [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(view.filters?.[0] ?? "All");
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const filtered = records.filter((item) => {
    const matchesQuery =
      `${item.title} ${item.subtitle} ${Object.values(item.cells).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesFilter =
      !view.filters?.length ||
      filter.startsWith("All") ||
      item.status.label
        .toLowerCase()
        .includes(filter.toLowerCase().replace("cache protected", "protected"));
    return matchesQuery && matchesFilter;
  });
  const selected =
    filtered.find((item) => item.id === selectedId) ??
    filtered[0] ??
    records[0];

  return (
    <div
      className={`${styles.recordWorkspace} ${compact ? styles.recordWorkspaceCompact : ""}`}
    >
      <section className={styles.recordsPanel}>
        <div className={styles.recordsToolbar}>
          <div>
            <span>{view.eyebrow ?? view.label}</span>
            <h3>{view.title}</h3>
          </div>
          <label className={styles.searchField}>
            <MagnifyingGlass size={16} aria-hidden />
            <span className={styles.srOnly}>Search {view.label}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search records"
            />
          </label>
        </div>
        {view.filters?.length ? (
          <div
            className={styles.filterRow}
            aria-label={`${view.label} filters`}
          >
            <FunnelSimple size={15} aria-hidden />
            {view.filters.map((item) => (
              <button
                key={item}
                type="button"
                className={filter === item ? styles.filterActive : undefined}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
        <div className={styles.tableViewport}>
          <table>
            <thead>
              <tr>
                <th scope="col">Record</th>
                {(view.columns ?? []).map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </th>
                ))}
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const IconComponent = icons[item.icon];
                return (
                  <tr
                    key={item.id}
                    className={
                      item.id === selected?.id ? styles.rowSelected : undefined
                    }
                  >
                    <td>
                      <button
                        type="button"
                        className={styles.recordSelect}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <span className={styles.recordIcon}>
                          <IconComponent
                            size={18}
                            weight="duotone"
                            aria-hidden
                          />
                        </span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {item.id} · {item.subtitle}
                          </small>
                        </span>
                      </button>
                    </td>
                    {(view.columns ?? []).map((column) => (
                      <td key={column.key}>{item.cells[column.key]}</td>
                    ))}
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td
                    colSpan={(view.columns?.length ?? 0) + 2}
                    className={styles.emptyCell}
                  >
                    No records match this search and filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      {selected ? (
        <aside className={styles.detailPanel} aria-live="polite">
          <div className={styles.detailHeader}>
            <div>
              <span>{selected.id}</span>
              <h3>{selected.detailTitle ?? selected.title}</h3>
              <p>{selected.detail ?? selected.subtitle}</p>
            </div>
            <StatusBadge status={selected.status} />
          </div>
          <FieldGrid fields={selected.fields} />
          {selected.tags?.length ? (
            <div className={styles.tagRow}>
              {selected.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}
          {view.notice ? (
            <p className={styles.notice}>
              <ShieldCheck size={16} weight="duotone" aria-hidden />
              {view.notice}
            </p>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

function MatrixWorkspace({ view }: { view: MerchantTabView }) {
  const demoActionLabel =
    view.id === "size-charts"
      ? "Confirm mapping"
      : view.id === "scopes"
        ? "Change scope"
        : "Change permission";

  return (
    <div className={styles.matrixWorkspace}>
      {view.fields ? <FieldGrid fields={view.fields} /> : null}
      <section className={styles.matrixPanel}>
        <div className={styles.panelTitle}>
          <div>
            <h3>{view.title}</h3>
            <p>{view.detail}</p>
          </div>
          <DemoButton icon={ShieldCheck}>{demoActionLabel}</DemoButton>
        </div>
        <div className={styles.tableViewport}>
          <table>
            <thead>
              <tr>
                <th scope="col">Record</th>
                {view.matrixColumns?.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.matrixRows?.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className={styles.matrixLabel}>
                      <strong>{row.label}</strong>
                      <small>
                        {row.id} · {row.detail}
                      </small>
                    </span>
                  </td>
                  {row.values.map((value) => (
                    <td key={`${row.id}-${value.label}`}>
                      {value.status ? (
                        <StatusBadge status={value.status} />
                      ) : (
                        value.value
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {view.notice ? (
          <p className={styles.notice}>
            <ShieldCheck size={16} weight="duotone" aria-hidden />
            {view.notice}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function OverviewSystems({ cards }: { cards?: MerchantFeatureCard[] }) {
  return (
    <section className={styles.homeSystems}>
      <div className={styles.homePanelHeader}>
        <div>
          <span>Live connections</span>
          <h2>Systems are running</h2>
          <p>Check the tools that move product and order data.</p>
        </div>
        <Link
          href="/merchants/dashboard/commerce"
          aria-label="Open commerce operations"
        >
          Open commerce <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      <div className={styles.homeSystemList}>
        {cards?.map((item) => {
          const IconComponent = icons[item.icon];
          return (
            <Link
              key={item.id}
              href="/merchants/dashboard/commerce"
              className={styles.homeSystemCard}
            >
              <span className={styles.homeSystemIcon}>
                <IconComponent size={22} weight="duotone" aria-hidden />
              </span>
              <span className={styles.homeSystemCopy}>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </span>
              <StatusBadge status={item.status} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function WorkflowStrip({ cards }: { cards?: MerchantFeatureCard[] }) {
  if (!cards?.length) return null;
  return (
    <section className={styles.workflowStrip}>
      {cards.map((item) => {
        const IconComponent = icons[item.icon];
        return (
          <article key={item.id} className={toneClass[item.tone]}>
            <span className={styles.cardIcon}>
              <IconComponent size={20} weight="duotone" aria-hidden />
            </span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <small>{item.meta}</small>
            </div>
            <StatusBadge status={item.status} />
          </article>
        );
      })}
    </section>
  );
}

function OverviewActions({ view }: { view: MerchantTabView }) {
  const records = view.records ?? [];
  const actionOrder = ["ACT-03142", "ACT-18405", "ACT-01938"];
  const actionDetails: Record<
    string,
    {
      area: string;
      title: string;
      action: string;
      image: string;
      tone: string;
    }
  > = {
    "ACT-03142": {
      area: "Products",
      title: "12 products blocked",
      action: "Fix size charts",
      image: "/media/merchant-dashboard/illustrations/products.webp",
      tone: styles.homeActionProducts,
    },
    "ACT-18405": {
      area: "Cart",
      title: "7 cart sends failed",
      action: "Check cart",
      image: "/media/merchant-dashboard/illustrations/commerce.webp",
      tone: styles.homeActionCommerce,
    },
    "ACT-01938": {
      area: "Permission",
      title: "AI images waiting",
      action: "Review use",
      image: "/media/merchant-dashboard/illustrations/account.webp",
      tone: styles.homeActionPermission,
    },
  };
  const visible = actionOrder
    .map((id) => records.find((record) => record.id === id))
    .filter((record): record is NonNullable<typeof record> => Boolean(record));

  return (
    <section className={styles.homeActionShelf} aria-label="Today's priorities">
      <article className={styles.homeFocusCard}>
        <div className={styles.homeFocusCopy}>
          <span>Today</span>
          <strong>3 tasks need your team</strong>
          <p>Start with the 12 products missing a size chart.</p>
          <Link href="/merchants/dashboard/products?tab=size-charts">
            Open first task <ArrowRight size={17} weight="bold" aria-hidden />
          </Link>
          <div className={styles.homeFocusCounts} aria-label="Open task counts">
            <span>
              <b>12</b> products
            </span>
            <span>
              <b>7</b> cart issues
            </span>
            <span>
              <b>1</b> permission
            </span>
          </div>
        </div>
        <div className={styles.homeFocusArtwork} aria-hidden>
          <Image
            src="/media/merchant-dashboard/illustrations/overview.webp"
            alt=""
            fill
            sizes="(max-width: 760px) 48vw, 330px"
            priority
          />
        </div>
      </article>
      <div className={styles.homeActionList}>
        {visible.map((item) => {
          const details = actionDetails[item.id];
          return (
            <Link
              key={item.id}
              href={item.href ?? "#"}
              className={`${styles.homeActionCard} ${details.tone}`}
            >
              <span className={styles.homeActionTopline}>
                <small>{details.area}</small>
                <StatusBadge status={item.status} />
              </span>
              <strong>{details.title}</strong>
              <span className={styles.homeActionLink}>
                {details.action}{" "}
                <ArrowRight size={15} weight="bold" aria-hidden />
              </span>
              <span className={styles.homeActionArtwork} aria-hidden>
                <Image
                  src={details.image}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 42vw, 190px"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function OverviewMetrics({ view }: { view: MerchantTabView }) {
  const metricIcons = [Package, Eye, ShoppingCart, ChartLineUp];

  return (
    <section
      className={styles.homeMetricsSection}
      aria-label="Business performance"
    >
      <div className={styles.homePanelHeader}>
        <div>
          <span>Current pilot period</span>
          <h2>Your business at a glance</h2>
        </div>
        <small>Updated today at 9:55 AM</small>
      </div>
      <div className={styles.homeMetricsGrid}>
        {view.metrics?.slice(0, 3).map((metric, index) => {
          const MetricIcon = metricIcons[index] ?? ChartLineUp;
          return (
            <article key={metric.label}>
              <span
                className={`${styles.homeMetricIcon} ${styles[`homeMetricIcon${index + 1}`]}`}
              >
                <MetricIcon size={21} weight="duotone" aria-hidden />
              </span>
              <span className={styles.homeMetricLabel}>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
              {metric.trend ? <em>{metric.trend}</em> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OverviewJourney() {
  const [range, setRange] = useState<"30d" | "90d">("30d");
  const [selectedId, setSelectedId] = useState("results");
  const journey =
    range === "30d"
      ? [
          {
            id: "views",
            label: "Product views",
            value: "12,842",
            rate: "100%",
            detail: "Shoppers opened one of your products on PrimeStyleAI.",
            icon: Eye,
            href: "/merchants/dashboard/commerce?tab=ai-results",
          },
          {
            id: "results",
            label: "AI help used",
            value: "1,284",
            rate: "10.0%",
            detail: "Shoppers used size help, try-on, or styling help.",
            icon: Sparkle,
            href: "/merchants/dashboard/commerce?tab=ai-results",
          },
          {
            id: "carts",
            label: "Sent to cart",
            value: "423",
            rate: "32.9%",
            detail:
              "Shoppers reached your cart with the exact item they chose.",
            icon: ShoppingCart,
            href: "/merchants/dashboard/commerce?tab=cart",
          },
          {
            id: "orders",
            label: "Orders placed",
            value: "218",
            rate: "51.5%",
            detail:
              "Orders your store confirmed after PrimeStyleAI shopping help.",
            icon: Handbag,
            href: "/merchants/dashboard/commerce?tab=orders",
          },
        ]
      : [
          {
            id: "views",
            label: "Product views",
            value: "34,216",
            rate: "100%",
            detail: "Shoppers opened one of your products on PrimeStyleAI.",
            icon: Eye,
            href: "/merchants/dashboard/commerce?tab=ai-results",
          },
          {
            id: "results",
            label: "AI help used",
            value: "3,560",
            rate: "10.4%",
            detail: "Shoppers used size help, try-on, or styling help.",
            icon: Sparkle,
            href: "/merchants/dashboard/commerce?tab=ai-results",
          },
          {
            id: "carts",
            label: "Sent to cart",
            value: "1,184",
            rate: "33.3%",
            detail:
              "Shoppers reached your cart with the exact item they chose.",
            icon: ShoppingCart,
            href: "/merchants/dashboard/commerce?tab=cart",
          },
          {
            id: "orders",
            label: "Orders placed",
            value: "602",
            rate: "50.8%",
            detail:
              "Orders your store confirmed after PrimeStyleAI shopping help.",
            icon: Handbag,
            href: "/merchants/dashboard/commerce?tab=orders",
          },
        ];
  const selected =
    journey.find((stage) => stage.id === selectedId) ?? journey[1];

  return (
    <section className={styles.homeJourney}>
      <div className={styles.homePanelHeader}>
        <div>
          <span>Shopping activity</span>
          <h2>What shoppers did</h2>
          <p>Choose a card to see what its number counts.</p>
        </div>
        <div
          className={styles.homeRangeControl}
          aria-label="Shopper journey date range"
        >
          <button
            type="button"
            className={range === "30d" ? styles.homeRangeActive : undefined}
            aria-pressed={range === "30d"}
            onClick={() => setRange("30d")}
          >
            30 days
          </button>
          <button
            type="button"
            className={range === "90d" ? styles.homeRangeActive : undefined}
            aria-pressed={range === "90d"}
            onClick={() => setRange("90d")}
          >
            90 days
          </button>
        </div>
      </div>
      <div className={styles.homeJourneyStages}>
        {journey.map((stage) => {
          const StageIcon = stage.icon;
          const active = stage.id === selected.id;
          return (
            <button
              key={stage.id}
              type="button"
              className={active ? styles.homeJourneyStageActive : undefined}
              aria-pressed={active}
              onClick={() => setSelectedId(stage.id)}
            >
              <span>
                <StageIcon size={19} weight="duotone" aria-hidden />
                {stage.rate}
              </span>
              <strong>{stage.value}</strong>
              <small>{stage.label}</small>
            </button>
          );
        })}
      </div>
      <div className={styles.homeJourneyDetail} aria-live="polite">
        <div>
          <strong>{selected.label}</strong>
          <p>{selected.detail}</p>
        </div>
        <Link href={selected.href}>
          Open details <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function OverviewWorkspace({ view }: { view: MerchantTabView }) {
  const progress = view.progress;
  const percent = progress
    ? Math.min(100, Math.round((progress.value / progress.max) * 100))
    : 86;
  const [drawerContent, setDrawerContent] =
    useState<MerchantPreviewDrawerContent | null>(null);

  const openPilotDecision = () =>
    setDrawerContent({
      eyebrow: "Pilot choices",
      title: "What happens next?",
      description:
        "This is a preview. Nothing changes until your team confirms a choice.",
      steps: [
        {
          title: "Continue the pilot",
          detail: "Keep testing and review the pilot again later.",
        },
        {
          title: "Start paid service",
          detail: "Agree the price and date before paid service starts.",
        },
        {
          title: "Close the pilot",
          detail: "Stop new shopping help and close connected access.",
        },
      ],
      evidence: [
        {
          label: "Results used",
          value: progress?.valueLabel ?? "1,284 of 1,500",
        },
        { label: "Results remaining", value: "216" },
        { label: "Decision review", value: "8 August 2026" },
        { label: "Current state", value: "Pilot active" },
      ],
    });

  return (
    <div className={styles.overviewGrid}>
      <OverviewActions view={view} />
      <OverviewJourney />
      <section className={styles.homePilotCard}>
        <div className={styles.homePilotCopy}>
          <StatusBadge status={{ label: "Due 8 Aug", tone: "warning" }} />
          <span>Pilot</span>
          <h2>216 uses left</h2>
          <p>Choose whether to continue, start paid service, or close.</p>
          <div className={styles.homePilotProgress}>
            <div>
              <span>Used</span>
              <strong>{percent}%</strong>
            </div>
            <div
              className={styles.homePilotTrack}
              role="progressbar"
              aria-label="Pilot result allowance used"
              aria-valuenow={progress?.value ?? 1284}
              aria-valuemin={0}
              aria-valuemax={progress?.max ?? 1500}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>
              <span>{(progress?.value ?? 1284).toLocaleString()} used</span>
              <span>{(progress?.max ?? 1500).toLocaleString()} total</span>
            </small>
          </div>
          <button
            type="button"
            className={styles.homePilotCta}
            onClick={openPilotDecision}
          >
            Review choices <ArrowRight size={17} weight="bold" aria-hidden />
          </button>
        </div>
        <div className={styles.homePilotArtwork} aria-hidden>
          <Image
            src="/media/merchant-dashboard/illustrations/billing.webp"
            alt=""
            fill
            sizes="(max-width: 760px) 55vw, 260px"
          />
        </div>
      </section>
      <OverviewMetrics view={view} />
      <OverviewSystems cards={view.cards} />
      <MerchantPreviewDrawer
        content={drawerContent}
        onClose={() => setDrawerContent(null)}
      />
    </div>
  );
}

function PdpWorkspace({ view }: { view: MerchantTabView }) {
  const records = view.records ?? [];
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const selected = records.find((item) => item.id === selectedId) ?? records[0];
  const selectedImage = selected?.title.toLowerCase().includes("blazer")
    ? "/media/merchant-dashboard/generated/products/final/product-navy-blazer.webp"
    : selected?.title.toLowerCase().includes("trouser")
      ? "/media/merchant-dashboard/generated/products/final/product-stone-trousers.webp"
      : "/media/merchant-dashboard/generated/products/final/product-silk-dress.webp";
  return (
    <div className={styles.pdpWorkspace}>
      <section className={styles.pdpList}>
        <div className={styles.panelTitle}>
          <div>
            <h3>PDP versions</h3>
            <p>Select a product to inspect its merchant review state.</p>
          </div>
        </div>
        {records.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              item.id === selected?.id ? styles.listItemSelected : undefined
            }
            onClick={() => setSelectedId(item.id)}
          >
            <span className={styles.recordIcon}>
              <FileText size={18} weight="duotone" aria-hidden />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>
                {item.subtitle} · {item.cells.version}
              </small>
            </span>
            <StatusBadge status={item.status} />
          </button>
        ))}
      </section>
      <section className={styles.pdpPreview}>
        <div className={styles.previewProductImage}>
          <Image
            src={selectedImage}
            alt={`${selected?.title ?? "Selected merchant product"} preview`}
            fill
            sizes="240px"
          />
        </div>
        <div className={styles.previewProductCopy}>
          <span>Northstar Atelier · Product page</span>
          <h3>{selected?.title}</h3>
          <p>{selected?.subtitle}</p>
          <div className={styles.previewPrice}>
            $248.00 <small>Merchant price</small>
          </div>
          <div className={styles.previewSizes}>
            <span>XS</span>
            <span>S</span>
            <span className={styles.previewSizeActive}>M</span>
            <span>L</span>
            <span>XL</span>
          </div>
          <p className={styles.previewDisclosure}>
            Sold and fulfilled by Northstar Atelier. PrimeStyleAI sizing and AI
            results are estimates.
          </p>
        </div>
      </section>
      <aside className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <span>{selected?.id}</span>
            <h3>Version & review evidence</h3>
            <p>{view.description}</p>
          </div>
          {selected ? <StatusBadge status={selected.status} /> : null}
        </div>
        <FieldGrid fields={selected?.fields} />
        <FieldGrid fields={view.cards?.[0]?.fields} />
        <DemoButton icon={FileText}>Publish version</DemoButton>
      </aside>
    </div>
  );
}

function StatementWorkspace({ view }: { view: MerchantTabView }) {
  return (
    <div className={styles.statementWorkspace}>
      <ProgressCard view={view} />
      <section className={styles.invoicePanel}>
        <div className={styles.panelTitle}>
          <div>
            <span>STM-2026-08</span>
            <h3>Statement breakdown</h3>
            <p>Northstar Atelier · August pilot period</p>
          </div>
          <StatusBadge status={{ label: "In review", tone: "warning" }} />
        </div>
        <FieldGrid fields={view.fields} />
        <div className={styles.invoiceTotal}>
          <span>Amount due</span>
          <strong>$642.00</strong>
        </div>
        <DemoButton icon={Coins}>Pay statement</DemoButton>
      </section>
      <ChartCard view={view} />
    </div>
  );
}

function TimelineWorkspace({
  view,
  tests = false,
}: {
  view: MerchantTabView;
  tests?: boolean;
}) {
  return (
    <div className={styles.timelineWorkspace}>
      {view.fields ? <FieldGrid fields={view.fields} /> : null}
      <Timeline items={view.timeline} horizontal={tests} />
      {view.records?.length ? <RecordWorkspace view={view} /> : null}
      {view.notice ? (
        <p className={styles.notice}>
          <ShieldCheck size={16} weight="duotone" aria-hidden />
          {view.notice}
        </p>
      ) : null}
    </div>
  );
}

function SupportWorkspace({ view }: { view: MerchantTabView }) {
  return (
    <div className={styles.timelineWorkspace}>
      <WorkflowStrip cards={view.cards} />
      <Timeline items={view.timeline} />
      {view.records?.length ? <RecordWorkspace view={view} /> : null}
      {view.notice ? (
        <p className={styles.notice}>
          <ShieldCheck size={16} weight="duotone" aria-hidden />
          {view.notice}
        </p>
      ) : null}
    </div>
  );
}

function ConnectionsWorkspace({ view }: { view: MerchantTabView }) {
  return (
    <div className={styles.connectionsWorkspace}>
      <div className={styles.connectionCards}>
        {view.cards?.map((item) => {
          const IconComponent = icons[item.icon];
          return (
            <article key={item.id} className={toneClass[item.tone]}>
              {item.illustration ? (
                <span className={styles.connectionImage}>
                  <Image
                    src={item.illustration}
                    alt={item.illustrationAlt ?? ""}
                    fill
                    sizes="220px"
                  />
                </span>
              ) : null}
              <div className={styles.cardTopline}>
                <span className={styles.cardIcon}>
                  <IconComponent size={22} weight="duotone" aria-hidden />
                </span>
                <StatusBadge status={item.status} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <small>{item.meta}</small>
              <FieldGrid fields={item.fields} compact />
            </article>
          );
        })}
      </div>
      <section className={styles.syncPanel}>
        <div className={styles.panelTitle}>
          <div>
            <h3>Latest system evidence</h3>
            <p>Sync, retry, and safe-fallback activity</p>
          </div>
        </div>
        <Timeline items={view.timeline} />
      </section>
    </div>
  );
}

function CampaignWorkspace({ view }: { view: MerchantTabView }) {
  return (
    <div className={styles.campaignWorkspace}>
      <ChartCard view={view} />
      <SelectableCards view={view} />
      <RecordWorkspace view={view} compact />
    </div>
  );
}

function ProfileWorkspace({ view }: { view: MerchantTabView }) {
  return (
    <div className={styles.profileWorkspace}>
      <section className={styles.identityPanel}>
        <div className={styles.identityHero}>
          <Image
            src={MERCHANT_DASHBOARD_DATA.merchant.avatar}
            width={72}
            height={72}
            alt=""
          />
          <div>
            <h3>{MERCHANT_DASHBOARD_DATA.merchant.legalName}</h3>
            <p>Shopify connected · Program active</p>
          </div>
          <StatusBadge status={{ label: "Qualified", tone: "positive" }} />
        </div>
        <FieldGrid fields={view.fields} />
      </section>
      <section className={styles.readinessPanel}>
        <div className={styles.panelTitle}>
          <div>
            <h3>Activation readiness</h3>
            <p>Commercial, technical, catalog, rights, and pilot gates</p>
          </div>
        </div>
        <Timeline items={view.timeline} />
      </section>
      {view.cards?.length ? <SelectableCards view={view} /> : null}
    </div>
  );
}

function CatalogWorkspace({ view }: { view: MerchantTabView }) {
  return (
    <div className={styles.standardWorkspace}>
      <WorkflowStrip cards={view.cards} />
      <RecordWorkspace view={view} />
    </div>
  );
}

function GenericTabWorkspace({ view }: { view: MerchantTabView }) {
  switch (view.layout) {
    case "overview":
      return <OverviewWorkspace view={view} />;
    case "pdp":
      return <PdpWorkspace view={view} />;
    case "matrix":
      return <MatrixWorkspace view={view} />;
    case "gallery":
      return <SelectableCards view={view} gallery />;
    case "connections":
      return <ConnectionsWorkspace view={view} />;
    case "tests":
      return <TimelineWorkspace view={view} tests />;
    case "results":
    case "publishers":
    case "documents":
    case "contacts":
    case "cases":
      return (
        <SelectableCards view={view} gallery={view.layout === "results"} />
      );
    case "statement":
      return <StatementWorkspace view={view} />;
    case "timeline":
    case "terms":
    case "lifecycle":
      return <TimelineWorkspace view={view} />;
    case "support":
      return <SupportWorkspace view={view} />;
    case "campaigns":
      return <CampaignWorkspace view={view} />;
    case "profile":
      return <ProfileWorkspace view={view} />;
    case "catalog":
      return <CatalogWorkspace view={view} />;
    case "decision":
    case "handoff":
    case "ledger":
    case "exports":
      return (
        <div className={styles.standardWorkspace}>
          {view.timeline ? (
            <Timeline
              items={view.timeline}
              horizontal={view.layout === "handoff"}
            />
          ) : null}
          <RecordWorkspace view={view} />
          {view.layout === "exports" ? (
            <DemoButton icon={DownloadSimple}>
              Download selected export
            </DemoButton>
          ) : null}
        </div>
      );
    default:
      return <RecordWorkspace view={view} />;
  }
}

export function MerchantDashboardExperience({
  section,
}: {
  section: MerchantDashboardSection;
}) {
  const dashboard = useMerchantDashboard(section);
  const view = dashboard.viewModel.activeView;

  if (section === "integrations") {
    return <ShopperBehaviorExperience />;
  }

  if (section === "commerce") {
    return <MerchantReportsExperience />;
  }

  if (section === "account") {
    return (
      <AccountGovernanceWorkspace
        merchant={dashboard.viewModel.merchant}
        tabs={dashboard.viewModel.section.tabs}
        activeTabId={dashboard.activeTabId}
      />
    );
  }

  if (section === "campaigns") {
    return (
      <div className={styles.workspaceScene} key={section}>
        <SectionHeader section={section} />
        <CreatorPartnershipsExperience />
        <p className={styles.previewNote}>
          Realistic demo data only. Authentication, invitations, campaign
          operations, persistence, and merchant actions are not connected.
        </p>
      </div>
    );
  }

  const isOverview = section === "overview";
  const isProducts = section === "products";
  const isBilling = section === "billing";
  return (
    <div className={styles.workspaceScene} key={`${section}-${view.id}`}>
      <SectionHeader section={section} />
      {isProducts ? (
        <ProductOperationsExperience
          activeTabId={dashboard.activeTabId}
          tabs={dashboard.viewModel.section.tabs}
        />
      ) : isBilling ? (
        <BillingHubExperience />
      ) : (
        <>
          <TabNavigation dashboard={dashboard} />
          {!isOverview ? <ViewHeading view={view} /> : null}
          {!isOverview ? <MetricGrid metrics={view.metrics} /> : null}
          <section
            id="merchant-tab-panel"
            role={
              dashboard.viewModel.section.tabs.length > 1
                ? "tabpanel"
                : undefined
            }
            aria-labelledby={
              dashboard.viewModel.section.tabs.length > 1
                ? `${view.id}-tab`
                : undefined
            }
            className={styles.tabPanel}
          >
            <GenericTabWorkspace view={view} />
          </section>
        </>
      )}
      <p
        className={`${styles.previewNote} ${isOverview ? styles.homePreviewNote : ""}`}
      >
        Realistic demo data only. Authentication, integrations, persistence,
        billing actions, and merchant operations are not connected.
      </p>
    </div>
  );
}
