"use client";

import {
  ArrowClockwise,
  ArrowRight,
  CaretDown,
  ChartLineUp,
  CheckCircle,
  ClipboardText,
  ClockCountdown,
  Coins,
  Database,
  Eye,
  FileText,
  Handbag,
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
import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { MERCHANT_DASHBOARD_DATA } from "../../data/merchantDashboardData";
import { useMerchantDashboard } from "../../hooks/useMerchantDashboard";
import type {
  MerchantField,
  MerchantIconName,
  MerchantRecord,
  MerchantStatus,
  MerchantTabView,
  MerchantTimelineItem,
} from "../../types";
import styles from "./integrationsCommerceExperience.module.css";
import {
  MerchantPreviewDrawer,
  type MerchantPreviewDrawerContent,
} from "../MerchantPreviewDrawer";

type OwnedSection = "integrations" | "commerce";
type Icon = ComponentType<{
  size?: number;
  weight?: "regular" | "fill" | "duotone" | "bold";
  "aria-hidden"?: boolean;
}>;

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

const integrationTabCopy: Record<
  string,
  { label: string; detail: string; icon: Icon }
> = {
  connections: {
    label: "Systems",
    detail: "See what is connected and what needs attention.",
    icon: Database,
  },
  scopes: {
    label: "Access",
    detail: "Understand what PrimeStyleAI can and cannot read.",
    icon: ShieldCheck,
  },
  tests: {
    label: "Launch tests",
    detail: "Confirm the full store-to-order flow is ready.",
    icon: ClipboardText,
  },
};

const commerceTabCopy: Record<
  string,
  { label: string; detail: string; icon: Icon }
> = {
  decisions: { label: "Decision", detail: "Why a size was shown", icon: Ruler },
  "ai-results": {
    label: "Result",
    detail: "Delivered or excluded",
    icon: Sparkle,
  },
  cart: { label: "Cart", detail: "Exact item handoff", icon: ShoppingCart },
  orders: { label: "Order", detail: "Sale evidence", icon: Handbag },
  returns: {
    label: "Return",
    detail: "Refund or exchange",
    icon: ArrowClockwise,
  },
  attribution: { label: "Source", detail: "Referral proof", icon: LinkSimple },
};

type TaskCopy = { label: string; detail: string; icon: Icon };

function exceptionRank(tone: MerchantStatus["tone"]) {
  if (tone === "critical") return 0;
  if (tone === "warning" || tone === "info") return 1;
  return 2;
}

function StatusPill({ status }: { status: MerchantStatus }) {
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
    <span className={`${styles.statusPill} ${styles[`status_${status.tone}`]}`}>
      <StatusIcon size={14} weight="fill" aria-hidden />
      {status.label}
    </span>
  );
}

function WorkspaceHeader({ section }: { section: OwnedSection }) {
  const merchant = MERCHANT_DASHBOARD_DATA.merchant;
  const content =
    section === "integrations"
      ? {
          eyebrow: "Store setup",
          title: "Your store connections",
          detail:
            "See how product, cart, order, and return data moves—and what your team needs to review.",
        }
      : {
          eyebrow: "Shopper-to-order journey",
          title: "From shopper decision to confirmed order",
          detail:
            "Follow every step without losing the merchant evidence behind sizing, cart, sales, returns, or attribution.",
        };

  return (
    <header className={styles.pageHeader}>
      <div className={styles.headerCopy}>
        <span>{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.detail}</p>
      </div>
      <div className={styles.headerMeta}>
        <span className={styles.demoPill}>
          <i aria-hidden /> Read-only demo
        </span>
        <div className={styles.merchantPill}>
          <Image src={merchant.avatar} width={40} height={40} alt="" />
          <span>
            <strong>{merchant.name}</strong>
            <small>Merchant workspace</small>
          </span>
        </div>
      </div>
    </header>
  );
}

function MetricCards({ view }: { view: MerchantTabView }) {
  const metricIcons: Icon[] = [ChartLineUp, CheckCircle, ClockCountdown];
  return (
    <div className={styles.metricCards} aria-label={`${view.label} summary`}>
      {view.metrics?.map((metric, index) => {
        const MetricIcon = metricIcons[index] ?? ChartLineUp;
        return (
          <article key={metric.label}>
            <span className={styles.metricIcon}>
              <MetricIcon size={21} weight="duotone" aria-hidden />
            </span>
            <span className={styles.metricLabel}>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        );
      })}
    </div>
  );
}

function FieldList({ fields }: { fields?: MerchantField[] }) {
  if (!fields?.length) return null;
  return (
    <dl className={styles.fieldList}>
      {fields.map((field) => (
        <div key={`${field.label}-${field.value}`}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TechnicalDetails({
  children,
  label = "View technical evidence",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <details className={styles.technicalDetails}>
      <summary>
        {label}
        <ArrowRight size={16} aria-hidden />
      </summary>
      <div>{children}</div>
    </details>
  );
}

function ActionSummary({
  eyebrow,
  title,
  detail,
  action,
  tone = "warning",
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: ReactNode;
  tone?: "warning" | "positive" | "info";
}) {
  const SummaryIcon =
    tone === "positive" ? CheckCircle : tone === "info" ? Eye : WarningCircle;
  return (
    <section
      className={`${styles.actionSummary} ${styles[`actionSummary_${tone}`]}`}
    >
      <span className={styles.actionSummaryIcon}>
        <SummaryIcon size={24} weight="duotone" aria-hidden />
      </span>
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {action ? (
        <div className={styles.actionSummaryAction}>{action}</div>
      ) : null}
    </section>
  );
}

function MobileTaskPicker({
  tabs,
  activeTabId,
  copy,
  section,
}: {
  tabs: MerchantTabView[];
  activeTabId: string;
  copy: Record<string, TaskCopy>;
  section: OwnedSection;
}) {
  const [open, setOpen] = useState(false);
  const activeCopy = copy[activeTabId];
  const ActiveIcon = activeCopy.icon;
  return (
    <details
      className={styles.mobileTaskPicker}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span className={styles.mobileTaskCurrent}>
          <span className={styles.stepIcon}>
            <ActiveIcon size={20} weight="duotone" aria-hidden />
          </span>
          <span>
            <small>Current task</small>
            <strong>{activeCopy.label}</strong>
          </span>
        </span>
        <span className={styles.mobileTaskPrompt}>
          Choose another task <CaretDown size={16} weight="bold" aria-hidden />
        </span>
      </summary>
      <div>
        {tabs.map((tab) => {
          const tabCopy = copy[tab.id];
          const TabIcon = tabCopy.icon;
          const active = tab.id === activeTabId;
          return (
            <Link
              key={tab.id}
              href={`/merchants/dashboard/${section}${tab.id === tabs[0]?.id ? "" : `?tab=${tab.id}`}`}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span className={styles.stepIcon}>
                <TabIcon size={19} weight="duotone" aria-hidden />
              </span>
              <span>
                <strong>{tabCopy.label}</strong>
                <small>{tabCopy.detail}</small>
              </span>
              {active ? (
                <CheckCircle size={18} weight="fill" aria-hidden />
              ) : (
                <ArrowRight size={17} aria-hidden />
              )}
            </Link>
          );
        })}
      </div>
    </details>
  );
}

function IntegrationNavigator({
  tabs,
  activeTabId,
}: {
  tabs: MerchantTabView[];
  activeTabId: string;
}) {
  return (
    <>
      <nav className={styles.integrationNav} aria-label="Integration workspace">
        {tabs.map((tab, index) => {
          const copy = integrationTabCopy[tab.id];
          const TabIcon = copy.icon;
          const active = tab.id === activeTabId;
          return (
            <Link
              key={tab.id}
              href={`/merchants/dashboard/integrations${tab.id === tabs[0]?.id ? "" : `?tab=${tab.id}`}`}
              aria-current={active ? "page" : undefined}
              className={active ? styles.navCardActive : undefined}
            >
              <span className={styles.navNumber}>0{index + 1}</span>
              <span className={styles.navIcon}>
                <TabIcon size={20} weight="duotone" aria-hidden />
              </span>
              <span className={styles.navCopy}>
                <strong>{copy.label}</strong>
                <small>{copy.detail}</small>
              </span>
              <ArrowRight size={17} weight="bold" aria-hidden />
            </Link>
          );
        })}
      </nav>
      <MobileTaskPicker
        tabs={tabs}
        activeTabId={activeTabId}
        copy={integrationTabCopy}
        section="integrations"
      />
    </>
  );
}

function CommerceNavigator({
  tabs,
  activeTabId,
}: {
  tabs: MerchantTabView[];
  activeTabId: string;
}) {
  return (
    <>
      <nav className={styles.commerceNav} aria-label="Commerce lifecycle">
        {tabs.map((tab, index) => {
          const copy = commerceTabCopy[tab.id];
          const TabIcon = copy.icon;
          const active = tab.id === activeTabId;
          return (
            <Link
              key={tab.id}
              href={`/merchants/dashboard/commerce${tab.id === tabs[0]?.id ? "" : `?tab=${tab.id}`}`}
              aria-current={active ? "step" : undefined}
              className={active ? styles.commerceStepActive : undefined}
            >
              <span className={styles.stepIcon}>
                <TabIcon size={19} weight="duotone" aria-hidden />
              </span>
              <span>
                <small>Task {index + 1}</small>
                <strong>{copy.label}</strong>
                <em>{copy.detail}</em>
              </span>
              {index < tabs.length - 1 ? (
                <ArrowRight
                  className={styles.stepArrow}
                  size={16}
                  aria-hidden
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
      <MobileTaskPicker
        tabs={tabs}
        activeTabId={activeTabId}
        copy={commerceTabCopy}
        section="commerce"
      />
    </>
  );
}

function ConnectionsWorkflow({ view }: { view: MerchantTabView }) {
  const cards = useMemo(
    () =>
      [...(view.cards ?? [])].sort(
        (a, b) => exceptionRank(a.status.tone) - exceptionRank(b.status.tone),
      ),
    [view.cards],
  );
  const timeline = useMemo(
    () =>
      [...(view.timeline ?? [])].sort(
        (a, b) => exceptionRank(a.status.tone) - exceptionRank(b.status.tone),
      ),
    [view.timeline],
  );
  const [selectedId, setSelectedId] = useState(cards[0]?.id ?? "");
  const selected = cards.find((item) => item.id === selectedId) ?? cards[0];

  return (
    <div className={styles.workflowStack}>
      <section className={styles.connectionHero}>
        <div>
          <span className={styles.kicker}>2 things to fix before launch</span>
          <h2>Review the launch exceptions first.</h2>
          <p>
            All three store systems are connected. The exchange and refund path
            still needs your team.
          </p>
          <Link
            href="/merchants/dashboard/integrations?tab=tests"
            className={styles.primaryButton}
          >
            Open launch tests <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
        <div className={styles.heroArtwork}>
          <Image
            src="/media/merchant-dashboard/generated/integrations-commerce/integrations-system-hub.webp"
            alt="Secure fashion storefront, cart, catalog, and order systems connected through one merchant data hub"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 520px"
          />
        </div>
      </section>

      <MetricCards view={view} />

      <section className={styles.systemMap} aria-label="Connected system map">
        <div className={styles.mapSource}>
          <span className={styles.mapIcon}>
            <Package size={24} weight="duotone" aria-hidden />
          </span>
          <span>
            <small>Merchant source</small>
            <strong>Northstar Shopify store</strong>
            <em>Products, inventory, checkout and orders</em>
          </span>
        </div>
        <ArrowRight
          className={styles.mapArrow}
          size={26}
          weight="bold"
          aria-hidden
        />
        <div className={styles.mapHub}>
          <Image src="/icon.svg" width={45} height={45} alt="" />
          <span>
            <small>Authorized connection</small>
            <strong>PrimeStyleAI</strong>
            <em>Uses only the agreed data paths</em>
          </span>
        </div>
        <ArrowRight
          className={styles.mapArrow}
          size={26}
          weight="bold"
          aria-hidden
        />
        <div className={styles.mapDestinations}>
          {cards.map((card) => {
            const CardIcon = icons[card.icon];
            const active = selected?.id === card.id;
            return (
              <button
                key={card.id}
                type="button"
                aria-pressed={active}
                className={active ? styles.systemCardActive : undefined}
                onClick={() => setSelectedId(card.id)}
              >
                <span>
                  <CardIcon size={20} weight="duotone" aria-hidden />
                </span>
                <span>
                  <strong>{card.title}</strong>
                  <small>{card.meta}</small>
                </span>
                <StatusPill status={card.status} />
              </button>
            );
          })}
        </div>
      </section>

      {selected ? (
        <section className={styles.evidencePanel} aria-live="polite">
          <div className={styles.evidenceHeader}>
            <div>
              <span>
                {selected.status.tone === "positive"
                  ? "Connected system"
                  : "Review this system"}
              </span>
              <h3>{selected.title}</h3>
              <p>{selected.detail}</p>
            </div>
            <StatusPill status={selected.status} />
          </div>
          <TechnicalDetails label="Details">
            <FieldList fields={selected.fields} />
          </TechnicalDetails>
        </section>
      ) : null}

      <section className={styles.eventGrid}>
        <div className={styles.sectionTitle}>
          <span>Latest evidence</span>
          <h3>What moved through the connection</h3>
        </div>
        <div>
          {timeline.map((item) => (
            <EventCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function EventCard({ item }: { item: MerchantTimelineItem }) {
  const EventIcon = icons[item.icon];
  return (
    <article className={styles.eventCard}>
      <span className={styles.eventIcon}>
        <EventIcon size={21} weight="duotone" aria-hidden />
      </span>
      <span>
        <strong>{item.title}</strong>
        <p>{item.detail}</p>
        <small>{item.meta}</small>
      </span>
      <StatusPill status={item.status} />
    </article>
  );
}

function ScopesWorkflow({ view }: { view: MerchantTabView }) {
  const granted =
    view.matrixRows?.filter((row) =>
      row.values.some((value) => value.status?.label === "Approved"),
    ) ?? [];
  const restricted =
    view.matrixRows?.filter((row) =>
      row.values.some((value) => value.status?.label === "Not granted"),
    ) ?? [];
  return (
    <div className={styles.workflowStack}>
      <ActionSummary
        eyebrow="No access change needed"
        title="Check the two boundaries that protect your store."
        detail="PrimeStyleAI can read the agreed commerce data. Payments and unrelated customer data remain blocked."
        tone="positive"
        action={
          <StatusPill
            status={{ label: "Boundary confirmed", tone: "positive" }}
          />
        }
      />
      <section className={styles.permissionGrid}>
        <article className={styles.permissionAllowed}>
          <span className={styles.permissionIcon}>
            <ShieldCheck size={29} weight="duotone" aria-hidden />
          </span>
          <div>
            <span>Allowed to read</span>
            <h3>Only the data needed to run your agreed service</h3>
            <p>
              PrimeStyleAI can check products, inventory, orders, and returns.
              It cannot change your payment system.
            </p>
          </div>
          <ul>
            {granted.map((row) => (
              <li key={row.id}>
                <CheckCircle size={18} weight="fill" aria-hidden />
                <span>
                  <strong>{row.label}</strong>
                  <small>{row.detail}</small>
                </span>
              </li>
            ))}
          </ul>
        </article>
        <article className={styles.permissionBlocked}>
          <span className={styles.permissionIcon}>
            <LockKey size={29} weight="duotone" aria-hidden />
          </span>
          <div>
            <span>Never allowed</span>
            <h3>
              Payments and unrelated customer data stay outside the connection
            </h3>
            <p>
              Restricted permissions remain visible so the boundary is easy to
              understand.
            </p>
          </div>
          <ul>
            {restricted.map((row) => (
              <li key={row.id}>
                <WarningCircle size={18} weight="fill" aria-hidden />
                <span>
                  <strong>{row.label}</strong>
                  <small>{row.detail}</small>
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <TechnicalDetails label="Details">
        <div className={styles.credentialDetails}>
          <span>
            <small>Credential handling</small>
            <strong>Hidden from this demo</strong>
          </span>
          <span>
            <small>Next planned review</small>
            <strong>{view.metrics?.[2]?.value}</strong>
          </span>
          <span>
            <small>Merchant control</small>
            <strong>Rotation and revocation stay with your team</strong>
          </span>
        </div>
        <p className={styles.mobileScrollCue}>
          Scroll sideways to see all access columns.
        </p>
        <div className={styles.scopeTableViewport}>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                {view.matrixColumns?.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.matrixRows?.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.label}</strong>
                    <small>{row.detail}</small>
                  </td>
                  {row.values.map((value) => (
                    <td key={`${row.id}-${value.label}`}>
                      {value.status ? (
                        <StatusPill status={value.status} />
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
        <p className={styles.demoNote}>
          Rotation and revocation are not connected in this read-only demo.
        </p>
      </TechnicalDetails>
    </div>
  );
}

function TestsWorkflow({ view }: { view: MerchantTabView }) {
  const orderedSteps = useMemo(
    () =>
      [...(view.timeline ?? [])].sort(
        (a, b) => exceptionRank(a.status.tone) - exceptionRank(b.status.tone),
      ),
    [view.timeline],
  );
  const exceptionSteps = orderedSteps.filter(
    (step) => step.status.tone !== "positive",
  );
  const passedSteps = orderedSteps.filter(
    (step) => step.status.tone === "positive",
  );
  const firstException = orderedSteps.find(
    (step) => step.status.tone !== "positive",
  );
  const [selectedId, setSelectedId] = useState(
    firstException?.id ?? orderedSteps[0]?.id ?? "",
  );
  const [preview, setPreview] = useState<MerchantPreviewDrawerContent | null>(
    null,
  );
  const selected =
    orderedSteps.find((step) => step.id === selectedId) ?? orderedSteps[0];
  const openReturnMappingPreview = () => {
    setSelectedId(firstException?.id ?? orderedSteps[0]?.id ?? "");
    setPreview({
      eyebrow: "Launch fix preview",
      title: "Fix the return mapping",
      description:
        "See what the merchant must confirm before the failed return check can pass. No test or integration request is sent.",
      steps: [
        {
          title: "Review the failed value",
          detail:
            "Compare the received exchange reason with the merchant-approved return value.",
        },
        {
          title: "Confirm the replacement mapping",
          detail:
            "Prepare the exact field correction and its owner for review.",
        },
        {
          title: "Run the protected check later",
          detail:
            "A real rerun would happen only after the merchant confirms the mapping outside this demo.",
        },
      ],
      evidence: [
        {
          label: "Current result",
          value: view.metrics?.[0]?.value ?? "42 / 44",
        },
        { label: "Failed area", value: "Exchange reason mapping" },
        { label: "Owner", value: "Integration engineering" },
        { label: "Persistence", value: "None — preview only" },
      ],
    });
  };
  return (
    <div className={styles.workflowStack}>
      <section className={styles.readinessHero}>
        <div className={styles.readinessIssue}>
          <span className={styles.kicker}>2 checks need review</span>
          <h2>Fix the failed return check before launch.</h2>
          <p>
            The main store flow works. The exchange reason still does not match
            the merchant-approved value.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={openReturnMappingPreview}
          >
            Fix return mapping <ArrowRight size={17} aria-hidden />
          </button>
        </div>
        <div className={styles.readinessScore}>
          <span>Passed</span>
          <strong>{view.metrics?.[0]?.value}</strong>
          <small>launch checks</small>
        </div>
      </section>

      <section
        className={styles.testJourney}
        aria-label="Launch acceptance journey"
      >
        {exceptionSteps.map((step, index) => {
          const StepIcon = icons[step.icon];
          const active = selected?.id === step.id;
          return (
            <button
              key={step.id}
              type="button"
              aria-pressed={active}
              className={active ? styles.testStepActive : undefined}
              onClick={() => setSelectedId(step.id)}
            >
              <span className={styles.testStepNumber}>0{index + 1}</span>
              <span className={styles.testStepIcon}>
                <StepIcon size={22} weight="duotone" aria-hidden />
              </span>
              <strong>{step.title}</strong>
              <small>{step.meta}</small>
              <StatusPill status={step.status} />
            </button>
          );
        })}
      </section>

      <details className={styles.passedTests}>
        <summary>{passedSteps.length} passed checks</summary>
        <div className={styles.testJourney}>
          {passedSteps.map((step, index) => {
            const StepIcon = icons[step.icon];
            const active = selected?.id === step.id;
            return (
              <button
                key={step.id}
                type="button"
                aria-pressed={active}
                className={active ? styles.testStepActive : undefined}
                onClick={() => setSelectedId(step.id)}
              >
                <span className={styles.testStepNumber}>{index + 1}</span>
                <span className={styles.testStepIcon}>
                  <StepIcon size={22} weight="duotone" aria-hidden />
                </span>
                <strong>{step.title}</strong>
                <small>{step.meta}</small>
                <StatusPill status={step.status} />
              </button>
            );
          })}
        </div>
      </details>

      {selected ? (
        <section className={styles.selectedTest} aria-live="polite">
          <div>
            <span>Selected check</span>
            <h3>{selected.title}</h3>
            <p>{selected.detail}</p>
          </div>
          <div className={styles.testExplanation}>
            <article>
              <span>What happened</span>
              <strong>{selected.meta}</strong>
              <p>
                {selected.status.tone === "warning"
                  ? "The exchange reason field did not map to the merchant-approved value."
                  : "The expected merchant evidence was received in the correct order."}
              </p>
            </article>
            <article>
              <span>Why it matters</span>
              <strong>
                {selected.status.tone === "warning"
                  ? "Returns could be reported incorrectly"
                  : "This stage is protected"}
              </strong>
              <p>
                No merchant outcome is estimated when evidence is incomplete.
              </p>
            </article>
            <article>
              <span>What happens next</span>
              <strong>
                {selected.status.tone === "warning"
                  ? "Merchant confirms the mapping"
                  : "No action needed"}
              </strong>
              <p>Run controls remain disabled in this demo workspace.</p>
            </article>
          </div>
        </section>
      ) : null}

      <section className={styles.runCards}>
        <div className={styles.sectionTitle}>
          <span>Past runs</span>
          <h3>Acceptance evidence</h3>
        </div>
        <div>
          {[...(view.records ?? [])]
            .sort(
              (a, b) =>
                exceptionRank(a.status.tone) - exceptionRank(b.status.tone),
            )
            .map((record) => (
              <RecordSummaryCard key={record.id} record={record} />
            ))}
        </div>
      </section>
      <MerchantPreviewDrawer
        content={preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

function RecordSummaryCard({
  record,
  onClick,
  active = false,
}: {
  record: MerchantRecord;
  onClick?: () => void;
  active?: boolean;
}) {
  const RecordIcon = icons[record.icon];
  const content = (
    <>
      <span className={styles.eventIcon}>
        <RecordIcon size={21} weight="duotone" aria-hidden />
      </span>
      <span>
        <strong>{record.title}</strong>
        <p>{record.subtitle}</p>
      </span>
      <StatusPill status={record.status} />
    </>
  );
  return onClick ? (
    <button
      type="button"
      aria-pressed={active}
      className={`${styles.recordSummaryCard} ${active ? styles.recordSummaryActive : ""}`}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <article className={styles.recordSummaryCard}>{content}</article>
  );
}

function productImage(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("blazer"))
    return "/media/merchant-dashboard/generated/products/final/product-navy-blazer.webp";
  if (normalized.includes("trouser"))
    return "/media/merchant-dashboard/generated/products/final/product-stone-trousers.webp";
  if (normalized.includes("slingback") || normalized.includes("pump"))
    return "/media/merchant-dashboard/generated/products/final/product-sand-slingbacks.webp";
  return "/media/merchant-dashboard/generated/products/final/product-silk-dress.webp";
}

type DecisionFilter = "all" | "followed" | "override" | "manual" | "evidence";

function DecisionsWorkflow({ view }: { view: MerchantTabView }) {
  const records = useMemo(
    () =>
      [...(view.records ?? [])].sort(
        (a, b) => exceptionRank(a.status.tone) - exceptionRank(b.status.tone),
      ),
    [view.records],
  );
  const [filter, setFilter] = useState<DecisionFilter>("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const recommended = record.cells.recommended;
        const selected = record.cells.selected;
        const haystack =
          `${record.title} ${record.subtitle} ${record.cells.product}`.toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesFilter =
          filter === "all" ||
          (filter === "followed" && recommended === selected) ||
          (filter === "override" &&
            recommended !== selected &&
            recommended !== "Choose manually") ||
          (filter === "manual" && recommended === "Choose manually") ||
          (filter === "evidence" &&
            (record.status.tone === "info" ||
              record.cells.confidence === "Unavailable"));
        return matchesQuery && matchesFilter;
      }),
    [filter, query, records],
  );
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const selected =
    filtered.find((record) => record.id === selectedId) ?? filtered[0];

  const filters: Array<{ id: DecisionFilter; label: string }> = [
    { id: "all", label: "All decisions" },
    { id: "followed", label: "Followed advice" },
    { id: "override", label: "Chose another size" },
    { id: "manual", label: "Manual choice" },
    { id: "evidence", label: "Needs evidence" },
  ];

  return (
    <div className={styles.workflowStack}>
      <ActionSummary
        eyebrow="1 decision needs evidence"
        title="Review the recommendation with missing product evidence."
        detail="The shopper’s choice is always kept. Open a decision to see the reason in plain language."
        action={
          <span className={styles.helperPill}>
            <Eye size={16} weight="duotone" aria-hidden /> Choose a decision
          </span>
        }
      />
      <MetricCards view={view} />
      <div className={styles.decisionTools}>
        <label>
          <MagnifyingGlass size={18} aria-hidden />
          <span className={styles.srOnly}>Search decisions</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product or decision"
          />
        </label>
        <div aria-label="Decision filters">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {selected ? (
        <section className={styles.decisionExplorer}>
          <div className={styles.decisionList}>
            {filtered.map((record) => (
              <RecordSummaryCard
                key={record.id}
                record={record}
                active={selected.id === record.id}
                onClick={() => setSelectedId(record.id)}
              />
            ))}
          </div>
          <div className={styles.productDecision} aria-live="polite">
            <div className={styles.productVisual}>
              <Image
                src={productImage(selected.cells.product)}
                alt={selected.cells.product}
                fill
                sizes="(max-width: 760px) 100vw, 280px"
              />
            </div>
            <div className={styles.productDecisionCopy}>
              <span>{selected.cells.product}</span>
              <h3>{selected.title}</h3>
              <p>{selected.subtitle}</p>
              <StatusPill status={selected.status} />
            </div>
            <div className={styles.decisionPath}>
              <article>
                <span>1 · Evidence used</span>
                <strong>Merchant sizing evidence</strong>
                <small>Current approved size chart</small>
              </article>
              <ArrowRight size={23} weight="bold" aria-hidden />
              <article className={styles.recommendationCard}>
                <span>2 · Recommended</span>
                <strong>{selected.cells.recommended}</strong>
                <small>{selected.cells.confidence}</small>
              </article>
              <ArrowRight size={23} weight="bold" aria-hidden />
              <article className={styles.selectionCard}>
                <span>3 · Shopper chose</span>
                <strong>{selected.cells.selected}</strong>
                <small>
                  {selected.cells.selected === selected.cells.recommended
                    ? "Advice followed"
                    : "Shopper choice retained"}
                </small>
              </article>
            </div>
            <div className={styles.caveatCard}>
              <WarningCircle size={22} weight="duotone" aria-hidden />
              <span>
                <strong>What the merchant should know</strong>
                <p>
                  {selected.fields?.find((field) => field.label === "Caveat")
                    ?.value ??
                    selected.fields?.find(
                      (field) => field.label === "Missing evidence",
                    )?.value ??
                    "Recommendation evidence is retained without guaranteeing fit."}
                </p>
              </span>
            </div>
            <TechnicalDetails label="Details">
              <FieldList fields={selected.fields} />
            </TechnicalDetails>
          </div>
        </section>
      ) : (
        <EmptyState
          onReset={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <section className={styles.emptyState}>
      <MagnifyingGlass size={31} weight="duotone" aria-hidden />
      <h3>No decisions match this view</h3>
      <p>
        Clear the search or show all decisions. No stale detail is displayed.
      </p>
      <button type="button" onClick={onReset}>
        Show all decisions
      </button>
    </section>
  );
}

const resultImages: Record<string, string> = {
  "EVT-78432": "/media/partner-landing/merchant-network/try-on-model.webp",
  "EVT-78421": "/media/partner-landing/merchant-network/product-story.webp",
  "EVT-78398": "/media/partner-landing/merchant-network/knit-product.webp",
};

function AiResultsWorkflow({ view }: { view: MerchantTabView }) {
  const cards = useMemo(
    () =>
      [...(view.cards ?? [])].sort(
        (a, b) => exceptionRank(a.status.tone) - exceptionRank(b.status.tone),
      ),
    [view.cards],
  );
  const [selectedId, setSelectedId] = useState(cards[0]?.id ?? "");
  const selected = cards.find((card) => card.id === selectedId) ?? cards[0];
  return (
    <div className={styles.workflowStack}>
      <section className={styles.resultExplainer}>
        <div>
          <span className={styles.kicker}>
            46 results excluded from billing
          </span>
          <h2>Check the delivery exceptions before approving usage.</h2>
          <p>
            Failed, retried, duplicate, or undelivered results are not billed.
            Only a result delivered to the shopper is included.
          </p>
        </div>
        <MetricCards view={view} />
      </section>
      <section className={styles.resultWorkspace}>
        <div className={styles.resultGallery}>
          {cards.map((card) => {
            const active = card.id === selected?.id;
            const included = card.status.label !== "Excluded";
            return (
              <button
                key={card.id}
                type="button"
                aria-pressed={active}
                className={active ? styles.resultCardActive : undefined}
                onClick={() => setSelectedId(card.id)}
              >
                <span className={styles.resultImage}>
                  <Image
                    src={
                      resultImages[card.id] ??
                      card.illustration ??
                      "/media/merchant-dashboard/illustrations/commerce.webp"
                    }
                    alt={card.illustrationAlt ?? card.title}
                    fill
                    sizes="(max-width: 760px) 100vw, 360px"
                  />
                </span>
                <span className={styles.resultBilling}>
                  <strong>{included ? "Included" : "Excluded"}</strong>
                  <em>
                    {card.meta.includes("$")
                      ? card.meta.split(" · ")[0]
                      : card.meta}
                  </em>
                </span>
                <span className={styles.resultCopy}>
                  <strong>{card.title}</strong>
                  <small>{card.detail}</small>
                </span>
              </button>
            );
          })}
        </div>
        {selected ? (
          <aside className={styles.resultEvidence} aria-live="polite">
            <div className={styles.evidenceHeader}>
              <div>
                <span>Selected result</span>
                <h3>{selected.title}</h3>
                <p>{selected.detail}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>
            <TechnicalDetails label="Details">
              <FieldList fields={selected.fields} />
              <p className={styles.demoNote}>
                Refreshes and verified retries are never double-counted in this
                demo ledger.
              </p>
            </TechnicalDetails>
          </aside>
        ) : null}
      </section>
    </div>
  );
}

function CartWorkflow({ view }: { view: MerchantTabView }) {
  const steps = view.timeline ?? [];
  const firstException = steps.find((step) => step.status.tone !== "positive");
  const [selectedId, setSelectedId] = useState(
    firstException?.id ?? steps[0]?.id ?? "",
  );
  const selected = steps.find((step) => step.id === selectedId) ?? steps[0];
  return (
    <div className={styles.workflowStack}>
      <ActionSummary
        eyebrow="7 cart attempts blocked"
        title="Review blocked variants before shoppers try again."
        detail="A blocked handoff never adds the wrong item. Fifty-two shoppers were safely returned to the merchant product page."
        action={
          <StatusPill
            status={{ label: "Safe fallback active", tone: "warning" }}
          />
        }
      />
      <MetricCards view={view} />
      <section className={styles.cartFlow} aria-label="Exact item cart path">
        <div className={styles.cartProduct}>
          <span className={styles.cartProductImage}>
            <Image
              src="/media/merchant-dashboard/generated/products/final/product-silk-dress.webp"
              alt="Silk column dress"
              fill
              sizes="190px"
            />
          </span>
          <span>
            <small>Shopper selection</small>
            <strong>Silk column dress</strong>
            <em>Ivory · M · quantity 1</em>
          </span>
        </div>
        <div className={styles.cartSteps}>
          {steps.map((step, index) => {
            const StepIcon = icons[step.icon];
            const active = step.id === selected?.id;
            return (
              <button
                key={step.id}
                type="button"
                aria-pressed={active}
                className={active ? styles.cartStepActive : undefined}
                onClick={() => setSelectedId(step.id)}
              >
                <span className={styles.cartStepNumber}>{index + 1}</span>
                <span className={styles.cartStepIcon}>
                  <StepIcon size={21} weight="duotone" aria-hidden />
                </span>
                <span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                  <em>{step.meta}</em>
                </span>
                <StatusPill status={step.status} />
              </button>
            );
          })}
        </div>
        <div className={styles.cartBranches}>
          <article>
            <WarningCircle size={21} weight="duotone" aria-hidden />
            <span>
              <strong>Safe fallback</strong>
              <p>
                Open the merchant PDP when the exact variant cannot be
                confirmed.
              </p>
            </span>
          </article>
          <article>
            <LockKey size={21} weight="duotone" aria-hidden />
            <span>
              <strong>Blocked</strong>
              <p>Do not add anything when there is no safe variant.</p>
            </span>
          </article>
        </div>
      </section>
      {selected ? (
        <section className={styles.stepEvidence}>
          <div>
            <span>Selected check</span>
            <h3>{selected.title}</h3>
            <p>{selected.detail}</p>
          </div>
          <StatusPill status={selected.status} />
        </section>
      ) : null}
      <section className={styles.recentCards}>
        <div className={styles.sectionTitle}>
          <span>Recent handoffs</span>
          <h3>Confirmed and protected outcomes</h3>
        </div>
        <div>
          {view.records?.map((record) => (
            <RecordSummaryCard key={record.id} record={record} />
          ))}
        </div>
      </section>
    </div>
  );
}

function OrdersWorkflow({ view }: { view: MerchantTabView }) {
  const records = view.records ?? [];
  const [selectedId, setSelectedId] = useState(
    records.find((record) => record.status.tone === "critical")?.id ??
      records[0]?.id ??
      "",
  );
  const selected =
    records.find((record) => record.id === selectedId) ?? records[0];
  const columns = [
    {
      id: "evidence",
      label: "Needs evidence",
      detail: "Merchant proof required",
      items: records.filter((record) => record.status.tone === "critical"),
    },
    {
      id: "window",
      label: "Return window open",
      detail: "Financial state can still change",
      items: records.filter((record) =>
        record.fields?.some((field) => field.label === "Return window"),
      ),
    },
    {
      id: "validated",
      label: "Validated",
      detail: "Sale evidence received",
      items: records.filter((record) => record.status.tone === "positive"),
    },
  ];
  return (
    <div className={styles.workflowStack}>
      <section className={styles.orderHero}>
        <div>
          <span className={styles.kicker}>3 orders need evidence</span>
          <h2>Fix the missing order proof first.</h2>
          <p>
            Sales and commission stay pending until the merchant line reference
            is confirmed. The other 218 orders are validated.
          </p>
        </div>
        <MetricCards view={view} />
      </section>
      <section className={styles.orderBoard}>
        {columns.map((column) => (
          <div key={column.id}>
            <header>
              <span>
                <strong>{column.label}</strong>
                <small>{column.detail}</small>
              </span>
              <em>{column.items.length}</em>
            </header>
            <div>
              {column.items.map((record) => (
                <button
                  key={`${column.id}-${record.id}`}
                  type="button"
                  aria-pressed={selected?.id === record.id}
                  onClick={() => setSelectedId(record.id)}
                >
                  <span className={styles.orderThumb}>
                    <Image
                      src={productImage(record.cells.product)}
                      alt=""
                      fill
                      sizes="76px"
                    />
                  </span>
                  <span>
                    <strong>{record.title}</strong>
                    <small>{record.subtitle}</small>
                    <em>{record.cells.net}</em>
                  </span>
                  <StatusPill status={record.status} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
      {selected ? (
        <section className={styles.orderDetail} aria-live="polite">
          <div className={styles.orderDetailVisual}>
            <Image
              src={productImage(selected.cells.product)}
              alt={selected.cells.product}
              fill
              sizes="250px"
            />
          </div>
          <div>
            <span>Selected order</span>
            <h3>{selected.title}</h3>
            <p>{selected.subtitle}</p>
            <div className={styles.orderMoney}>
              <span>
                <small>Net sale</small>
                <strong>{selected.cells.net}</strong>
              </span>
              <span>
                <small>Attribution</small>
                <strong>{selected.cells.attribution}</strong>
              </span>
              <span>
                <small>Commission</small>
                <strong>{selected.cells.commission}</strong>
              </span>
            </div>
          </div>
          <div>
            <StatusPill status={selected.status} />
            <TechnicalDetails label="Details">
              <FieldList fields={selected.fields} />
            </TechnicalDetails>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ReturnsWorkflow({ view }: { view: MerchantTabView }) {
  const cards = useMemo(
    () =>
      [...(view.cards ?? [])].sort(
        (a, b) => exceptionRank(a.status.tone) - exceptionRank(b.status.tone),
      ),
    [view.cards],
  );
  const [selectedId, setSelectedId] = useState(cards[0]?.id ?? "");
  const selected = cards.find((card) => card.id === selectedId) ?? cards[0];
  return (
    <div className={styles.workflowStack}>
      <section className={styles.returnHero}>
        <div>
          <span className={styles.kicker}>5 exchanges need review</span>
          <h2>Reconcile the changed orders first.</h2>
          <p>
            Your store still issues every refund. PrimeStyleAI only updates the
            linked order, reporting, and commission state.
          </p>
        </div>
        <div className={styles.returnArtwork}>
          <Image
            src="/media/merchant-dashboard/generated/integrations-commerce/commerce-lifecycle.webp"
            alt="Fashion shopper journey from size decision and try-on through cart, order, return, and creator attribution"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 520px"
          />
        </div>
      </section>
      <MetricCards view={view} />
      <section className={styles.returnCases}>
        {cards.map((card) => {
          const active = selected?.id === card.id;
          const impact =
            card.fields?.find((field) => field.label === "Net impact")?.value ??
            card.fields?.find((field) => field.label === "Duplicate")?.value ??
            "No duplicate";
          return (
            <button
              key={card.id}
              type="button"
              aria-pressed={active}
              className={active ? styles.returnCaseActive : undefined}
              onClick={() => setSelectedId(card.id)}
            >
              <span className={styles.returnCaseImage}>
                <Image
                  src={productImage(card.title)}
                  alt=""
                  fill
                  sizes="160px"
                />
              </span>
              <span className={styles.returnCaseCopy}>
                <StatusPill status={card.status} />
                <strong>{card.title}</strong>
                <small>{card.detail}</small>
              </span>
              <span className={styles.returnPath}>
                <span>
                  <small>Order</small>
                  <strong>{card.detail.match(/#\d+/)?.[0] ?? card.id}</strong>
                </span>
                <ArrowRight size={19} aria-hidden />
                <span>
                  <small>Outcome</small>
                  <strong>{card.meta}</strong>
                </span>
                <ArrowRight size={19} aria-hidden />
                <span>
                  <small>Net impact</small>
                  <strong>{impact}</strong>
                </span>
              </span>
            </button>
          );
        })}
      </section>
      {selected ? (
        <section className={styles.evidencePanel}>
          <div className={styles.evidenceHeader}>
            <div>
              <span>Selected return</span>
              <h3>{selected.title}</h3>
              <p>{selected.detail}</p>
            </div>
            <StatusPill status={selected.status} />
          </div>
          <TechnicalDetails label="Details">
            <FieldList fields={selected.fields} />
            <p className={styles.demoNote}>
              Submit and refund actions are disabled because this is a read-only
              demo.
            </p>
          </TechnicalDetails>
        </section>
      ) : null}
    </div>
  );
}

function AttributionWorkflow({ view }: { view: MerchantTabView }) {
  const steps = view.timeline ?? [];
  const firstException = steps.find((step) => step.status.tone !== "positive");
  const [selectedId, setSelectedId] = useState(
    firstException?.id ?? steps[0]?.id ?? "",
  );
  const selected = steps.find((step) => step.id === selectedId) ?? steps[0];
  return (
    <div className={styles.workflowStack}>
      <section className={styles.attributionHero}>
        <div>
          <span className={styles.kicker}>16 orders need source proof</span>
          <h2>Review unmatched orders before commission is confirmed.</h2>
          <p>
            A creator referral starts the record. Only the merchant order
            postback proves the sale. Another 92.7% already have a complete
            chain.
          </p>
        </div>
        <button
          type="button"
          className={styles.reviewButton}
          onClick={() =>
            setSelectedId(
              firstException?.id ?? steps[steps.length - 1]?.id ?? "",
            )
          }
        >
          <WarningCircle size={21} weight="duotone" aria-hidden />
          <span>
            <strong>Review unmatched orders</strong>
            <small>See the missing proof</small>
          </span>
          <ArrowRight size={17} aria-hidden />
        </button>
      </section>
      <section
        className={styles.attributionPath}
        aria-label="Referral to order evidence path"
      >
        {steps.map((step, index) => {
          const StepIcon = icons[step.icon];
          const active = step.id === selected?.id;
          return (
            <div key={step.id} className={styles.attributionNodeWrap}>
              <button
                type="button"
                aria-pressed={active}
                className={active ? styles.attributionNodeActive : undefined}
                onClick={() => setSelectedId(step.id)}
              >
                <span className={styles.attributionNodeIcon}>
                  <StepIcon size={24} weight="duotone" aria-hidden />
                </span>
                <small>Proof {index + 1}</small>
                <strong>{step.title}</strong>
                <em>{step.meta}</em>
                <StatusPill status={step.status} />
              </button>
              {index < steps.length - 1 ? (
                <ArrowRight size={25} weight="bold" aria-hidden />
              ) : null}
            </div>
          );
        })}
      </section>
      {selected ? (
        <section className={styles.attributionEvidence} aria-live="polite">
          <div>
            <span>Selected proof</span>
            <h3>{selected.title}</h3>
            <p>{selected.detail}</p>
            <small>{selected.meta}</small>
          </div>
          <StatusPill status={selected.status} />
          <TechnicalDetails label="Details">
            <FieldList fields={view.fields} />
          </TechnicalDetails>
        </section>
      ) : null}
      <p className={styles.scopeNote}>
        <ShieldCheck size={19} weight="duotone" aria-hidden /> This workspace
        uses merchant order evidence and approved creator-campaign terms.
      </p>
    </div>
  );
}

function IntegrationsWorkspace({
  dashboard,
}: {
  dashboard: ReturnType<typeof useMerchantDashboard>;
}) {
  const view = dashboard.viewModel.activeView;
  return (
    <>
      <WorkspaceHeader section="integrations" />
      <IntegrationNavigator
        tabs={dashboard.viewModel.section.tabs}
        activeTabId={dashboard.activeTabId}
      />
      {view.id === "connections" ? <ConnectionsWorkflow view={view} /> : null}
      {view.id === "scopes" ? <ScopesWorkflow view={view} /> : null}
      {view.id === "tests" ? <TestsWorkflow view={view} /> : null}
    </>
  );
}

function CommerceWorkspace({
  dashboard,
}: {
  dashboard: ReturnType<typeof useMerchantDashboard>;
}) {
  const view = dashboard.viewModel.activeView;
  return (
    <>
      <WorkspaceHeader section="commerce" />
      <CommerceNavigator
        tabs={dashboard.viewModel.section.tabs}
        activeTabId={dashboard.activeTabId}
      />
      {view.id === "decisions" ? <DecisionsWorkflow view={view} /> : null}
      {view.id === "ai-results" ? <AiResultsWorkflow view={view} /> : null}
      {view.id === "cart" ? <CartWorkflow view={view} /> : null}
      {view.id === "orders" ? <OrdersWorkflow view={view} /> : null}
      {view.id === "returns" ? <ReturnsWorkflow view={view} /> : null}
      {view.id === "attribution" ? <AttributionWorkflow view={view} /> : null}
    </>
  );
}

export function IntegrationsCommerceExperience({
  section,
}: {
  section: OwnedSection;
}) {
  const dashboard = useMerchantDashboard(section);
  return (
    <div className={styles.experience}>
      {section === "integrations" ? (
        <IntegrationsWorkspace dashboard={dashboard} />
      ) : (
        <CommerceWorkspace dashboard={dashboard} />
      )}
      <p className={styles.previewNote}>
        Realistic demo data only. Authentication, integrations, persistence,
        billing actions, refunds, and merchant operations are not connected.
      </p>
    </div>
  );
}
