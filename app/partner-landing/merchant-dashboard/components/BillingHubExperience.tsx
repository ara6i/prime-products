"use client";

/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import {
  ArrowUpRight,
  Bank,
  CalendarBlank,
  Check,
  CheckCircle,
  Clock,
  Coins,
  CreditCard,
  DownloadSimple,
  FileText,
  HandCoins,
  Info,
  LockKey,
  PencilSimple,
  Receipt,
  ShieldCheck,
  UsersThree,
  Wallet,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useMemo, useRef, useState, type FormEvent } from "react";

import styles from "./billingHubExperience.module.css";

type PeriodId = "aug-2026" | "jul-2026" | "jun-2026";
type CommissionStatus =
  "Pending" | "Locked" | "Funded" | "Paid" | "Cancelled" | "On hold";
type HistoryTab = "commissions" | "documents" | "credits";
type StatusFilter = "All" | "Needs review" | CommissionStatus;

interface PaymentMethodSummary {
  id: string;
  brand: string;
  kind: string;
  displayNumber: string;
  lastFour: string;
  expiry: string;
  billingEmail: string;
}

interface CreditWalletSummary {
  available: number;
  included: number;
  purchased: number;
  allocated: number;
  nextExpiry: string;
}

interface WeeklySettlement {
  period: PeriodId;
  label: string;
  range: string;
  cutoff: string;
  dueDate: string;
  principal: number;
  providerCosts: number;
  fxCosts: number;
  adjustments: number;
  initialStatus: "Ready to fund" | "Funded" | "Paid";
}

interface CommissionLine {
  id: string;
  period: PeriodId;
  creator: string;
  handle: string;
  avatar: string;
  campaign: string;
  order: string;
  retainedSales: number;
  rate: number;
  commission: number;
  priceSource: "Order feed" | "Historical snapshot";
  lockDate: string;
  status: CommissionStatus;
  issue?: string;
}

interface BillingDocument {
  id: string;
  type: "Commission statement" | "Subscription invoice" | "Credit receipt";
  period: string;
  issued: string;
  amount: number;
  status: "Paid" | "Funded" | "Due";
}

interface CreditActivity {
  id: string;
  date: string;
  activity: string;
  category: "Included" | "Purchased" | "Allocated" | "QTO usage";
  quantity: number;
  balance: number;
  status: "Complete" | "Available";
}

const paymentMethods: PaymentMethodSummary[] = [
  {
    id: "visa-4242",
    brand: "Visa",
    kind: "Debit",
    displayNumber: "4242  ••••  ••••  4242",
    lastFour: "4242",
    expiry: "09/28",
    billingEmail: "billing@northstaratelier.com",
  },
  {
    id: "visa-1837",
    brand: "Visa",
    kind: "Credit",
    displayNumber: "4870  ••••  ••••  1837",
    lastFour: "1837",
    expiry: "02/29",
    billingEmail: "finance@northstaratelier.com",
  },
];

const creditWallet: CreditWalletSummary = {
  available: 1240,
  included: 800,
  purchased: 1120,
  allocated: 680,
  nextExpiry: "31 Oct 2026",
};

const settlements: Record<PeriodId, WeeklySettlement> = {
  "aug-2026": {
    period: "aug-2026",
    label: "August 2026",
    range: "01 Aug – 31 Aug 2026",
    cutoff: "31 Aug, 23:59 UTC",
    dueDate: "05 September 2026",
    principal: 9700.2,
    providerCosts: 126.2,
    fxCosts: 27,
    adjustments: 0,
    initialStatus: "Ready to fund",
  },
  "jul-2026": {
    period: "jul-2026",
    label: "July 2026",
    range: "01 Jul – 31 Jul 2026",
    cutoff: "31 Jul, 23:59 UTC",
    dueDate: "05 August 2026",
    principal: 9240.15,
    providerCosts: 118.4,
    fxCosts: 22.1,
    adjustments: -45,
    initialStatus: "Paid",
  },
  "jun-2026": {
    period: "jun-2026",
    label: "June 2026",
    range: "01 Jun – 30 Jun 2026",
    cutoff: "30 Jun, 23:59 UTC",
    dueDate: "05 July 2026",
    principal: 8716.8,
    providerCosts: 106.25,
    fxCosts: 18.7,
    adjustments: 0,
    initialStatus: "Paid",
  },
};

const initialCommissionLines: CommissionLine[] = [
  {
    id: "COM-0826-1042",
    period: "aug-2026",
    creator: "Maya Laurent",
    handle: "@mayalaurent",
    avatar: "/media/partner-landing/creator-match-maya.png",
    campaign: "Autumn Tailoring",
    order: "ORD-83421",
    retainedSales: 35670,
    rate: 12,
    commission: 4280.4,
    priceSource: "Order feed",
    lockDate: "31 Aug 2026",
    status: "Locked",
  },
  {
    id: "COM-0826-1038",
    period: "aug-2026",
    creator: "Rae Monroe",
    handle: "@raemonroe",
    avatar: "/media/partner-landing/creator-match-rae.png",
    campaign: "City Layers",
    order: "ORD-83398",
    retainedSales: 31400,
    rate: 10,
    commission: 3140,
    priceSource: "Order feed",
    lockDate: "30 Aug 2026",
    status: "Locked",
  },
  {
    id: "COM-0826-1031",
    period: "aug-2026",
    creator: "Zoe Chen",
    handle: "@zoechenstyle",
    avatar: "/media/partner-landing/creator-match-zoe.png",
    campaign: "Soft Structure",
    order: "ORD-83351",
    retainedSales: 32708.24,
    rate: 8.5,
    commission: 2780.2,
    priceSource: "Order feed",
    lockDate: "08 Sep 2026",
    status: "Pending",
    issue: "Return period is still open",
  },
  {
    id: "COM-0826-1024",
    period: "aug-2026",
    creator: "Luca Moretti",
    handle: "@lucamoretti",
    avatar: "/media/partner-landing/creator-collective-03.png",
    campaign: "Modern Essentials",
    order: "ORD-83294",
    retainedSales: 25331.11,
    rate: 9,
    commission: 2279.8,
    priceSource: "Historical snapshot",
    lockDate: "29 Aug 2026",
    status: "Locked",
    issue: "Order feed missing; historical product price used",
  },
  {
    id: "COM-0826-1019",
    period: "aug-2026",
    creator: "Amara Okafor",
    handle: "@amaraedit",
    avatar: "/media/partner-landing/creator-collective-04.png",
    campaign: "Evening Edit",
    order: "ORD-83218",
    retainedSales: 21474.55,
    rate: 11,
    commission: 2362.2,
    priceSource: "Order feed",
    lockDate: "28 Aug 2026",
    status: "On hold",
    issue: "Creator identity verification is incomplete",
  },
  {
    id: "COM-0726-0988",
    period: "jul-2026",
    creator: "Maya Laurent",
    handle: "@mayalaurent",
    avatar: "/media/partner-landing/creator-match-maya.png",
    campaign: "Summer Edit",
    order: "ORD-82119",
    retainedSales: 25000,
    rate: 12,
    commission: 3000,
    priceSource: "Order feed",
    lockDate: "31 Jul 2026",
    status: "Paid",
  },
  {
    id: "COM-0726-0976",
    period: "jul-2026",
    creator: "Rae Monroe",
    handle: "@raemonroe",
    avatar: "/media/partner-landing/creator-match-rae.png",
    campaign: "City Linen",
    order: "ORD-82047",
    retainedSales: 31400,
    rate: 10,
    commission: 3140,
    priceSource: "Order feed",
    lockDate: "30 Jul 2026",
    status: "Paid",
  },
  {
    id: "COM-0726-0959",
    period: "jul-2026",
    creator: "Zoe Chen",
    handle: "@zoechenstyle",
    avatar: "/media/partner-landing/creator-match-zoe.png",
    campaign: "Soft Summer",
    order: "ORD-81863",
    retainedSales: 32942.94,
    rate: 8.5,
    commission: 2800.15,
    priceSource: "Historical snapshot",
    lockDate: "28 Jul 2026",
    status: "Paid",
  },
  {
    id: "COM-0726-0944",
    period: "jul-2026",
    creator: "Luca Moretti",
    handle: "@lucamoretti",
    avatar: "/media/partner-landing/creator-collective-03.png",
    campaign: "Travel Capsule",
    order: "ORD-81722",
    retainedSales: 33333.33,
    rate: 9,
    commission: 300,
    priceSource: "Order feed",
    lockDate: "26 Jul 2026",
    status: "Paid",
  },
];

const billingDocuments: BillingDocument[] = [
  {
    id: "STMT-2026-008",
    type: "Commission statement",
    period: "August 2026",
    issued: "01 Sep 2026",
    amount: 9853.4,
    status: "Due",
  },
  {
    id: "STMT-2026-007",
    type: "Commission statement",
    period: "July 2026",
    issued: "01 Aug 2026",
    amount: 9335.65,
    status: "Paid",
  },
  {
    id: "INV-2026-008",
    type: "Subscription invoice",
    period: "August 2026",
    issued: "01 Aug 2026",
    amount: 499,
    status: "Paid",
  },
  {
    id: "CR-2026-004",
    type: "Credit receipt",
    period: "July 2026",
    issued: "18 Jul 2026",
    amount: 250,
    status: "Funded",
  },
];

const creditActivity: CreditActivity[] = [
  {
    id: "CR-AUG-118",
    date: "29 Aug 2026",
    activity: "Qualified try-on usage",
    category: "QTO usage",
    quantity: -84,
    balance: 1240,
    status: "Complete",
  },
  {
    id: "CR-AUG-102",
    date: "21 Aug 2026",
    activity: "Allocated to Maya Laurent",
    category: "Allocated",
    quantity: -150,
    balance: 1324,
    status: "Complete",
  },
  {
    id: "CR-AUG-077",
    date: "01 Aug 2026",
    activity: "Monthly plan credits",
    category: "Included",
    quantity: 800,
    balance: 1474,
    status: "Available",
  },
  {
    id: "CR-JUL-064",
    date: "18 Jul 2026",
    activity: "Purchased creator credits",
    category: "Purchased",
    quantity: 500,
    balance: 674,
    status: "Available",
  },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const integer = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function getSettlementTotal(settlement: WeeklySettlement) {
  return (
    settlement.principal +
    settlement.providerCosts +
    settlement.fxCosts +
    settlement.adjustments
  );
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function StatusBadge({
  status,
}: {
  status: CommissionStatus | BillingDocument["status"];
}) {
  const normalized = status.toLowerCase().replace(" ", "");
  return (
    <span className={styles.statusBadge} data-status={normalized}>
      <CheckCircle size={13} weight="fill" aria-hidden />
      {status}
    </span>
  );
}

export function BillingHubExperience() {
  const [periodId, setPeriodId] = useState<PeriodId>("aug-2026");
  const [activeTab, setActiveTab] = useState<HistoryTab>("commissions");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [commissionLines, setCommissionLines] = useState(
    initialCommissionLines,
  );
  const [selectedMethodId, setSelectedMethodId] = useState(
    paymentMethods[0].id,
  );
  const [draftMethodId, setDraftMethodId] = useState(paymentMethods[0].id);
  const [editingPayment, setEditingPayment] = useState(false);
  const [fundedPeriods, setFundedPeriods] = useState<PeriodId[]>([]);
  const [notice, setNotice] = useState("");
  const historyRef = useRef<HTMLElement>(null);

  const settlement = settlements[periodId];
  const settlementTotal = getSettlementTotal(settlement);
  const selectedMethod =
    paymentMethods.find((method) => method.id === selectedMethodId) ??
    paymentMethods[0];
  const settlementStatus = fundedPeriods.includes(periodId)
    ? "Funded"
    : settlement.initialStatus;

  const periodCommissionLines = useMemo(
    () => commissionLines.filter((line) => line.period === periodId),
    [commissionLines, periodId],
  );

  const visibleCommissionLines = useMemo(
    () =>
      periodCommissionLines.filter((line) => {
        if (statusFilter === "All") return true;
        if (statusFilter === "Needs review") return Boolean(line.issue);
        return line.status === statusFilter;
      }),
    [periodCommissionLines, statusFilter],
  );

  const statusTotals = useMemo(() => {
    const totals: Record<CommissionStatus, number> = {
      Pending: 0,
      Locked: 0,
      Funded: 0,
      Paid: 0,
      Cancelled: 0,
      "On hold": 0,
    };
    periodCommissionLines.forEach((line) => {
      totals[line.status] += line.commission;
    });
    return totals;
  }, [periodCommissionLines]);

  const reviewLines = periodCommissionLines.filter((line) => line.issue);
  const recipientLines = periodCommissionLines.filter((line) =>
    ["Locked", "Funded", "Paid"].includes(line.status),
  );

  const showHistory = (tab: HistoryTab, filter: StatusFilter = "All") => {
    setActiveTab(tab);
    setStatusFilter(filter);
    window.requestAnimationFrame(() => {
      historyRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const openPaymentDialog = () => {
    setDraftMethodId(selectedMethodId);
    setEditingPayment(true);
  };

  const savePaymentMethod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelectedMethodId(draftMethodId);
    setEditingPayment(false);
    setNotice("Default payment method updated for this demo.");
  };

  const fundSettlement = () => {
    if (settlementStatus !== "Ready to fund") return;
    setFundedPeriods((current) => [...current, periodId]);
    setCommissionLines((current) =>
      current.map((line) =>
        line.period === periodId && line.status === "Locked"
          ? { ...line, status: "Funded" as const }
          : line,
      ),
    );
    setNotice(
      "Weekly statement marked as funded in this demo. No money was moved.",
    );
  };

  const downloadDocument = (document: BillingDocument) => {
    downloadTextFile(
      document.id + ".txt",
      [
        "PrimeStyleAI billing document",
        "Document: " + document.id,
        "Type: " + document.type,
        "Period: " + document.period,
        "Issued: " + document.issued,
        "Amount: " + money.format(document.amount),
        "Status: " + document.status,
        "Demo document only.",
      ].join("\n"),
    );
    setNotice(document.id + " downloaded.");
  };

  const downloadStatement = () => {
    downloadTextFile(
      "PrimeStyleAI-" + settlement.period + "-statement.txt",
      [
        "PrimeStyleAI weekly creator settlement",
        "Period: " + settlement.label,
        "Cutoff: " + settlement.cutoff,
        "Locked commission principal: " + money.format(settlement.principal),
        "Provider and payout costs: " + money.format(settlement.providerCosts),
        "FX costs: " + money.format(settlement.fxCosts),
        "Adjustments: " + money.format(settlement.adjustments),
        "Total merchant debit: " + money.format(settlementTotal),
        "Status: " + settlementStatus,
        "Demo statement only.",
      ].join("\n"),
    );
    setNotice(settlement.label + " statement downloaded.");
  };

  return (
    <div className={styles.billingHub}>
      <div className={styles.workspaceToolbar}>
        <div>
          <span className={styles.eyebrow}>Creator settlement workspace</span>
          <p>Fund one weekly statement, then track every creator payment.</p>
        </div>
        <div className={styles.toolbarActions}>
          <label className={styles.periodPicker}>
            <CalendarBlank size={17} weight="duotone" aria-hidden />
            <span className={styles.srOnly}>Settlement period</span>
            <select
              value={periodId}
              onChange={(event) => {
                setPeriodId(event.target.value as PeriodId);
                setStatusFilter("All");
              }}
            >
              {Object.values(settlements).map((item) => (
                <option key={item.period} value={item.period}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.lightButton}
            onClick={openPaymentDialog}
          >
            <CreditCard size={17} weight="duotone" aria-hidden />
            Manage payment method
          </button>
        </div>
      </div>

      <section
        className={styles.bentoGrid}
        aria-label="Billing and settlement summary"
      >
        <div className={styles.leftStack}>
          <article className={styles.paymentCardPanel}>
            <header className={styles.cardHeader}>
              <div>
                <span className={styles.cardTitle}>Payment method</span>
                <small>Weekly settlement funding</small>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                onClick={openPaymentDialog}
                aria-label="Edit payment method"
              >
                <PencilSimple size={16} weight="bold" aria-hidden />
              </button>
            </header>
            <div className={styles.maskedCard}>
              <div className={styles.maskedCardTop}>
                <strong>PRIMESTYLE PAY</strong>
                <img
                  className={styles.cardBrandLogo}
                  src="https://www.visa.com/api/image-proxy?path=%2Fcontent%2Fdam%2Fvisa%2Fheader%2FVector.png"
                  alt="Visa"
                />
              </div>
              <span>{selectedMethod.brand + " " + selectedMethod.kind}</span>
              <p>{selectedMethod.displayNumber}</p>
              <div className={styles.maskedCardBottom}>
                <small>Default method</small>
                <small>{"EXP " + selectedMethod.expiry}</small>
              </div>
            </div>
            <p className={styles.maskedEmail}>{selectedMethod.billingEmail}</p>
          </article>

          <article className={styles.walletCard}>
            <div className={styles.walletHeading}>
              <span className={styles.softIcon}>
                <Wallet size={18} weight="duotone" aria-hidden />
              </span>
              <div>
                <span className={styles.cardTitle}>Credit wallet</span>
                <small>Non-cash service credits</small>
              </div>
            </div>
            <strong>{integer.format(creditWallet.available)}</strong>
            <span>available credits</span>
            <dl className={styles.walletBreakdown}>
              <div>
                <dt>Included</dt>
                <dd>{integer.format(creditWallet.included)}</dd>
              </div>
              <div>
                <dt>Purchased</dt>
                <dd>{integer.format(creditWallet.purchased)}</dd>
              </div>
              <div>
                <dt>Allocated</dt>
                <dd>{integer.format(creditWallet.allocated)}</dd>
              </div>
            </dl>
            <button
              type="button"
              className={styles.inlineButton}
              onClick={() => showHistory("credits")}
            >
              View activity
              <ArrowUpRight size={14} weight="bold" aria-hidden />
            </button>
          </article>
        </div>

        <article className={styles.settlementCard}>
          <header className={styles.settlementHeader}>
            <div className={styles.walletHeading}>
              <span className={styles.softIcon}>
                <HandCoins size={19} weight="duotone" aria-hidden />
              </span>
              <div>
                <span className={styles.cardTitle}>Weekly settlement</span>
                <small>{settlement.range}</small>
              </div>
            </div>
            <span
              className={styles.settlementState}
              data-state={settlementStatus.toLowerCase().replaceAll(" ", "-")}
            >
              {settlementStatus}
            </span>
          </header>

          <div className={styles.settlementAmount}>
            <span>Total merchant debit</span>
            <strong>{money.format(settlementTotal)}</strong>
            <p>
              One funding request covers all locked creator commissions and
              actual settlement costs.
            </p>
          </div>

          <dl className={styles.settlementBreakdown}>
            <div>
              <dt>
                Locked creator commissions
                <small>
                  {recipientLines.filter((line) => line.status === "Locked")
                    .length || recipientLines.length}{" "}
                  eligible creators
                </small>
              </dt>
              <dd>{money.format(settlement.principal)}</dd>
            </div>
            <div>
              <dt>
                Provider and payout costs
                <small>Actual statement cost</small>
              </dt>
              <dd>{money.format(settlement.providerCosts)}</dd>
            </div>
            <div>
              <dt>
                FX costs
                <small>Provider-confirmed rate</small>
              </dt>
              <dd>{money.format(settlement.fxCosts)}</dd>
            </div>
            <div>
              <dt>
                Approved adjustments
                <small>No manual changes this period</small>
              </dt>
              <dd>{money.format(settlement.adjustments)}</dd>
            </div>
          </dl>

          <div className={styles.settlementDates}>
            <span>
              <Clock size={16} weight="duotone" aria-hidden />
              <small>UTC cutoff</small>
              <strong>{settlement.cutoff}</strong>
            </span>
            <span>
              <CalendarBlank size={16} weight="duotone" aria-hidden />
              <small>Funding due</small>
              <strong>{settlement.dueDate}</strong>
            </span>
          </div>

          <footer className={styles.settlementFooter}>
            <span>
              <ShieldCheck size={17} weight="duotone" aria-hidden />
              No payout starts before funding clears.
            </span>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={settlementStatus !== "Ready to fund"}
              onClick={fundSettlement}
            >
              {settlementStatus === "Ready to fund"
                ? "Fund " + money.format(settlementTotal)
                : settlementStatus}
              {settlementStatus === "Ready to fund" ? (
                <ArrowUpRight size={16} weight="bold" aria-hidden />
              ) : (
                <Check size={16} weight="bold" aria-hidden />
              )}
            </button>
          </footer>
        </article>

        <div className={styles.rightStack}>
          <article className={styles.fundingCard}>
            <header className={styles.cardHeader}>
              <div>
                <span className={styles.cardTitle}>Funding due</span>
                <small>{settlement.dueDate}</small>
              </div>
              <span className={styles.darkIcon}>
                <Bank size={18} weight="duotone" aria-hidden />
              </span>
            </header>
            <strong>{money.format(settlementTotal)}</strong>
            <p>
              {settlementStatus === "Ready to fund"
                ? "Awaiting merchant funding"
                : "Statement " + settlementStatus.toLowerCase()}
            </p>
            <button type="button" onClick={downloadStatement}>
              <DownloadSimple size={15} weight="bold" aria-hidden />
              Download statement
            </button>
          </article>

          <article className={styles.statusCard}>
            <header className={styles.cardHeader}>
              <div>
                <span className={styles.cardTitle}>Commission status</span>
                <small>Current selected period</small>
              </div>
              <Coins size={19} weight="duotone" aria-hidden />
            </header>
            <div className={styles.statusRows}>
              <button
                type="button"
                onClick={() => showHistory("commissions", "Pending")}
              >
                <Clock size={15} weight="fill" aria-hidden />
                <span>Pending</span>
                <strong>{money.format(statusTotals.Pending)}</strong>
              </button>
              <button
                type="button"
                onClick={() => showHistory("commissions", "Locked")}
              >
                <LockKey size={15} weight="fill" aria-hidden />
                <span>Locked</span>
                <strong>{money.format(statusTotals.Locked)}</strong>
              </button>
              <button
                type="button"
                onClick={() => showHistory("commissions", "Funded")}
              >
                <CheckCircle size={15} weight="fill" aria-hidden />
                <span>Funded</span>
                <strong>{money.format(statusTotals.Funded)}</strong>
              </button>
              <button
                type="button"
                onClick={() => showHistory("commissions", "On hold")}
              >
                <WarningCircle size={15} weight="fill" aria-hidden />
                <span>On hold</span>
                <strong>{money.format(statusTotals["On hold"])}</strong>
              </button>
            </div>
          </article>

          <article className={styles.reviewCard}>
            <div>
              <WarningCircle size={20} weight="duotone" aria-hidden />
              <span>
                <strong>{reviewLines.length + " items need review"}</strong>
                <small>Data fallback or payout readiness</small>
              </span>
            </div>
            <button
              type="button"
              onClick={() => showHistory("commissions", "Needs review")}
            >
              Review
            </button>
          </article>

          <article className={styles.recipientsCard}>
            <div>
              <span className={styles.cardTitle}>Creator recipients</span>
              <small>
                {recipientLines.length + " included in this statement"}
              </small>
            </div>
            <div
              className={styles.avatarStack}
              aria-label={recipientLines.length + " creator recipients"}
            >
              {recipientLines.slice(0, 4).map((line) => (
                <Image
                  key={line.id}
                  src={line.avatar}
                  width={38}
                  height={38}
                  alt={line.creator}
                />
              ))}
              {recipientLines.length > 4 ? (
                <span>{"+" + (recipientLines.length - 4)}</span>
              ) : null}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.historyCard} ref={historyRef}>
        <header className={styles.historyHeader}>
          <div>
            <span className={styles.eyebrow}>Billing history</span>
            <h2>Creator commissions, statements and credit activity</h2>
            <p>Every amount stays separate and traceable to its source.</p>
          </div>
          <div className={styles.historyActions}>
            {activeTab === "commissions" ? (
              <label className={styles.statusFilter}>
                <span className={styles.srOnly}>Filter commission status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  <option>All</option>
                  <option>Needs review</option>
                  <option>Pending</option>
                  <option>Locked</option>
                  <option>Funded</option>
                  <option>Paid</option>
                  <option>Cancelled</option>
                  <option>On hold</option>
                </select>
              </label>
            ) : null}
            <button
              type="button"
              className={styles.downloadAllButton}
              onClick={downloadStatement}
            >
              <DownloadSimple size={16} weight="bold" aria-hidden />
              Download current
            </button>
          </div>
        </header>

        <div
          className={styles.historyTabs}
          role="tablist"
          aria-label="Billing history views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "commissions"}
            onClick={() => {
              setActiveTab("commissions");
              setStatusFilter("All");
            }}
          >
            Creator commissions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "documents"}
            onClick={() => setActiveTab("documents")}
          >
            Statements &amp; invoices
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "credits"}
            onClick={() => setActiveTab("credits")}
          >
            Usage &amp; credits
          </button>
        </div>

        {activeTab === "commissions" ? (
          <div className={styles.tableScroll} role="tabpanel">
            <table className={styles.commissionTable}>
              <thead>
                <tr>
                  <th>Influencer</th>
                  <th>Campaign &amp; order</th>
                  <th>Retained sales</th>
                  <th>Rate</th>
                  <th>Exact commission</th>
                  <th>Price source</th>
                  <th>Lock date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleCommissionLines.map((line) => (
                  <tr key={line.id}>
                    <td data-label="Influencer">
                      <div className={styles.creatorCell}>
                        <Image
                          src={line.avatar}
                          width={38}
                          height={38}
                          alt=""
                        />
                        <span>
                          <strong>{line.creator}</strong>
                          <small>{line.handle}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Campaign & order">
                      <span className={styles.stackedCell}>
                        <strong>{line.campaign}</strong>
                        <small>{line.order}</small>
                      </span>
                    </td>
                    <td data-label="Retained sales">
                      {money.format(line.retainedSales)}
                    </td>
                    <td data-label="Accepted rate">
                      <strong>{line.rate + "%"}</strong>
                    </td>
                    <td data-label="Exact commission">
                      <strong className={styles.commissionAmount}>
                        {money.format(line.commission)}
                      </strong>
                    </td>
                    <td data-label="Price source">
                      <span className={styles.stackedCell}>
                        <strong>{line.priceSource}</strong>
                        {line.issue ? (
                          <small className={styles.issueText}>
                            {line.issue}
                          </small>
                        ) : (
                          <small>Verified source</small>
                        )}
                      </span>
                    </td>
                    <td data-label="Lock date">{line.lockDate}</td>
                    <td data-label="Status">
                      <StatusBadge status={line.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visibleCommissionLines.length ? (
              <div className={styles.emptyState}>
                <UsersThree size={24} weight="duotone" aria-hidden />
                No creator commissions match this period and filter.
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "documents" ? (
          <div className={styles.tableScroll} role="tabpanel">
            <table className={styles.documentTable}>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Period</th>
                  <th>Issued</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>
                    <span className={styles.srOnly}>Download</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {billingDocuments.map((document) => (
                  <tr key={document.id}>
                    <td data-label="Document">
                      <span className={styles.documentCell}>
                        <span>
                          <FileText size={19} weight="duotone" aria-hidden />
                        </span>
                        <span>
                          <strong>{document.id}</strong>
                          <small>{document.type}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Period">{document.period}</td>
                    <td data-label="Issued">{document.issued}</td>
                    <td data-label="Amount">
                      <strong>{money.format(document.amount)}</strong>
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={document.status} />
                    </td>
                    <td data-label="Download">
                      <button
                        type="button"
                        className={styles.rowAction}
                        onClick={() => downloadDocument(document)}
                        aria-label={"Download " + document.id}
                      >
                        <DownloadSimple size={16} weight="bold" aria-hidden />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "credits" ? (
          <div className={styles.tableScroll} role="tabpanel">
            <table className={styles.creditTable}>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Change</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {creditActivity.map((activity) => (
                  <tr key={activity.id}>
                    <td data-label="Activity">
                      <span className={styles.stackedCell}>
                        <strong>{activity.activity}</strong>
                        <small>{activity.id}</small>
                      </span>
                    </td>
                    <td data-label="Date">{activity.date}</td>
                    <td data-label="Category">{activity.category}</td>
                    <td data-label="Change">
                      <strong
                        className={
                          activity.quantity > 0
                            ? styles.creditPositive
                            : styles.creditNegative
                        }
                      >
                        {activity.quantity > 0 ? "+" : ""}
                        {integer.format(activity.quantity)}
                      </strong>
                    </td>
                    <td data-label="Balance">
                      {integer.format(activity.balance)}
                    </td>
                    <td data-label="Status">
                      <span className={styles.creditStatus}>
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {editingPayment ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setEditingPayment(false)}
        >
          <section
            className={styles.paymentModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-method-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div className={styles.walletHeading}>
                <span className={styles.softIcon}>
                  <CreditCard size={19} weight="duotone" aria-hidden />
                </span>
                <div>
                  <h2 id="payment-method-title">Payment method</h2>
                  <p>Select the masked method used for weekly settlements.</p>
                </div>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setEditingPayment(false)}
                aria-label="Close payment method"
              >
                <X size={18} weight="bold" aria-hidden />
              </button>
            </header>
            <form onSubmit={savePaymentMethod}>
              <div className={styles.methodOptions}>
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={styles.methodOption}
                    data-selected={draftMethodId === method.id}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={draftMethodId === method.id}
                      onChange={() => setDraftMethodId(method.id)}
                    />
                    <span className={styles.darkIcon}>
                      <CreditCard size={20} weight="duotone" aria-hidden />
                    </span>
                    <span>
                      <strong>
                        {method.brand +
                          " " +
                          method.kind +
                          " •••• " +
                          method.lastFour}
                      </strong>
                      <small>
                        {"Expires " +
                          method.expiry +
                          " · " +
                          method.billingEmail}
                      </small>
                    </span>
                    {draftMethodId === method.id ? (
                      <CheckCircle size={20} weight="fill" aria-hidden />
                    ) : null}
                  </label>
                ))}
              </div>
              <button
                type="button"
                className={styles.providerButton}
                onClick={() =>
                  setNotice(
                    "Payment-provider setup is not connected in this demo.",
                  )
                }
              >
                <CreditCard size={17} weight="duotone" aria-hidden />
                Add method through payment provider
                <ArrowUpRight size={15} weight="bold" aria-hidden />
              </button>
              <div className={styles.securityNote}>
                <ShieldCheck size={18} weight="duotone" aria-hidden />
                PrimeStyleAI does not collect or store raw card numbers or
                security codes here.
              </div>
              <footer>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setEditingPayment(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  <Check size={16} weight="bold" aria-hidden />
                  Save default
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {notice ? (
        <button
          type="button"
          className={styles.toast}
          onClick={() => setNotice("")}
          role="status"
        >
          <CheckCircle size={18} weight="fill" aria-hidden />
          {notice}
        </button>
      ) : null}

      <p className={styles.demoNote}>
        <Info size={15} weight="duotone" aria-hidden />
        Demo data only. Funding, downloads and payment-method changes do not
        move money or persist.
        <Receipt size={15} weight="duotone" aria-hidden />
      </p>
    </div>
  );
}
