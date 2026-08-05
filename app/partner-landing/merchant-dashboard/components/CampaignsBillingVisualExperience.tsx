"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarBlank,
  CaretDown,
  Check,
  CheckCircle,
  Clock,
  Coins,
  DownloadSimple,
  FileCsv,
  FileText,
  Funnel,
  ImageSquare,
  Invoice,
  Package,
  Receipt,
  ShieldCheck,
  Sparkle,
  Storefront,
  UserCheck,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import type {
  MerchantStatus,
  MerchantStatusTone,
  MerchantTabView,
} from "../types";
import styles from "./campaignsBillingVisual.module.css";
import {
  MerchantPreviewDrawer,
  type MerchantPreviewDrawerContent,
} from "./MerchantPreviewDrawer";

type VisualSection = "campaigns" | "billing";
type IconComponent = ComponentType<{
  size?: number;
  weight?: "regular" | "bold" | "duotone" | "fill";
  "aria-hidden"?: boolean;
}>;

const taskSwitchers: Record<
  VisualSection,
  Array<{
    id: string;
    label: string;
    detail: string;
    count: string;
    icon: IconComponent;
  }>
> = {
  campaigns: [
    {
      id: "campaigns",
      label: "Campaigns",
      detail: "Launch, pause and review results",
      count: "1 to review",
      icon: Storefront,
    },
    {
      id: "publishers",
      label: "Creators",
      detail: "Approve access and disclosures",
      count: "3 waiting",
      icon: UsersThree,
    },
    {
      id: "terms",
      label: "Commission",
      detail: "Set rate and return rules",
      count: "8.4%",
      icon: Coins,
    },
  ],
  billing: [
    {
      id: "events",
      label: "Charges",
      detail: "See what was charged and why",
      count: "46 protected",
      icon: Sparkle,
    },
    {
      id: "statements",
      label: "Statement",
      detail: "Review what you owe",
      count: "$642 due",
      icon: Invoice,
    },
    {
      id: "disputes",
      label: "Questions",
      detail: "Send proof and track the answer",
      count: "2 open",
      icon: WarningCircle,
    },
    {
      id: "exports",
      label: "Reports",
      detail: "Download finance-ready files",
      count: "8 ready",
      icon: DownloadSimple,
    },
  ],
};

const statusClass: Record<MerchantStatusTone, string> = {
  positive: styles.statusPositive,
  warning: styles.statusWarning,
  critical: styles.statusCritical,
  neutral: styles.statusNeutral,
  info: styles.statusInfo,
};

const creatorImages: Record<string, string> = {
  "PUB-00412": "/media/partner-landing/creator-match-maya.png",
  "PUB-00418": "/media/partner-landing/creator-match-rae.png",
  "PUB-00431": "/media/partner-landing/creator-match-zoe.png",
};

function StatusPill({ status }: { status: MerchantStatus }) {
  return (
    <span className={`${styles.statusPill} ${statusClass[status.tone]}`}>
      <span aria-hidden />
      {status.label}
    </span>
  );
}

function TaskLinks({
  section,
  activeId,
}: {
  section: VisualSection;
  activeId: string;
}) {
  return (
    <nav
      className={styles.taskSwitcher}
      aria-label={`${section === "campaigns" ? "Campaign" : "Billing"} tasks`}
    >
      {taskSwitchers[section].map((task) => {
        const Icon = task.icon;
        const active = task.id === activeId;
        return (
          <Link
            key={task.id}
            href={`/merchants/dashboard/${section}?tab=${task.id}`}
            className={active ? styles.taskActive : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.taskIcon}>
              <Icon size={21} weight="duotone" aria-hidden />
            </span>
            <span className={styles.taskCopy}>
              <strong>{task.label}</strong>
              <small>{task.detail}</small>
            </span>
            <em>{task.count}</em>
          </Link>
        );
      })}
    </nav>
  );
}

function TaskSwitcher({
  section,
  activeId,
}: {
  section: VisualSection;
  activeId: string;
}) {
  const activeTask =
    taskSwitchers[section].find((task) => task.id === activeId) ??
    taskSwitchers[section][0];
  return (
    <>
      <div className={styles.desktopTasks}>
        <TaskLinks section={section} activeId={activeId} />
      </div>
      <details className={styles.mobileTasks}>
        <summary>
          <span>
            <small>Current task</small>
            <strong>{activeTask.label}</strong>
          </span>
          <span>
            Choose another task{" "}
            <CaretDown size={16} weight="bold" aria-hidden />
          </span>
        </summary>
        <TaskLinks section={section} activeId={activeId} />
      </details>
    </>
  );
}

function MiniStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={styles.miniStat}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function PreviewButton({
  children,
  icon: Icon = ArrowRight,
}: {
  children: string;
  icon?: IconComponent;
}) {
  const [preview, setPreview] = useState<MerchantPreviewDrawerContent | null>(
    null,
  );
  const openPreview = () =>
    setPreview({
      eyebrow: "Campaign and billing preview",
      title: children,
      description:
        "Review the expected workflow and evidence without changing campaign, creator, statement, or report data.",
      steps: [
        {
          title: "Check the selected record",
          detail:
            "The current card, amount, owner, dates, and evidence stay visible for review.",
        },
        {
          title: "Preview the expected result",
          detail:
            "The dashboard explains what the action would prepare before any real submission.",
        },
        {
          title: "Return without saving",
          detail:
            "Closing this drawer resets the preview. No request, download, approval, or payment is sent.",
        },
      ],
    });
  return (
    <div className={styles.previewAction}>
      <button type="button" className={styles.demoButton} onClick={openPreview}>
        <span>{children}</span>
        <small>Local only</small>
        <Icon size={17} weight="bold" aria-hidden />
      </button>
      <MerchantPreviewDrawer
        content={preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

function EvidenceDetails({
  label = "Details",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <details className={styles.evidenceDetails}>
      <summary>
        {label}
        <CaretDown size={16} weight="bold" aria-hidden />
      </summary>
      <div>{children}</div>
    </details>
  );
}

function CampaignsWorkspace({ view }: { view: MerchantTabView }) {
  const cards = view.cards ?? [];
  const [selectedId, setSelectedId] = useState(cards[0]?.id ?? "");
  const selected = cards.find((card) => card.id === selectedId) ?? cards[0];
  const selectedRecord = view.records?.find(
    (record) => record.id === selected?.id,
  );
  const steps = [
    ["Products ready", "418 checked", Package],
    ["Terms accepted", "Version 4", FileText],
    ["Creators approved", "8 accepted", UserCheck],
    ["Tracking live", "Sessions linked", CheckCircle],
  ] as const;

  return (
    <div className={styles.stack}>
      <section className={styles.campaignHero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Your active creator program</span>
          <h2>Review the holiday campaign before you invite creators</h2>
          <p>
            Eight approved creators can already promote 418 tailoring products.
            Check the draft, then decide whether it is ready to launch.
          </p>
          <div className={styles.heroStats}>
            <MiniStat label="Live now" value="6" detail="2 more scheduled" />
            <MiniStat
              label="Sales this month"
              value="$18.6K"
              detail="Validated merchant orders"
            />
            <MiniStat
              label="Needs review"
              value="1"
              detail="Holiday campaign draft"
            />
          </div>
          <PreviewButton>Preview campaign review</PreviewButton>
        </div>
        <div className={styles.heroArt}>
          <Image
            src="/media/merchant-dashboard/generated/campaigns-billing/campaigns-workspace.webp"
            alt="Fashion products, creators and campaign performance connected in one workspace"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 520px"
          />
        </div>
      </section>

      <section className={styles.readinessCard}>
        <header>
          <div>
            <span className={styles.eyebrow}>Launch confidence</span>
            <h3>Autumn tailoring is ready and tracking correctly</h3>
          </div>
          <StatusPill status={{ label: "Live", tone: "positive" }} />
        </header>
        <ol className={styles.stageRail}>
          {steps.map(([title, detail, Icon]) => (
            <li key={title}>
              <span>
                <Icon size={19} weight="duotone" aria-hidden />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
              <Check size={16} weight="bold" aria-hidden />
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.campaignPicker}>
        <header className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Choose a campaign</span>
            <h3>See what is running and what needs work</h3>
            <p>
              Select a campaign to open its products, creators, terms and
              performance.
            </p>
          </div>
        </header>
        <div className={styles.campaignColumns}>
          <div className={styles.campaignCardList}>
            {cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                className={
                  card.id === selected?.id ? styles.selectionActive : undefined
                }
                aria-pressed={card.id === selected?.id}
                onClick={() => setSelectedId(card.id)}
              >
                <span className={styles.campaignThumb}>
                  <Image
                    src={
                      index === 0
                        ? "/media/merchant-dashboard/generated/products/tailored-wool-blazer.png"
                        : "/media/merchant-dashboard/generated/products/silk-column-dress.png"
                    }
                    alt=""
                    fill
                    sizes="150px"
                  />
                </span>
                <span className={styles.campaignCardCopy}>
                  <span>
                    <StatusPill status={card.status} />
                  </span>
                  <strong>{card.title}</strong>
                  <p>{card.detail}</p>
                  <em>{card.meta}</em>
                </span>
                <ArrowRight size={18} weight="bold" aria-hidden />
              </button>
            ))}
          </div>
          {selected ? (
            <aside className={styles.campaignBrief}>
              <header>
                <div>
                  <span className={styles.eyebrow}>Campaign brief</span>
                  <h3>{selected.title}</h3>
                  <p>{selectedRecord?.subtitle ?? selected.detail}</p>
                </div>
                <StatusPill status={selected.status} />
              </header>
              <dl className={styles.detailTiles}>
                {(selected.fields ?? []).map((field) => (
                  <div key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.briefOutcome}>
                <strong>
                  {selectedRecord?.cells.performance ??
                    "Performance starts after launch"}
                </strong>
                <span>Validated creator-campaign performance</span>
              </div>
              <PreviewButton>Preview campaign setup</PreviewButton>
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PublishersWorkspace({ view }: { view: MerchantTabView }) {
  const creators = view.cards ?? [];
  const [selectedId, setSelectedId] = useState(creators[0]?.id ?? "");
  const selected =
    creators.find((creator) => creator.id === selectedId) ?? creators[0];
  const checks = [
    ["Identity and channels checked", true],
    ["Campaign terms accepted", selected?.status.tone === "positive"],
    ["Disclosure wording confirmed", selected?.status.tone === "positive"],
    ["Approved assets released", selected?.status.tone === "positive"],
  ] as const;

  return (
    <div className={styles.stack}>
      <section className={styles.publisherHeader}>
        <div>
          <span className={styles.eyebrow}>Creator access</span>
          <h2>Approve the creators who are ready to promote</h2>
          <p>
            Choose a creator, check access and disclosures, then preview your
            decision. Nothing changes outside this local demo.
          </p>
        </div>
        <div className={styles.creatorFan} aria-label="Creator review queue">
          {creators.map((creator) => (
            <span key={creator.id}>
              <Image
                src={
                  creatorImages[creator.id] ??
                  "/images/landing/avatar-elena.png"
                }
                alt={`${creator.title} creator profile`}
                fill
                sizes="110px"
              />
            </span>
          ))}
        </div>
      </section>

      <section className={styles.reviewLayout}>
        <div className={styles.creatorGrid}>
          {creators.map((creator) => (
            <button
              key={creator.id}
              type="button"
              className={
                creator.id === selected?.id ? styles.selectionActive : undefined
              }
              aria-pressed={creator.id === selected?.id}
              onClick={() => setSelectedId(creator.id)}
            >
              <span className={styles.creatorPortrait}>
                <Image
                  src={
                    creatorImages[creator.id] ??
                    "/images/landing/avatar-elena.png"
                  }
                  alt=""
                  fill
                  sizes="240px"
                />
              </span>
              <span className={styles.creatorCardTop}>
                <StatusPill status={creator.status} />
              </span>
              <strong>{creator.title}</strong>
              <p>{creator.detail}</p>
              <em>{creator.meta}</em>
            </button>
          ))}
        </div>
        {selected ? (
          <aside className={styles.reviewPanel}>
            <header>
              <span className={styles.eyebrow}>Access checklist</span>
              <h3>{selected.title}</h3>
              <p>{selected.detail}</p>
            </header>
            <ul className={styles.checklist}>
              {checks.map(([label, complete]) => (
                <li
                  key={label}
                  className={
                    complete ? styles.checkComplete : styles.checkWaiting
                  }
                >
                  <span>
                    {complete ? (
                      <Check size={15} weight="bold" aria-hidden />
                    ) : (
                      <Clock size={15} weight="bold" aria-hidden />
                    )}
                  </span>
                  <strong>{label}</strong>
                </li>
              ))}
            </ul>
            <dl className={styles.detailTiles}>
              {(selected.fields ?? []).map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>
            <PreviewButton>Preview access decision</PreviewButton>
          </aside>
        ) : null}
      </section>
    </div>
  );
}

function TermsWorkspace({ view }: { view: MerchantTabView }) {
  const fields = Object.fromEntries(
    (view.fields ?? []).map((field) => [field.label, field.value]),
  );
  return (
    <div className={styles.stack}>
      <section className={styles.moneyHero}>
        <div>
          <span className={styles.eyebrow}>Commission rule</span>
          <h2>Confirm the 8.4% rule before creators promote</h2>
          <p>
            This creator campaign uses merchant-funded terms approved for its
            products and dates.
          </p>
        </div>
        <div
          className={styles.moneyEquation}
          aria-label="One hundred dollar eligible sale at eight point four percent equals eight dollars and forty cents creator commission"
        >
          <article>
            <span>Eligible sale</span>
            <strong>$100</strong>
            <small>After tax, shipping and returns</small>
          </article>
          <span className={styles.formulaOperator} aria-hidden>
            × 8.4% =
          </span>
          <article className={styles.moneyOutcome}>
            <span>Creator earns</span>
            <strong>$8.40</strong>
            <small>Merchant-funded commission</small>
          </article>
        </div>
      </section>
      <section className={styles.termsLayout}>
        <article className={styles.currentTerms}>
          <header>
            <div>
              <span className={styles.eyebrow}>Current rule</span>
              <h3>{fields.Campaign ?? "CMP-DIR-204"}</h3>
            </div>
            <StatusPill status={{ label: "Effective", tone: "positive" }} />
          </header>
          <dl className={styles.termGrid}>
            {(view.fields ?? []).map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.protectionNote}>
            <ShieldCheck size={18} weight="duotone" aria-hidden />
            Returns reverse commission; taxes, shipping, gifts and canceled
            items do not create creator earnings.
          </p>
        </article>
        <article className={styles.changeHistory}>
          <header>
            <div>
              <span className={styles.eyebrow}>Change history</span>
              <h3>What changed and when</h3>
            </div>
            <span className={styles.changeCount}>2 upcoming</span>
          </header>
          <ol>
            {(view.timeline ?? []).map((item, index) => (
              <li key={item.id}>
                <span className={styles.historyMarker}>{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <small>{item.meta}</small>
                </div>
                <StatusPill status={item.status} />
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}

function EventsWorkspace({ view }: { view: MerchantTabView }) {
  const records = view.records ?? [];
  const [mode, setMode] = useState<"charged" | "protected">("charged");
  const visible = records.filter((record) =>
    mode === "charged"
      ? record.status.tone === "positive"
      : record.status.tone !== "positive",
  );
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const selected =
    visible.find((record) => record.id === selectedId) ?? visible[0];
  return (
    <div className={styles.stack}>
      <section className={styles.eventRule}>
        <div className={styles.ruleCopy}>
          <span className={styles.eyebrow}>Check a charge</span>
          <h2>See the whole charge in one simple formula</h2>
          <p>
            Only a completed, shopper-visible result can be charged. Failures,
            retries, cached results and duplicate refreshes are always $0.
          </p>
          <div
            className={styles.chargeFormula}
            aria-label="One delivered result times one participating merchant product times fifty cents equals fifty cents"
          >
            <span>
              <b>1</b>
              <small>delivered result</small>
            </span>
            <strong aria-hidden>×</strong>
            <span>
              <b>1</b>
              <small>merchant product</small>
            </span>
            <strong aria-hidden>×</strong>
            <span>
              <b>$0.50</b>
              <small>per product</small>
            </span>
            <strong aria-hidden>=</strong>
            <span className={styles.chargeOutcome}>
              <b>$0.50</b>
              <small>total charge</small>
            </span>
          </div>
        </div>
        <div className={styles.ruleArt}>
          <Image
            src="/media/merchant-dashboard/generated/campaigns-billing/final/billable-event-evidence.webp"
            alt="Delivered fashion result connected to one product and one verified charge"
            fill
            priority
            sizes="(max-width: 880px) 100vw, 480px"
          />
        </div>
      </section>
      <section className={styles.eventWorkspace}>
        <header className={styles.eventHeader}>
          <div>
            <span className={styles.eyebrow}>Choose a receipt</span>
            <h3>Select a result, then open Details for the proof</h3>
          </div>
          <div
            className={styles.modeToggle}
            role="group"
            aria-label="Billing event view"
          >
            <button
              type="button"
              className={mode === "charged" ? styles.toggleActive : undefined}
              aria-pressed={mode === "charged"}
              onClick={() => setMode("charged")}
            >
              Charged <strong>1,284</strong>
            </button>
            <button
              type="button"
              className={mode === "protected" ? styles.toggleActive : undefined}
              aria-pressed={mode === "protected"}
              onClick={() => setMode("protected")}
            >
              Not charged <strong>46</strong>
            </button>
          </div>
        </header>
        <div className={styles.receiptLayout}>
          <div className={styles.receiptList}>
            {visible.map((record) => (
              <button
                key={record.id}
                type="button"
                className={
                  record.id === selected?.id
                    ? styles.selectionActive
                    : undefined
                }
                aria-pressed={record.id === selected?.id}
                onClick={() => setSelectedId(record.id)}
              >
                <span className={styles.productThumb}>
                  <Image
                    src={
                      record.title.includes("Complete")
                        ? "/media/merchant-dashboard/generated/products/final/ai-complete-look.webp"
                        : "/media/merchant-dashboard/generated/products/final/product-silk-dress.webp"
                    }
                    alt=""
                    fill
                    sizes="76px"
                  />
                </span>
                <span>
                  <small>{record.subtitle}</small>
                  <strong>{record.title}</strong>
                  <em>{record.cells.products}</em>
                </span>
                <span className={styles.receiptAmount}>
                  <StatusPill status={record.status} />
                  <strong>{record.cells.charge}</strong>
                </span>
              </button>
            ))}
          </div>
          {selected ? (
            <aside className={styles.evidencePanel}>
              <header>
                <div>
                  <span className={styles.eyebrow}>Selected receipt</span>
                  <h3>{selected.title}</h3>
                  <p>{selected.subtitle}</p>
                </div>
                <strong className={styles.largeCharge}>
                  {selected.cells.charge}
                </strong>
              </header>
              <EvidenceDetails label="Details — why this amount">
                <dl className={styles.detailTiles}>
                  {(selected.fields ?? []).map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
                <ol className={styles.evidenceTrail}>
                  <li>
                    <CheckCircle size={18} weight="duotone" aria-hidden />
                    <span>
                      <strong>Request checked</strong>
                      <small>{selected.cells.evidence}</small>
                    </span>
                  </li>
                  <li>
                    <CheckCircle size={18} weight="duotone" aria-hidden />
                    <span>
                      <strong>Delivery checked</strong>
                      <small>
                        {selected.fields?.find(
                          (field) => field.label === "Delivered",
                        )?.value ?? "Shopper-visible result"}
                      </small>
                    </span>
                  </li>
                  <li>
                    <Receipt size={18} weight="duotone" aria-hidden />
                    <span>
                      <strong>Price rule checked</strong>
                      <small>
                        {selected.fields?.find(
                          (field) => field.label === "Rule",
                        )?.value ?? "Protected exclusion rule"}
                      </small>
                    </span>
                  </li>
                </ol>
              </EvidenceDetails>
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function StatementsWorkspace({ view }: { view: MerchantTabView }) {
  const [selectedLine, setSelectedLine] = useState("Qualified-event usage");
  const fields = view.fields ?? [];
  const evidenceCopy: Record<string, string> = {
    "Qualified-event usage":
      "1,284 completed product results × $0.50. Open Qualified events to inspect every charged or protected event.",
    "Monthly commitment":
      "The signed Order Form defines a $118 monthly service commitment.",
    "Commitment credit":
      "The $118 commitment is credited against qualified usage, so it is not charged twice.",
    "Creator campaign commission":
      "Validated creator-campaign sales created $118.40 of merchant-funded commission.",
    "Prior payment":
      "A prior $118.40 payment is applied before the final balance.",
  };
  return (
    <div className={styles.stack}>
      <section className={styles.statementHero}>
        <div className={styles.statementSummary}>
          <span className={styles.eyebrow}>Your August statement</span>
          <h2>Review the $642 statement before 22 August</h2>
          <p>
            Start with the amount due, then select any line below to see how it
            was calculated.
          </p>
          <div>
            <span>
              <CalendarBlank size={18} weight="duotone" aria-hidden />
              01–08 Aug 2026
            </span>
            <span>
              <ShieldCheck size={18} weight="duotone" aria-hidden />
              Questions can still be raised
            </span>
          </div>
          <PreviewButton icon={Receipt}>Preview statement review</PreviewButton>
        </div>
        <div className={styles.statementArt}>
          <Image
            src="/media/merchant-dashboard/generated/campaigns-billing/final/statement-evidence.webp"
            alt="Itemized statement connected to reconciliation evidence and finance reports"
            fill
            priority
            sizes="(max-width: 880px) 100vw, 560px"
          />
        </div>
      </section>
      <section className={styles.breakdownSection}>
        <header className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Why this amount is due</span>
            <h3>Follow the statement from usage to final balance</h3>
            <p>Select a line to see the evidence behind it.</p>
          </div>
          <StatusPill status={{ label: "In review", tone: "warning" }} />
        </header>
        <div
          className={styles.statementEquation}
          aria-label="Statement amount calculation"
        >
          {fields.slice(0, 5).map((field, index) => (
            <button
              key={field.label}
              type="button"
              className={
                selectedLine === field.label
                  ? styles.selectionActive
                  : undefined
              }
              aria-pressed={selectedLine === field.label}
              onClick={() => setSelectedLine(field.label)}
            >
              <small>
                {index === 0
                  ? "Start"
                  : field.value.startsWith("-")
                    ? "Subtract"
                    : "Add or apply"}
              </small>
              <strong>{field.value}</strong>
              <span>{field.label}</span>
            </button>
          ))}
          <ArrowRight size={22} weight="bold" aria-hidden />
          <article className={styles.balanceOutcome}>
            <small>Amount due</small>
            <strong>$642.00</strong>
            <span>Due 22 Aug</span>
          </article>
        </div>
        <EvidenceDetails label={`Details — ${selectedLine}`}>
          <div className={styles.lineEvidence}>
            <span>
              <FileText size={21} weight="duotone" aria-hidden />
            </span>
            <div>
              <strong>Why this line is here</strong>
              <p>
                {evidenceCopy[selectedLine] ??
                  "This line is tied to the signed Order Form and reconciliation ledger."}
              </p>
            </div>
            <Link
              href={
                selectedLine === "Creator campaign commission"
                  ? "/merchants/dashboard/campaigns"
                  : "/merchants/dashboard/billing?tab=events"
              }
            >
              Open evidence <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
          </div>
        </EvidenceDetails>
      </section>
    </div>
  );
}

function DisputesWorkspace({ view }: { view: MerchantTabView }) {
  const cases = view.cards ?? [];
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? "");
  const selected = cases.find((item) => item.id === selectedId) ?? cases[0];
  const lanes = [
    {
      title: "Evidence needed",
      detail: "Merchant action",
      cards: cases.filter((item) => item.status.tone === "warning").slice(1),
      tone: styles.laneRose,
    },
    {
      title: "Under review",
      detail: "Billing operations",
      cards: cases.filter((item) => item.status.tone === "warning").slice(0, 1),
      tone: styles.laneOrange,
    },
    {
      title: "Resolved",
      detail: "Decision recorded",
      cards: cases.filter((item) => item.status.tone === "positive"),
      tone: styles.laneMint,
    },
  ];
  return (
    <div className={styles.stack}>
      <section className={styles.disputeIntro}>
        <div>
          <span className={styles.eyebrow}>Resolve a billing question</span>
          <h2>Send the missing proof, then track the answer</h2>
          <p>
            Two questions totaling $46 are open. One needs your Order Form; the
            other is already being checked by billing.
          </p>
        </div>
        <div className={styles.disputeSteps}>
          <span>
            <FileText size={20} weight="duotone" aria-hidden />
            Send proof
          </span>
          <ArrowRight size={18} weight="bold" aria-hidden />
          <span>
            <Funnel size={20} weight="duotone" aria-hidden />
            We check
          </span>
          <ArrowRight size={18} weight="bold" aria-hidden />
          <span>
            <CheckCircle size={20} weight="duotone" aria-hidden />
            See answer
          </span>
        </div>
      </section>
      <section className={styles.caseBoard}>
        <div className={styles.caseLanes}>
          {lanes.map((lane) => (
            <article key={lane.title} className={lane.tone}>
              <header>
                <div>
                  <strong>{lane.title}</strong>
                  <small>{lane.detail}</small>
                </div>
                <span>{lane.cards.length}</span>
              </header>
              <div>
                {lane.cards.length ? (
                  lane.cards.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        selected?.id === item.id
                          ? styles.selectionActive
                          : undefined
                      }
                      aria-pressed={selected?.id === item.id}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span>
                        <StatusPill status={item.status} />
                        <small>{item.id}</small>
                      </span>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <em>{item.meta}</em>
                    </button>
                  ))
                ) : (
                  <p className={styles.emptyLane}>Nothing waiting here.</p>
                )}
              </div>
            </article>
          ))}
        </div>
        {selected ? (
          <aside className={styles.caseDetail}>
            <header>
              <div>
                <span className={styles.eyebrow}>Selected question</span>
                <h3>{selected.title}</h3>
                <p>{selected.detail}</p>
              </div>
              <StatusPill status={selected.status} />
            </header>
            <div className={styles.caseProgress}>
              <span className={styles.progressDone}>Proof</span>
              <span className={styles.progressCurrent}>Checking</span>
              <span>Answer</span>
            </div>
            <EvidenceDetails label="Details — proof and owner">
              <dl className={styles.detailTiles}>
                {(selected.fields ?? []).map((field) => (
                  <div key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.evidenceChecklist}>
                <strong>What we check</strong>
                <p>
                  <CheckCircle size={17} weight="duotone" aria-hidden />
                  Event IDs and delivered results
                </p>
                <p>
                  <CheckCircle size={17} weight="duotone" aria-hidden />
                  Your signed price rule
                </p>
                <p
                  className={
                    selected.fields?.find((field) => field.label === "Evidence")
                      ?.value === "Complete"
                      ? undefined
                      : styles.awaiting
                  }
                >
                  <Clock size={17} weight="duotone" aria-hidden />
                  Your supporting file
                </p>
              </div>
            </EvidenceDetails>
            <PreviewButton>Preview the expected answer</PreviewButton>
          </aside>
        ) : null}
      </section>
    </div>
  );
}

function ExportsWorkspace({ view }: { view: MerchantTabView }) {
  const records = view.records ?? [];
  const [mode, setMode] = useState<"ready" | "scheduled">("ready");
  const visible = records.filter((record) =>
    mode === "scheduled"
      ? record.status.label === "Scheduled"
      : record.status.label !== "Scheduled",
  );
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const selected =
    visible.find((record) => record.id === selectedId) ?? visible[0];
  const reportUse: Record<string, string> = {
    "EXP-10214": "Finance reconciliation",
    "EXP-10208": "Returns and commission review",
    "EXP-10191": "Campaign performance review",
  };
  return (
    <div className={styles.stack}>
      <section className={styles.exportHeader}>
        <div>
          <span className={styles.eyebrow}>Reports</span>
          <h2>Download the file that answers your question</h2>
          <p>
            Choose finance, returns, or creator-campaign reporting. Each card
            tells you the period, rows and file type before you preview it.
          </p>
        </div>
        <div className={styles.reportSummary}>
          <span>
            <FileCsv size={24} weight="duotone" aria-hidden />
          </span>
          <div>
            <strong>{records.length} reports</strong>
            <small>Available in this local preview</small>
          </div>
        </div>
      </section>
      <section className={styles.reportWorkspace}>
        <header>
          <div
            className={styles.modeToggle}
            role="group"
            aria-label="Report state"
          >
            <button
              type="button"
              className={mode === "ready" ? styles.toggleActive : undefined}
              aria-pressed={mode === "ready"}
              onClick={() => setMode("ready")}
            >
              Ready to preview
            </button>
            <button
              type="button"
              className={mode === "scheduled" ? styles.toggleActive : undefined}
              aria-pressed={mode === "scheduled"}
              onClick={() => setMode("scheduled")}
            >
              Coming later
            </button>
          </div>
          <small>Preview actions stay on this device.</small>
        </header>
        <div className={styles.reportLayout}>
          <div className={styles.reportGrid}>
            {visible.map((record) => (
              <button
                key={record.id}
                type="button"
                className={
                  record.id === selected?.id
                    ? styles.selectionActive
                    : undefined
                }
                aria-pressed={record.id === selected?.id}
                onClick={() => setSelectedId(record.id)}
              >
                <span className={styles.fileIcon}>
                  {record.cells.format === "XLSX" ? (
                    <FileText size={25} weight="duotone" aria-hidden />
                  ) : (
                    <FileCsv size={25} weight="duotone" aria-hidden />
                  )}
                </span>
                <span className={styles.reportCardTop}>
                  <StatusPill status={record.status} />
                  <small>{record.cells.format}</small>
                </span>
                <strong>{record.title}</strong>
                <p>{record.subtitle}</p>
                <dl>
                  <div>
                    <dt>Period</dt>
                    <dd>{record.cells.period}</dd>
                  </div>
                  <div>
                    <dt>Rows</dt>
                    <dd>{record.cells.rows}</dd>
                  </div>
                  <div>
                    <dt>Prepared</dt>
                    <dd>{record.cells.prepared}</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
          {selected ? (
            <aside className={styles.reportPreview}>
              <header>
                <span className={styles.eyebrow}>Selected file</span>
                <h3>{selected.title}</h3>
                <p>{selected.subtitle}</p>
              </header>
              <div className={styles.bestFor}>
                <span>
                  <ImageSquare size={20} weight="duotone" aria-hidden />
                </span>
                <div>
                  <small>Use this for</small>
                  <strong>
                    {reportUse[selected.id] ?? "Merchant operations"}
                  </strong>
                </div>
              </div>
              <EvidenceDetails label="Details — file contents">
                <dl className={styles.detailTiles}>
                  <div>
                    <dt>Period</dt>
                    <dd>{selected.cells.period}</dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>{selected.cells.format}</dd>
                  </div>
                  <div>
                    <dt>Rows</dt>
                    <dd>{selected.cells.rows}</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>{selected.tags?.[0] ?? "Current"}</dd>
                  </div>
                </dl>
                <div className={styles.columnPreview}>
                  <strong>What is inside</strong>
                  <span>Event or order ID</span>
                  <span>Merchant product</span>
                  <span>Status and reason</span>
                  <span>Amount or charge</span>
                </div>
              </EvidenceDetails>
              <PreviewButton icon={DownloadSimple}>
                Preview this file
              </PreviewButton>
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function CampaignsBillingVisualExperience({
  section,
  view,
}: {
  section: VisualSection;
  view: MerchantTabView;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollParent = rootRef.current?.closest("section");
    if (scrollParent instanceof HTMLElement) scrollParent.scrollTop = 0;
  }, [section, view.id]);

  let workspace;
  if (section === "campaigns") {
    if (view.id === "publishers")
      workspace = <PublishersWorkspace view={view} />;
    else if (view.id === "terms") workspace = <TermsWorkspace view={view} />;
    else workspace = <CampaignsWorkspace view={view} />;
  } else {
    if (view.id === "statements")
      workspace = <StatementsWorkspace view={view} />;
    else if (view.id === "disputes")
      workspace = <DisputesWorkspace view={view} />;
    else if (view.id === "exports")
      workspace = <ExportsWorkspace view={view} />;
    else workspace = <EventsWorkspace view={view} />;
  }

  return (
    <div ref={rootRef} className={styles.visualExperience}>
      <TaskSwitcher section={section} activeId={view.id} />
      {workspace}
    </div>
  );
}
