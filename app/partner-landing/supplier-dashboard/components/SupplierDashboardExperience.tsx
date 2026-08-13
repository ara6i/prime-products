"use client";

import {
  ArrowUpRight,
  Bell,
  Buildings,
  CalendarBlank,
  CaretDown,
  ChartLineUp,
  ChatsCircle,
  CheckCircle,
  EnvelopeSimple,
  GearSix,
  Handshake,
  Headset,
  House,
  MagnifyingGlass,
  Megaphone,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBagOpen,
  SlidersHorizontal,
  Storefront,
  UsersThree,
  Wallet,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { SupplierPortalPageView } from "./SupplierPortalPageView";
import styles from "./supplierDashboard.module.css";

export type SupplierPageId =
  | "dashboard"
  | "merchant-matches"
  | "influencer-matches"
  | "company"
  | "products"
  | "selling-options"
  | "messages"
  | "orders"
  | "relationships"
  | "campaigns"
  | "payments"
  | "performance"
  | "policies"
  | "team";

export type SupplierDialog =
  "manager" | "partner" | "product" | "campaign" | "payout" | null;

type IconButtonProps = {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  expanded?: boolean;
};

type PageMeta = {
  title: string;
  eyebrow: string;
  description: string;
  actionLabel: string;
  action: Exclude<SupplierDialog, null> | "notice";
};

const pageMeta: Record<SupplierPageId, PageMeta> = {
  dashboard: {
    title: "Supplier Dashboard",
    eyebrow: "Supplier network",
    description: "Your merchant, influencer and sales workspace.",
    actionLabel: "Find partners",
    action: "partner",
  },
  "merchant-matches": {
    title: "Merchant Matches",
    eyebrow: "Partner discovery",
    description: "Qualified retail buyers matched to your capabilities.",
    actionLabel: "Update matching",
    action: "partner",
  },
  "influencer-matches": {
    title: "Influencer Matches",
    eyebrow: "DTC partner discovery",
    description: "Creators whose audiences fit your eligible DTC products.",
    actionLabel: "Find influencers",
    action: "partner",
  },
  company: {
    title: "Company Page",
    eyebrow: "Profile & catalog",
    description: "Control the marketplace identity merchants and shoppers see.",
    actionLabel: "Preview page",
    action: "notice",
  },
  products: {
    title: "Products",
    eyebrow: "Profile & catalog",
    description:
      "Maintain shared product facts, variants and channel readiness.",
    actionLabel: "Add product",
    action: "product",
  },
  "selling-options": {
    title: "Selling Options",
    eyebrow: "Profile & catalog",
    description: "Set independent Bulk, Dropship and DTC offers by product.",
    actionLabel: "Save changes",
    action: "notice",
  },
  messages: {
    title: "Messages & RFQs",
    eyebrow: "Sales",
    description: "Keep conversations, samples and quote revisions together.",
    actionLabel: "New message",
    action: "notice",
  },
  orders: {
    title: "Orders",
    eyebrow: "Sales",
    description: "Manage Bulk, Dropship and DTC orders in one center.",
    actionLabel: "Update shipment",
    action: "notice",
  },
  relationships: {
    title: "Merchant Relationships",
    eyebrow: "Sales",
    description: "Track introduced merchants, terms and protected activity.",
    actionLabel: "Find merchants",
    action: "partner",
  },
  campaigns: {
    title: "Influencer Campaigns",
    eyebrow: "Direct-to-consumer",
    description:
      "Accept creator rates and choose the DTC products they may promote.",
    actionLabel: "Create campaign",
    action: "campaign",
  },
  payments: {
    title: "Payments & Payouts",
    eyebrow: "Money",
    description: "Reconcile plans, charges, commissions, refunds and payouts.",
    actionLabel: "Request payout",
    action: "payout",
  },
  performance: {
    title: "Performance",
    eyebrow: "Insights",
    description: "Compare channel demand, fulfillment and net revenue.",
    actionLabel: "Export report",
    action: "notice",
  },
  policies: {
    title: "Policies & Terms",
    eyebrow: "Account",
    description: "Manage channel policies and accepted marketplace versions.",
    actionLabel: "Review updates",
    action: "notice",
  },
  team: {
    title: "Team & Settings",
    eyebrow: "Account",
    description: "Manage roles, notifications and selling-mode access.",
    actionLabel: "Add manager",
    action: "manager",
  },
};

const topNavigation = [
  { page: "dashboard" as const, label: "Dashboard", icon: House },
  {
    page: "merchant-matches" as const,
    label: "Merchant matches",
    icon: Storefront,
  },
  {
    page: "influencer-matches" as const,
    label: "Influencer matches",
    icon: UsersThree,
  },
];

const railNavigation = [
  { page: "dashboard" as const, label: "Overview", icon: House },
  { page: "company" as const, label: "Company page", icon: Buildings },
  { page: "products" as const, label: "Products", icon: Package },
  {
    page: "selling-options" as const,
    label: "Selling options",
    icon: SlidersHorizontal,
  },
  { page: "messages" as const, label: "Messages & RFQs", icon: ChatsCircle },
  { page: "orders" as const, label: "Orders", icon: ShoppingBagOpen },
  {
    page: "relationships" as const,
    label: "Merchant relationships",
    icon: Handshake,
  },
  {
    page: "campaigns" as const,
    label: "Influencer campaigns",
    icon: Megaphone,
  },
  { page: "payments" as const, label: "Payments & payouts", icon: Wallet },
  {
    page: "performance" as const,
    label: "Performance",
    icon: ChartLineUp,
  },
  { page: "policies" as const, label: "Policies & terms", icon: ShieldCheck },
  { page: "team" as const, label: "Team & settings", icon: GearSix },
];

const dateRanges = ["4–10 Aug 2026", "28 Jul–3 Aug 2026", "Last 30 days"];

function routeFor(page: SupplierPageId) {
  return page === "dashboard"
    ? "/suppliers/dashboard"
    : `/suppliers/dashboard/${page}`;
}

function IconButton({
  label,
  children,
  onClick,
  active = false,
  expanded,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${active ? styles.iconButtonActive : ""}`}
      aria-label={label}
      aria-pressed={active || undefined}
      aria-expanded={expanded}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function SupplierDashboardExperience({
  page = "dashboard",
}: {
  page?: SupplierPageId;
}) {
  const meta = pageMeta[page];
  const [dateRange, setDateRange] = useState(dateRanges[0]);
  const [dateOpen, setDateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dialog, setDialog] = useState<SupplierDialog>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function runPrimaryAction() {
    if (meta.action === "notice") {
      const notices: Partial<Record<SupplierPageId, string>> = {
        company: "The merchant and consumer previews are ready.",
        "selling-options":
          "Selling-option changes saved for 84 active products.",
        messages: "A new protected supplier conversation is ready to start.",
        orders: "Choose an order to add tracking or freight documents.",
        performance: "The channel performance report is being prepared.",
        policies: "One updated DTC policy is ready for review.",
      };
      setNotice(notices[page] ?? "Workspace updated.");
      return;
    }
    setDialog(meta.action);
  }

  function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const successMessages: Record<Exclude<SupplierDialog, null>, string> = {
      manager: "Manager invitation prepared with the selected role.",
      partner: "Matching preferences saved. Recommendations were refreshed.",
      product: "Product draft created. Add variants and channel offers next.",
      campaign: "Campaign draft created. Creator approval is still required.",
      payout: "Payout request submitted for the available balance.",
    };
    if (dialog) setNotice(successMessages[dialog]);
    setDialog(null);
  }

  return (
    <main className={styles.stage}>
      <section
        className={styles.shell}
        aria-label="PrimeStyleAI supplier portal"
      >
        <header className={styles.topBar}>
          <div className={styles.brandAndNav}>
            <Link
              href="/"
              className={styles.brandMark}
              aria-label="PrimeStyleAI home"
            >
              <Image
                src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
                width={1254}
                height={1254}
                sizes="42px"
                alt="PrimeStyleAI"
                loading="eager"
              />
            </Link>
            <nav
              className={styles.topNavigation}
              aria-label="Supplier workspace"
            >
              {topNavigation.map((item) => {
                const Icon = item.icon;
                const active = page === item.page;
                return (
                  <Link
                    key={item.page}
                    href={routeFor(item.page)}
                    className={active ? styles.topNavigationActive : ""}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      size={14}
                      weight={active ? "fill" : "regular"}
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className={styles.teamControls}>
            <div
              className={styles.avatarStack}
              aria-label="Supplier management team"
            >
              {["elena", "sarah", "david"].map((name) => (
                <Image
                  key={name}
                  src={`/images/landing/avatar-${name}.png`}
                  width={32}
                  height={32}
                  alt=""
                />
              ))}
              <span>+6</span>
            </div>
            <button
              type="button"
              className={styles.addManagerButton}
              onClick={() => setDialog("manager")}
            >
              <Plus size={15} aria-hidden />
              Add manager
            </button>
          </div>

          <div className={styles.accountControls}>
            <IconButton
              label="Notifications"
              onClick={() =>
                setNotice("13 partnership and fulfillment actions are due.")
              }
            >
              <Bell size={17} aria-hidden />
              <span className={styles.notificationDot} aria-hidden />
            </IconButton>
            <IconButton
              label="Messages"
              onClick={() =>
                setNotice(
                  "7 merchant messages and 3 creator replies are unread.",
                )
              }
            >
              <EnvelopeSimple size={17} aria-hidden />
            </IconButton>
            <button
              type="button"
              className={styles.profileButton}
              aria-label="Open supplier profile"
              onClick={() =>
                setNotice("Northstar Manufacturing profile is 92% complete.")
              }
            >
              <Image
                src="/images/landing/avatar-marcus.png"
                width={36}
                height={36}
                alt=""
              />
            </button>
          </div>
        </header>

        <div className={styles.titleRow}>
          <div className={styles.titleCopy}>
            <div className={styles.breadcrumbs} aria-label="Breadcrumb">
              <span>
                <Storefront size={13} aria-hidden /> {meta.eyebrow}
              </span>
              <span aria-hidden>→</span>
              <span>{meta.title}</span>
            </div>
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>
          </div>

          <div className={styles.titleActions}>
            <div className={styles.searchWrap}>
              <IconButton
                label="Search supplier workspace"
                expanded={searchOpen}
                onClick={() => setSearchOpen((value) => !value)}
              >
                <MagnifyingGlass size={17} aria-hidden />
              </IconButton>
              {searchOpen ? (
                <form
                  className={styles.searchPopover}
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSearchOpen(false);
                    setNotice(
                      "Search results updated across the supplier workspace.",
                    );
                  }}
                >
                  <MagnifyingGlass size={15} aria-hidden />
                  <input
                    autoFocus
                    aria-label="Search supplier workspace"
                    placeholder="Partners, products, RFQs, orders…"
                  />
                  <button type="submit" aria-label="Run search">
                    <ArrowUpRight size={14} aria-hidden />
                  </button>
                </form>
              ) : null}
            </div>

            <div className={styles.filterWrap}>
              <IconButton
                label="Filter page"
                expanded={filterOpen}
                onClick={() => setFilterOpen((value) => !value)}
              >
                <SlidersHorizontal size={17} aria-hidden />
              </IconButton>
              {filterOpen ? (
                <div
                  className={styles.quickFilters}
                  role="menu"
                  aria-label="Quick filters"
                >
                  {[
                    "Needs action",
                    "Verified only",
                    "Bulk",
                    "Dropship",
                    "DTC",
                  ].map((filter) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={filter}
                      onClick={() => {
                        setNotice(`${filter} filter applied.`);
                        setFilterOpen(false);
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={styles.dateWrap}>
              <button
                type="button"
                className={styles.utilityButton}
                aria-expanded={dateOpen}
                onClick={() => setDateOpen((value) => !value)}
              >
                <CalendarBlank size={16} aria-hidden />
                <span>{dateRange}</span>
                <CaretDown size={12} aria-hidden />
              </button>
              {dateOpen ? (
                <div
                  className={styles.popoverMenu}
                  role="menu"
                  aria-label="Select date range"
                >
                  {dateRanges.map((range) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={range}
                      onClick={() => {
                        setDateRange(range);
                        setDateOpen(false);
                      }}
                    >
                      {range === dateRange ? (
                        <CheckCircle size={14} weight="fill" aria-hidden />
                      ) : (
                        <span />
                      )}
                      {range}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className={styles.utilityButton}
              onClick={runPrimaryAction}
            >
              <Plus size={15} aria-hidden />
              {meta.actionLabel}
            </button>
          </div>
        </div>

        <div className={styles.dashboardBody}>
          <aside className={styles.sideRail} aria-label="Supplier portal pages">
            {railNavigation.map((item) => {
              const Icon = item.icon;
              const active = page === item.page;
              return (
                <Link
                  key={item.page}
                  href={routeFor(item.page)}
                  className={`${styles.railLink} ${active ? styles.railLinkActive : ""}`}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                >
                  <Icon
                    size={18}
                    weight={active ? "fill" : "regular"}
                    aria-hidden
                  />
                </Link>
              );
            })}
            <span className={styles.railSpacer} />
            <IconButton
              label="Supplier support"
              onClick={() =>
                setNotice("PrimeStyleAI supplier support is ready to help.")
              }
            >
              <Headset size={18} aria-hidden />
            </IconButton>
          </aside>

          <SupplierPortalPageView
            page={page}
            notify={setNotice}
            openDialog={setDialog}
          />
        </div>
      </section>

      {dialog ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setDialog(null)}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span>Supplier workspace</span>
                <h2 id="supplier-modal-title">{dialogTitle(dialog)}</h2>
              </div>
              <IconButton label="Close dialog" onClick={() => setDialog(null)}>
                <X size={16} aria-hidden />
              </IconButton>
            </div>
            <form onSubmit={submitDialog}>
              <DialogFields dialog={dialog} />
              <button type="submit" className={styles.modalSubmit}>
                {dialogSubmitLabel(dialog)}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {notice ? (
        <div className={styles.toast} role="status">
          <CheckCircle size={17} weight="fill" aria-hidden />
          {notice}
        </div>
      ) : null}
    </main>
  );
}

function dialogTitle(dialog: Exclude<SupplierDialog, null>) {
  return {
    manager: "Add a manager",
    partner: "Find the right partners",
    product: "Create a product",
    campaign: "Create an influencer campaign",
    payout: "Request a payout",
  }[dialog];
}

function dialogSubmitLabel(dialog: Exclude<SupplierDialog, null>) {
  return {
    manager: "Prepare invitation",
    partner: "Refresh matches",
    product: "Create draft",
    campaign: "Create campaign draft",
    payout: "Submit payout request",
  }[dialog];
}

function DialogFields({ dialog }: { dialog: Exclude<SupplierDialog, null> }) {
  if (dialog === "manager") {
    return (
      <>
        <label>
          Work email
          <input type="email" placeholder="manager@northstar.co" required />
        </label>
        <label>
          Workspace role
          <select defaultValue="sales">
            <option value="sales">Sales manager</option>
            <option value="catalog">Catalog manager</option>
            <option value="fulfillment">Fulfillment manager</option>
            <option value="finance">Finance manager</option>
          </select>
        </label>
      </>
    );
  }

  if (dialog === "partner") {
    return (
      <>
        <label>
          Partner type
          <select defaultValue="both">
            <option value="both">Merchant buyers and influencers</option>
            <option value="merchants">Merchant buyers</option>
            <option value="influencers">Influencers</option>
          </select>
        </label>
        <label>
          Priority category
          <select defaultValue="uniforms">
            <option value="uniforms">Medical uniforms</option>
            <option value="workwear">Workwear</option>
            <option value="activewear">Activewear</option>
          </select>
        </label>
        <label>
          Priority region
          <select defaultValue="north-america">
            <option value="north-america">United States and Canada</option>
            <option value="united-states">United States</option>
            <option value="europe">Europe</option>
          </select>
        </label>
      </>
    );
  }

  if (dialog === "product") {
    return (
      <>
        <label>
          Product name
          <input placeholder="e.g. FlexPro Scrub Set" required />
        </label>
        <label>
          Category
          <select defaultValue="medical-uniforms">
            <option value="medical-uniforms">Medical uniforms</option>
            <option value="workwear">Workwear</option>
            <option value="activewear">Activewear</option>
          </select>
        </label>
        <label>
          First selling mode
          <select defaultValue="bulk">
            <option value="bulk">Bulk Wholesale</option>
            <option value="dropship">Dropshipping</option>
            <option value="dtc">Direct-to-consumer</option>
          </select>
        </label>
      </>
    );
  }

  if (dialog === "campaign") {
    return (
      <>
        <label>
          Campaign name
          <input placeholder="Autumn workwear launch" required />
        </label>
        <label>
          Creator
          <select defaultValue="maya">
            <option value="maya">Maya Laurent · 12%</option>
            <option value="sienna">Sienna Brooks · 10%</option>
            <option value="rae">Rae Morgan · 14%</option>
          </select>
        </label>
        <label>
          Eligible DTC collection
          <select defaultValue="all">
            <option value="all">All eligible DTC products</option>
            <option value="scrubs">FlexPro Scrubs</option>
            <option value="workwear">Northstar Workwear</option>
          </select>
        </label>
      </>
    );
  }

  return (
    <>
      <label>
        Payout amount
        <input defaultValue="$18,420.60" aria-label="Payout amount" required />
      </label>
      <label>
        Destination
        <select defaultValue="bank">
          <option value="bank">Business checking •••• 4821</option>
          <option value="reserve">Keep in PrimeStyleAI balance</option>
        </select>
      </label>
    </>
  );
}
