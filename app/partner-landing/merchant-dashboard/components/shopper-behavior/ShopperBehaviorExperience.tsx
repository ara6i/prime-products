"use client";

import {
  ArrowClockwise,
  ArrowRight,
  ChartLineUp,
  CheckCircle,
  ClockCountdown,
  DownloadSimple,
  Eye,
  GlobeHemisphereWest,
  Handbag,
  LinkSimple,
  MagnifyingGlass,
  Package,
  Ruler,
  ShoppingCart,
  Sparkle,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import styles from "./shopperBehavior.module.css";

type RangeKey = "7d" | "30d" | "90d";
type BehaviorTone = "positive" | "warning" | "info";

type Icon = ComponentType<{
  size?: number;
  weight?: "regular" | "fill" | "duotone" | "bold";
  "aria-hidden"?: boolean;
}>;

interface BehaviorEvent {
  time: string;
  title: string;
  detail: string;
  icon: Icon;
  tone: BehaviorTone;
}

interface ShopperSession {
  id: string;
  name: string;
  avatar: string;
  location: string;
  device: string;
  duration: string;
  outcome: string;
  outcomeTone: BehaviorTone;
  summary: string;
  product: string;
  productImage: string;
  variant: string;
  value: string;
  likelyReason: string;
  reasonDetail: string;
  confidence: number;
  signals: string[];
  recommendedAction: string;
  events: BehaviorEvent[];
}

const RANGE_OPTIONS: Array<{ id: RangeKey; label: string }> = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

const RANGE_SUMMARY = {
  "7d": {
    active: "426",
    assisted: "168",
    carted: "94",
    purchased: "46",
    explored: "42%",
    decided: "22%",
    converted: "11%",
  },
  "30d": {
    active: "1,842",
    assisted: "684",
    carted: "423",
    purchased: "218",
    explored: "43%",
    decided: "23%",
    converted: "12%",
  },
  "90d": {
    active: "5,306",
    assisted: "2,041",
    carted: "1,284",
    purchased: "646",
    explored: "46%",
    decided: "24%",
    converted: "12%",
  },
} satisfies Record<RangeKey, Record<string, string>>;

const SHOPPER_SESSIONS: ShopperSession[] = [
  {
    id: "session-sarah",
    name: "Sarah Chen",
    avatar: "/images/landing/avatar-sarah.png",
    location: "London, UK",
    device: "Mobile web",
    duration: "8m 42s",
    outcome: "Purchased",
    outcomeTone: "positive",
    summary:
      "Used fit help, tried two colors, then ordered the recommended size.",
    product: "Silk column dress",
    productImage:
      "/media/merchant-dashboard/generated/products/final/product-silk-dress.webp",
    variant: "Midnight · Size M",
    value: "$248",
    likelyReason: "She needed confidence that size M would fit before buying.",
    reasonDetail:
      "This is inferred from the size-chart visit, measurement edit, recommendation acceptance, and immediate cart add.",
    confidence: 92,
    signals: [
      "Opened the size chart twice",
      "Changed waist measurement",
      "Accepted the recommended size",
      "Purchased 54 seconds later",
    ],
    recommendedAction:
      "Keep the size recommendation visible beside the size selector for this product.",
    events: [
      {
        time: "10:02",
        title: "Opened the silk column dress",
        detail:
          "Arrived from Maya Laurent’s summer edit and viewed Midnight first.",
        icon: Eye,
        tone: "info",
      },
      {
        time: "10:04",
        title: "Compared two colors",
        detail: "Switched between Midnight and Terracotta three times.",
        icon: ArrowClockwise,
        tone: "info",
      },
      {
        time: "10:06",
        title: "Asked for size help",
        detail:
          "Entered height, waist, and preferred fit; recommendation returned M.",
        icon: Ruler,
        tone: "warning",
      },
      {
        time: "10:08",
        title: "Accepted the recommendation",
        detail: "Kept size M selected after reading the fit explanation.",
        icon: Sparkle,
        tone: "positive",
      },
      {
        time: "10:10",
        title: "Added the exact variant to cart",
        detail: "Midnight · Size M · Quantity 1.",
        icon: ShoppingCart,
        tone: "positive",
      },
      {
        time: "10:11",
        title: "Order confirmed",
        detail: "Order NS-10482 attributed to the assisted session.",
        icon: Handbag,
        tone: "positive",
      },
    ],
  },
  {
    id: "session-elena",
    name: "Elena Martins",
    avatar: "/images/landing/avatar-elena.png",
    location: "Lisbon, PT",
    device: "Desktop web",
    duration: "11m 18s",
    outcome: "Left after try-on",
    outcomeTone: "warning",
    summary:
      "Generated three try-ons but left when the preferred color was unavailable.",
    product: "Tailored wool blazer",
    productImage:
      "/media/merchant-dashboard/generated/products/final/product-navy-blazer.webp",
    variant: "Stone · Size S",
    value: "$320 at risk",
    likelyReason: "Her preferred color was unavailable in the size she chose.",
    reasonDetail:
      "This is inferred from repeated color switching, an out-of-stock message, and exit immediately after the third try-on.",
    confidence: 88,
    signals: [
      "Generated three try-ons",
      "Selected Stone each time",
      "Saw size S unavailable",
      "Exited 9 seconds after stock check",
    ],
    recommendedAction:
      "Offer a back-in-stock alert and show the closest available color before the shopper exits.",
    events: [
      {
        time: "14:21",
        title: "Opened the tailored wool blazer",
        detail: "Arrived from search results and selected Stone.",
        icon: Eye,
        tone: "info",
      },
      {
        time: "14:24",
        title: "Generated a virtual try-on",
        detail: "Viewed the blazer with black trousers and slingbacks.",
        icon: Sparkle,
        tone: "info",
      },
      {
        time: "14:27",
        title: "Reran the look twice",
        detail: "Kept the Stone color while changing the full-look styling.",
        icon: ArrowClockwise,
        tone: "warning",
      },
      {
        time: "14:31",
        title: "Checked availability",
        detail: "Size S was unavailable in Stone; Navy remained in stock.",
        icon: Package,
        tone: "warning",
      },
      {
        time: "14:32",
        title: "Left the product page",
        detail:
          "No cart add, stock alert, or alternative-color click followed.",
        icon: WarningCircle,
        tone: "warning",
      },
    ],
  },
  {
    id: "session-david",
    name: "David Okafor",
    avatar: "/images/landing/avatar-david.png",
    location: "Toronto, CA",
    device: "Mobile web",
    duration: "6m 05s",
    outcome: "Carted a full look",
    outcomeTone: "info",
    summary:
      "Used Complete the Look and added two coordinated products together.",
    product: "Tailored wool blazer",
    productImage:
      "/media/merchant-dashboard/generated/products/final/ai-complete-look.webp",
    variant: "Navy blazer + stone trousers",
    value: "$438 in cart",
    likelyReason:
      "The coordinated outfit reduced the work of styling separate pieces.",
    reasonDetail:
      "This is inferred from a fast two-item cart add directly after opening the complete-look recommendation.",
    confidence: 84,
    signals: [
      "Opened Complete the Look",
      "Viewed one recommended outfit",
      "Added two items together",
      "Did not compare other products",
    ],
    recommendedAction:
      "Keep the paired-look CTA close to the blazer gallery and preserve both variants in cart handoff.",
    events: [
      {
        time: "18:42",
        title: "Opened the tailored wool blazer",
        detail: "Arrived from the New Tailoring collection.",
        icon: Eye,
        tone: "info",
      },
      {
        time: "18:44",
        title: "Opened Complete the Look",
        detail: "Viewed the blazer with stone trousers and cream accessories.",
        icon: Sparkle,
        tone: "positive",
      },
      {
        time: "18:46",
        title: "Checked both product details",
        detail:
          "Confirmed price, color, and availability without leaving the look.",
        icon: LinkSimple,
        tone: "info",
      },
      {
        time: "18:48",
        title: "Added two exact variants to cart",
        detail: "Navy blazer XL and Stone trousers 34.",
        icon: ShoppingCart,
        tone: "positive",
      },
    ],
  },
  {
    id: "session-marcus",
    name: "Marcus Reed",
    avatar: "/images/landing/avatar-marcus.png",
    location: "Austin, US",
    device: "Desktop web",
    duration: "4m 37s",
    outcome: "Returned to buy",
    outcomeTone: "positive",
    summary:
      "Came back through a creator link and bought the product saved yesterday.",
    product: "Leather slingback pumps",
    productImage:
      "/media/merchant-dashboard/generated/products/final/product-sand-slingbacks.webp",
    variant: "Sand · EU 40",
    value: "$184",
    likelyReason:
      "Creator validation helped him finish a decision started the day before.",
    reasonDetail:
      "This is inferred from a saved-product revisit through the same creator’s tracked link and a short path to purchase.",
    confidence: 79,
    signals: [
      "Saved the product yesterday",
      "Returned from a creator link",
      "Skipped comparison this time",
      "Purchased within four minutes",
    ],
    recommendedAction:
      "Retarget saved-product shoppers with the creator content that originally introduced the item.",
    events: [
      {
        time: "09:14",
        title: "Returned through a creator link",
        detail: "Opened Maya Laurent’s tracked outfit post.",
        icon: UsersThree,
        tone: "info",
      },
      {
        time: "09:15",
        title: "Reopened a saved product",
        detail: "Leather slingback pumps saved in the previous session.",
        icon: Eye,
        tone: "info",
      },
      {
        time: "09:17",
        title: "Added the saved variant to cart",
        detail: "Sand · EU 40 · Quantity 1.",
        icon: ShoppingCart,
        tone: "positive",
      },
      {
        time: "09:18",
        title: "Order confirmed",
        detail: "Order NS-10431 credited to the creator-assisted return visit.",
        icon: Handbag,
        tone: "positive",
      },
    ],
  },
];

const SUMMARY_METRICS: Array<{
  id: keyof (typeof RANGE_SUMMARY)[RangeKey];
  label: string;
  detail: string;
  icon: Icon;
}> = [
  {
    id: "active",
    label: "Shopper sessions",
    detail: "People with recorded product behavior",
    icon: UsersThree,
  },
  {
    id: "assisted",
    label: "Used AI help",
    detail: "Fit, try-on, or styling interaction",
    icon: Sparkle,
  },
  {
    id: "carted",
    label: "Reached cart",
    detail: "Exact variant sent to merchant cart",
    icon: ShoppingCart,
  },
  {
    id: "purchased",
    label: "Purchased",
    detail: "Order confirmed after the session",
    icon: Handbag,
  },
];

const REASON_PATTERNS = [
  {
    label: "Fit confidence",
    value: 38,
    detail: "Size help or fit explanation",
  },
  {
    label: "Style validation",
    value: 27,
    detail: "Try-on or complete-look use",
  },
  { label: "Social proof", value: 21, detail: "Creator or saved-item return" },
  {
    label: "Price or stock",
    value: 14,
    detail: "Availability or value friction",
  },
];

function OutcomeBadge({ label, tone }: { label: string; tone: BehaviorTone }) {
  const BadgeIcon =
    tone === "positive"
      ? CheckCircle
      : tone === "warning"
        ? WarningCircle
        : ChartLineUp;

  return (
    <span className={`${styles.outcomeBadge} ${styles[`outcome_${tone}`]}`}>
      <BadgeIcon size={13} weight="fill" aria-hidden />
      {label}
    </span>
  );
}

function SummaryStrip({ range }: { range: RangeKey }) {
  const summary = RANGE_SUMMARY[range];

  return (
    <section
      className={styles.summaryStrip}
      aria-label="Shopper behavior summary"
    >
      <div className={styles.behaviorFlow}>
        <div className={styles.flowHeading}>
          <span>Combined shopper path</span>
          <strong>From first look to purchase</strong>
        </div>
        <div className={styles.flowBars} aria-label="Shopper progression">
          <span className={styles.flowDiscover}>
            <b>Discovered</b>
            <small>100%</small>
          </span>
          <span className={styles.flowExplore}>
            <b>Explored</b>
            <small>{summary.explored}</small>
          </span>
          <span className={styles.flowDecide}>
            <b>Decided</b>
            <small>{summary.decided}</small>
          </span>
          <span className={styles.flowBuy}>
            <b>Purchased</b>
            <small>{summary.converted}</small>
          </span>
        </div>
      </div>
      <div className={styles.summaryMetrics}>
        {SUMMARY_METRICS.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <article key={metric.id}>
              <span>
                <MetricIcon size={18} weight="duotone" aria-hidden />
              </span>
              <div>
                <strong>{summary[metric.id]}</strong>
                <p>{metric.label}</p>
                <small>{metric.detail}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SessionList({
  sessions,
  selectedId,
  query,
  onQueryChange,
  onSelect,
}: {
  sessions: ShopperSession[];
  selectedId: string;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <section className={styles.sessionPanel} aria-label="Shopper sessions">
      <header className={styles.panelHeading}>
        <div>
          <span>People</span>
          <h2>Recent shopper journeys</h2>
        </div>
        <small>{sessions.length} shown</small>
      </header>
      <label className={styles.searchField}>
        <MagnifyingGlass size={17} aria-hidden />
        <span className={styles.srOnly}>Search shopper behavior</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search person or product"
        />
      </label>
      <div className={styles.sessionList}>
        {sessions.map((session) => {
          const active = selectedId === session.id;
          return (
            <button
              key={session.id}
              type="button"
              className={active ? styles.sessionActive : undefined}
              aria-pressed={active}
              onClick={() => onSelect(session.id)}
            >
              <Image src={session.avatar} width={48} height={48} alt="" />
              <span className={styles.sessionCopy}>
                <strong>{session.name}</strong>
                <small>{session.summary}</small>
                <em>{session.duration} session</em>
              </span>
              <OutcomeBadge
                label={session.outcome}
                tone={session.outcomeTone}
              />
            </button>
          );
        })}
        {sessions.length === 0 ? (
          <div className={styles.emptySessions}>
            <MagnifyingGlass size={23} weight="duotone" aria-hidden />
            <strong>No matching behavior</strong>
            <span>Try a shopper, product, or outcome.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function JourneyPanel({ session }: { session: ShopperSession }) {
  return (
    <section
      className={styles.journeyPanel}
      aria-label={`${session.name} journey`}
    >
      <header className={styles.selectedShopper}>
        <Image src={session.avatar} width={64} height={64} alt="" />
        <div>
          <span>Selected shopper</span>
          <h2>{session.name}</h2>
          <p>{session.summary}</p>
          <div className={styles.shopperMeta}>
            <span>
              <GlobeHemisphereWest size={14} aria-hidden />
              {session.location}
            </span>
            <span>
              <Eye size={14} aria-hidden />
              {session.device}
            </span>
            <span>
              <ClockCountdown size={14} aria-hidden />
              {session.duration}
            </span>
          </div>
        </div>
        <OutcomeBadge label={session.outcome} tone={session.outcomeTone} />
      </header>

      <div className={styles.journeyHeader}>
        <div>
          <span>Exact activity</span>
          <h3>What {session.name.split(" ")[0]} did</h3>
        </div>
        <small>Ordered by session time</small>
      </div>

      <ol className={styles.eventTimeline}>
        {session.events.map((event) => {
          const EventIcon = event.icon;
          return (
            <li key={`${session.id}-${event.time}-${event.title}`}>
              <time>{event.time}</time>
              <span
                className={`${styles.eventIcon} ${styles[`event_${event.tone}`]}`}
              >
                <EventIcon size={18} weight="duotone" aria-hidden />
              </span>
              <div>
                <strong>{event.title}</strong>
                <p>{event.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ReasonPanel({ session }: { session: ShopperSession }) {
  const [actionCreated, setActionCreated] = useState(false);

  return (
    <aside className={styles.reasonPanel} aria-label="Behavior explanation">
      <div className={styles.reasonTopline}>
        <span>
          <Sparkle size={16} weight="fill" aria-hidden />
          Behavior interpretation
        </span>
        <small>{session.confidence}% confidence</small>
      </div>
      <span className={styles.reasonEyebrow}>Likely reason · inferred</span>
      <h2>{session.likelyReason}</h2>
      <p>{session.reasonDetail}</p>

      <div className={styles.confidenceMeter}>
        <span>
          <small>Evidence confidence</small>
          <strong>{session.confidence}%</strong>
        </span>
        <progress
          value={session.confidence}
          max={100}
          aria-label={`Behavior interpretation confidence: ${session.confidence}%`}
        />
      </div>

      <div className={styles.signalList}>
        <span>Signals behind this explanation</span>
        {session.signals.map((signal) => (
          <div key={signal}>
            <CheckCircle size={17} weight="fill" aria-hidden />
            <span>{signal}</span>
          </div>
        ))}
      </div>

      <div className={styles.recommendationBox}>
        <span>Recommended merchant action</span>
        <p>{session.recommendedAction}</p>
      </div>

      <button
        type="button"
        className={actionCreated ? styles.actionCreated : undefined}
        onClick={() => setActionCreated(true)}
      >
        {actionCreated ? (
          <>
            <CheckCircle size={17} weight="fill" aria-hidden /> Action saved
          </>
        ) : (
          <>
            Save this action <ArrowRight size={17} weight="bold" aria-hidden />
          </>
        )}
      </button>
      {actionCreated ? (
        <small className={styles.demoActionNote}>
          Demo only — no workflow or customer message was created.
        </small>
      ) : null}
    </aside>
  );
}

function ProductContext({ session }: { session: ShopperSession }) {
  return (
    <section
      className={styles.productContext}
      aria-label="Selected product context"
    >
      <div className={styles.productImage}>
        <Image
          src={session.productImage}
          fill
          loading="eager"
          sizes="(max-width: 760px) 42vw, 180px"
          alt={session.product}
        />
      </div>
      <div className={styles.productCopy}>
        <span>Product context</span>
        <h2>{session.product}</h2>
        <p>{session.variant}</p>
        <strong>{session.value}</strong>
        <div>
          <span>
            <Package size={16} weight="duotone" aria-hidden /> Catalog matched
          </span>
          <span>
            <LinkSimple size={16} weight="duotone" aria-hidden /> Session
            attributed
          </span>
        </div>
      </div>
    </section>
  );
}

function ReasonPatterns() {
  return (
    <section
      className={styles.patternPanel}
      aria-label="Common shopper reasons"
    >
      <header className={styles.panelHeading}>
        <div>
          <span>All sessions combined</span>
          <h2>Why shoppers act</h2>
        </div>
        <small>Evidence-weighted share</small>
      </header>
      <div className={styles.patternRows}>
        {REASON_PATTERNS.map((pattern) => (
          <div key={pattern.label}>
            <div>
              <strong>{pattern.label}</strong>
              <span>{pattern.detail}</span>
              <b>{pattern.value}%</b>
            </div>
            <progress
              value={pattern.value}
              max={100}
              aria-label={`${pattern.label}: ${pattern.value}% of interpreted sessions`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ShopperBehaviorExperience() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [query, setQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(
    SHOPPER_SESSIONS[0].id,
  );
  const [exported, setExported] = useState(false);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return SHOPPER_SESSIONS;
    return SHOPPER_SESSIONS.filter((session) =>
      [
        session.name,
        session.product,
        session.outcome,
        session.summary,
        session.likelyReason,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [query]);

  const selectedSession =
    SHOPPER_SESSIONS.find((session) => session.id === selectedSessionId) ??
    SHOPPER_SESSIONS[0];

  const exportBehavior = () => {
    const rows = [
      [
        "Shopper",
        "Location",
        "Product",
        "Outcome",
        "Exact activity",
        "Likely reason (inferred)",
        "Confidence",
      ],
      ...SHOPPER_SESSIONS.map((session) => [
        session.name,
        session.location,
        session.product,
        session.outcome,
        session.events
          .map((event) => `${event.time} ${event.title}`)
          .join(" | "),
        session.likelyReason,
        `${session.confidence}%`,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `primestyleai-shopper-behavior-${range}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 4000);
  };

  return (
    <div className={styles.reportScene}>
      <header className={styles.reportHeader}>
        <div className={styles.reportTitle}>
          <p>Shopper intelligence</p>
          <h1>See what every shopper did—and why.</h1>
          <span>
            Exact session behavior, likely motivation, product context, and
            outcome in one combined view.
          </span>
        </div>
        <div className={styles.headerControls}>
          <div
            className={styles.rangeControl}
            role="group"
            aria-label="Behavior date range"
          >
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={range === option.id}
                onClick={() => setRange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.exportButton}
            onClick={exportBehavior}
          >
            {exported ? (
              <>
                <CheckCircle size={17} weight="fill" aria-hidden /> Exported
              </>
            ) : (
              <>
                <DownloadSimple size={17} weight="bold" aria-hidden /> Export
                behavior
              </>
            )}
          </button>
        </div>
      </header>

      <SummaryStrip range={range} />

      <div className={styles.behaviorBoard}>
        <SessionList
          sessions={filteredSessions}
          selectedId={selectedSession.id}
          query={query}
          onQueryChange={setQuery}
          onSelect={setSelectedSessionId}
        />
        <JourneyPanel session={selectedSession} />
        <ReasonPanel key={selectedSession.id} session={selectedSession} />
        <ProductContext session={selectedSession} />
        <ReasonPatterns />
      </div>

      <footer className={styles.reportFooter}>
        <WarningCircle size={15} weight="duotone" aria-hidden />
        <span>
          Demo values only. Actions are recorded facts; motivations are labeled
          as inferences and show their supporting signals. No live customer data
          is connected.
        </span>
      </footer>
    </div>
  );
}
