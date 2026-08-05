"use client";

import {
  Archive,
  ArrowRight,
  Brain,
  Buildings,
  CheckCircle,
  ClipboardText,
  ClockCountdown,
  Coins,
  Copy,
  CreditCard,
  Database,
  EnvelopeSimple,
  Eye,
  FileText,
  ImagesSquare,
  Lifebuoy,
  LinkSimple,
  LockKey,
  Megaphone,
  PauseCircle,
  PlugsConnected,
  Power,
  Receipt,
  Ruler,
  Scales,
  ShieldCheck,
  ShoppingCart,
  Sparkle,
  Storefront,
  UserCircle,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type {
  MerchantDashboardData,
  MerchantFeatureCard,
  MerchantMatrixRow,
  MerchantStatus,
  MerchantTabView,
  MerchantTimelineItem,
} from "../types";
import styles from "./accountGovernance.module.css";
import {
  MerchantPreviewDrawer,
  type MerchantPreviewDrawerContent,
} from "./MerchantPreviewDrawer";

type Icon = ComponentType<{
  size?: number;
  weight?: "regular" | "fill" | "duotone" | "bold";
  "aria-hidden"?: boolean;
}>;

interface AccountGovernanceWorkspaceProps {
  merchant: MerchantDashboardData["merchant"];
  tabs: MerchantTabView[];
  activeTabId: string;
}

type Intent = "positive" | "warning" | "critical" | "info" | "neutral";

const sectionIcons: Record<string, Icon> = {
  profile: Buildings,
  agreements: FileText,
  permissions: ShieldCheck,
  contacts: UsersThree,
  privacy: LockKey,
  lifecycle: PauseCircle,
};

const accountTaskLabels: Record<string, string> = {
  profile: "Profile",
  agreements: "Agreements",
  permissions: "Permissions",
  contacts: "Contacts",
  privacy: "Privacy & support",
  lifecycle: "Pause or end the program",
};

const accountTaskHref = (tabId: string) =>
  tabId === "profile"
    ? "/merchants/dashboard/account"
    : `/merchants/dashboard/account?tab=${tabId}`;

const statusIntent = (status?: MerchantStatus): Intent => {
  if (!status) return "neutral";
  if (status.tone === "positive") return "positive";
  if (status.tone === "warning") return "warning";
  if (status.tone === "critical") return "critical";
  if (status.tone === "info") return "info";
  return "neutral";
};

function StatusPill({
  children,
  intent = "neutral",
}: {
  children: ReactNode;
  intent?: Intent;
}) {
  const StatusIcon =
    intent === "positive"
      ? CheckCircle
      : intent === "warning"
        ? ClockCountdown
        : intent === "critical"
          ? WarningCircle
          : intent === "info"
            ? Eye
            : LockKey;

  return (
    <span className={`${styles.statusPill} ${styles[`status${intent}`]}`}>
      <StatusIcon size={14} weight="fill" aria-hidden />
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <header className={styles.contentHeading}>
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {action}
    </header>
  );
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fieldValue}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function MerchantProfileView({
  merchant,
  view,
}: {
  merchant: MerchantDashboardData["merchant"];
  view: MerchantTabView;
}) {
  const setupStages = [
    { label: "Business", value: "100%", state: "Ready", tone: "blue" },
    { label: "Store", value: "100%", state: "Ready", tone: "lilac" },
    { label: "Products", value: "92%", state: "Watch", tone: "rose" },
    { label: "Program", value: "100%", state: "Active", tone: "mint" },
  ];

  const profileSettings = [
    { id: "agreements", label: "Agreements", icon: FileText },
    { id: "permissions", label: "Permissions", icon: ShieldCheck },
    { id: "contacts", label: "Contacts", icon: UsersThree },
    { id: "privacy", label: "Privacy & support", icon: LockKey },
    { id: "lifecycle", label: "Pause or end", icon: PauseCircle },
  ];

  return (
    <div className={styles.profileDashboard}>
      <header className={styles.profileOverviewHeader}>
        <div className={styles.profileWelcome}>
          <span>Merchant profile</span>
          <h1>Welcome back, {merchant.name}</h1>
          <p>Your account is active. Two items need review.</p>
        </div>
        <div className={styles.profileHeadlineStats} aria-label="Account summary">
          <span>
            <strong>12/12</strong>
            <small>Setup checks</small>
          </span>
          <span>
            <strong>2</strong>
            <small>Follow-ups</small>
          </span>
          <span>
            <strong>3</strong>
            <small>Regions</small>
          </span>
        </div>
      </header>

      <section className={styles.setupProgressStrip} aria-label="Setup status">
        <div>
          <span>Setup status</span>
          <strong>Account ready</strong>
        </div>
        <div className={styles.setupSegments}>
          {setupStages.map((stage) => (
            <span
              key={stage.label}
              className={styles[`setupSegment${stage.tone}`]}
            >
              <small>{stage.label}</small>
              <strong>{stage.value}</strong>
              <em>{stage.state}</em>
            </span>
          ))}
        </div>
      </section>

      <section className={styles.profileReferenceGrid} aria-label="Merchant account overview">
        <article className={styles.profilePortraitCard}>
          <Image
            src={merchant.avatar}
            fill
            sizes="(max-width: 760px) 100vw, 260px"
            alt={`${merchant.contact}, merchant account owner`}
          />
          <div>
            <span>Account owner</span>
            <h2>{merchant.contact}</h2>
            <p>{merchant.legalName}</p>
          </div>
          <span className={styles.profileQualificationBadge}>
            <CheckCircle size={15} weight="fill" aria-hidden />
            Qualified
          </span>
        </article>

        <article className={styles.setupCard}>
          <div className={styles.cardTitleRow}>
            <span>Setup progress</span>
            <StatusPill intent="positive">Done</StatusPill>
          </div>
          <strong className={styles.setupScore}>12/12</strong>
          <p>Activation checks completed</p>
          <div className={styles.setupBars}>
            {[
              ["Business", 100],
              ["Systems", 100],
              ["Catalog", 100],
              ["Rights", 100],
            ].map(([label, value]) => (
              <label key={label}>
                <span>{label}</span>
                <progress max="100" value={value} />
              </label>
            ))}
          </div>
          <small>Live since 1 Jul 2026</small>
        </article>

        <article className={styles.healthCard}>
          <div className={styles.cardTitleRow}>
            <span>Account health</span>
            <ShieldCheck size={25} weight="duotone" aria-hidden />
          </div>
          <strong className={styles.healthScore}>Good</strong>
          <p>No account blocker</p>
          <dl>
            <div>
              <dt>Store connection</dt>
              <dd>Connected</dd>
            </div>
            <div>
              <dt>Permissions</dt>
              <dd>1 review</dd>
            </div>
            <div>
              <dt>Privacy</dt>
              <dd>Protected</dd>
            </div>
          </dl>
        </article>

        <article className={styles.nextTasksCard} aria-labelledby="next-tasks-title">
          <div className={styles.nextTasksHeading}>
            <div>
              <span>Next actions</span>
              <h2 id="next-tasks-title">2 items</h2>
            </div>
            <strong>2/2</strong>
          </div>
          <Link href="/merchants/dashboard/products?tab=size-charts">
            <span>
              <Ruler size={18} weight="duotone" aria-hidden />
            </span>
            <span>
              <strong>Check size charts</strong>
              <small>12 products need review</small>
            </span>
            <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
          <Link href="/merchants/dashboard/commerce?tab=returns">
            <span>
              <Receipt size={18} weight="duotone" aria-hidden />
            </span>
            <span>
              <strong>Check refund field</strong>
              <small>1 mapping needs review</small>
            </span>
            <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
          <small>These do not block your account.</small>
        </article>
      </section>

      <div className={styles.profileLowerGrid}>
        <section className={styles.settingsCard} aria-labelledby="settings-title">
          <div className={styles.cardTitleRow}>
            <h2 id="settings-title">Account settings</h2>
            <StatusPill intent="info">5 areas</StatusPill>
          </div>
          <div>
            {profileSettings.map((setting) => {
              const SettingIcon = setting.icon;
              return (
                <Link key={setting.id} href={accountTaskHref(setting.id)}>
                  <span>
                    <SettingIcon size={19} weight="duotone" aria-hidden />
                  </span>
                  <strong>{setting.label}</strong>
                  <ArrowRight size={15} weight="bold" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>

        <section className={styles.launchRecord} aria-labelledby="launch-record-title">
          <div className={styles.cardTitleRow}>
            <div>
              <span>Launch record</span>
              <h2 id="launch-record-title">All four stages are active</h2>
            </div>
            <StatusPill intent="positive">Ready</StatusPill>
          </div>
          <ol>
            {(view.timeline ?? []).map((item, index) => {
              const StepIcon =
                [Scales, PlugsConnected, ShieldCheck, Sparkle][index] ??
                CheckCircle;
              return (
                <li key={item.id}>
                  <span>
                    <StepIcon size={20} weight="duotone" aria-hidden />
                  </span>
                  <small>Stage {index + 1}</small>
                  <strong>{item.title}</strong>
                  <em>{item.meta}</em>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <details className={styles.evidenceDrawer}>
        <summary>
          <ClipboardText size={19} weight="duotone" aria-hidden />
          Merchant record and technical evidence
        </summary>
        <dl>
          {(view.fields ?? []).map((field) => (
            <FieldValue
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
        </dl>
      </details>
    </div>
  );
}

function AgreementsView({ view }: { view: MerchantTabView }) {
  const documents = view.cards ?? [];
  const [selectedId, setSelectedId] = useState(documents[0]?.id ?? "");
  const selected =
    documents.find((item) => item.id === selectedId) ?? documents[0];
  const agreementState = (document: MerchantFeatureCard) =>
    document.status.tone === "critical"
      ? "Needs signature"
      : document.status.tone === "warning"
        ? "Needs review"
        : "Effective";

  return (
    <div className={styles.viewStack}>
      <SectionTitle
        eyebrow="Your contract stack"
        title="Three records define how the program works"
        detail="The Agreement creates the relationship, the Order Form sets the commercial limits, and the privacy addendum protects shopper data."
        action={
          <StatusPill intent="positive">Legal foundation current</StatusPill>
        }
      />

      <ol className={styles.contractTimeline} aria-label="Agreement timeline">
        {documents.map((document, index) => {
          const DocumentIcon =
            index === 0 ? Scales : index === 1 ? Receipt : LockKey;
          return (
            <li key={document.id}>
              <span>
                <DocumentIcon size={22} weight="duotone" aria-hidden />
              </span>
              <small>
                {index === 0
                  ? "Relationship"
                  : index === 1
                    ? "Commercial terms"
                    : "Shopper data"}
              </small>
              <strong>{document.title}</strong>
              <p>{document.meta}</p>
            </li>
          );
        })}
      </ol>

      <div className={styles.documentWorkspace}>
        <div
          className={styles.documentGrid}
          role="list"
          aria-label="Contract records"
        >
          {documents.map((document, index) => {
            const DocumentIcon =
              index === 0 ? Scales : index === 1 ? Receipt : LockKey;
            const active = document.id === selected?.id;
            return (
              <button
                key={document.id}
                type="button"
                className={active ? styles.documentActive : undefined}
                onClick={() => setSelectedId(document.id)}
                aria-pressed={active}
              >
                <span className={styles.documentCover}>
                  <DocumentIcon size={38} weight="duotone" aria-hidden />
                </span>
                <span className={styles.documentCopy}>
                  <strong>{document.title}</strong>
                  <span>{document.detail}</span>
                  <em>{document.meta}</em>
                </span>
                <StatusPill intent={statusIntent(document.status)}>
                  {agreementState(document)}
                </StatusPill>
              </button>
            );
          })}
        </div>

        {selected ? (
          <aside className={styles.documentDetail} aria-live="polite">
            <div className={styles.detailTopline}>
              <span>Selected record</span>
              <StatusPill intent={statusIntent(selected.status)}>
                {agreementState(selected)}
              </StatusPill>
            </div>
            <h3>{selected.title}</h3>
            <p>{selected.detail}</p>
            <dl>
              {selected.fields?.map((field) => (
                <FieldValue
                  key={field.label}
                  label={field.label}
                  value={field.value}
                />
              ))}
            </dl>
            <div className={styles.demoCallout}>
              <LockKey size={18} weight="duotone" aria-hidden />
              <span>
                <strong>Summary preview only</strong>Source documents, downloads
                and signing are not connected in this demo.
              </span>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

const permissionPlainCopy: Record<
  string,
  { title: string; allows: string; excludes: string; group: string; icon: Icon }
> = {
  "PER-FEED": {
    title: "Product catalog data",
    allows: "Import and organize approved product information from Shopify.",
    excludes: "Products outside the contracted catalog limit.",
    group: "Product data",
    icon: Database,
  },
  "PER-IMG": {
    title: "Merchant product images",
    allows: "Display, crop, resize and clean approved merchant images.",
    excludes: "Unapproved products or unrelated brand imagery.",
    group: "Images & AI",
    icon: ImagesSquare,
  },
  "PER-AI": {
    title: "Shopper-requested AI results",
    allows:
      "Create try-on, styling and comparison results requested by a shopper.",
    excludes: "Unrelated reuse outside the delivered shopping service.",
    group: "Images & AI",
    icon: Sparkle,
  },
  "PER-PDP": {
    title: "AI-created product-page content",
    allows:
      "Publish approved product-page copy, metadata and structured information.",
    excludes:
      "New AI image or copy derivatives until legal review is complete.",
    group: "Shopping experience",
    icon: Storefront,
  },
  "PER-RAG": {
    title: "AI answers using product information",
    allows: "Use approved catalog content to answer product questions.",
    excludes: "General training or answers based on unapproved sources.",
    group: "Product data",
    icon: Brain,
  },
  "PER-TRAIN": {
    title: "General model training",
    allows: "Nothing. This permission was not granted.",
    excludes:
      "Using merchant or shopper content to improve a general-purpose model.",
    group: "Images & AI",
    icon: LockKey,
  },
  "PER-CART": {
    title: "Cart and order reporting",
    allows:
      "Send the exact selected variant to cart and reconcile contracted events.",
    excludes:
      "Payment submission or activity outside the merchant-supported integration.",
    group: "Shopping experience",
    icon: ShoppingCart,
  },
  "PER-PUB": {
    title: "Creator campaign assets",
    allows:
      "Give approved campaign assets and disclosure copy to authorized creators.",
    excludes: "Unapproved creators, products or campaign periods.",
    group: "Creator campaigns",
    icon: Megaphone,
  },
};

function permissionState(row: MerchantMatrixRow) {
  const status = row.values.find((value) => value.status)?.status;
  return status ?? { label: "Recorded", tone: "neutral" as const };
}

function PermissionsView({ view }: { view: MerchantTabView }) {
  const rows = view.matrixRows ?? [];
  const initialId = rows.some((row) => row.id === "PER-PDP")
    ? "PER-PDP"
    : (rows[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState(initialId);
  const [drawer, setDrawer] = useState<MerchantPreviewDrawerContent | null>(
    null,
  );
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const selectedCopy = selected ? permissionPlainCopy[selected.id] : undefined;
  const groups = [
    "Product data",
    "Images & AI",
    "Shopping experience",
    "Creator campaigns",
  ];
  const groupedRows = groups
    .map((group) => ({
      group,
      rows: rows.filter((row) => permissionPlainCopy[row.id]?.group === group),
    }))
    .filter((item) => item.rows.length);

  return (
    <div className={styles.viewStack}>
      <SectionTitle
        eyebrow="What PrimeStyleAI can use"
        title="Every permission stands on its own"
        detail="Approval to use your catalog does not automatically approve AI images, model training, cart access or creator campaigns."
        action={<StatusPill intent="warning">1 item needs review</StatusPill>}
      />

      <Link
        href="#permission-detail"
        className={styles.permissionAlert}
        onClick={() => setSelectedId("PER-PDP")}
      >
        <span>
          <WarningCircle size={25} weight="duotone" aria-hidden />
        </span>
        <span>
          <small>Legal review needed</small>
          <strong>Confirm AI-created product-page content</strong>
          <p>
            Product-page metadata is approved. New AI image or copy derivatives
            still need a separate decision.
          </p>
        </span>
        <em>
          Review permission <ArrowRight size={16} weight="bold" aria-hidden />
        </em>
      </Link>

      <div className={styles.permissionWorkspace}>
        <div className={styles.permissionGroups}>
          {groupedRows.map((group) => (
            <details
              key={group.group}
              open={group.rows.some((row) => row.id === "PER-PDP")}
            >
              <summary>
                <h3>{group.group}</h3>
                <span>{group.rows.length} permissions</span>
              </summary>
              <div>
                {group.rows.map((row) => {
                  const copy = permissionPlainCopy[row.id];
                  const PermissionIcon = copy?.icon ?? ShieldCheck;
                  const status = permissionState(row);
                  const active = row.id === selected?.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      className={active ? styles.permissionActive : undefined}
                      onClick={() => setSelectedId(row.id)}
                      aria-pressed={active}
                    >
                      <span className={styles.permissionIcon}>
                        <PermissionIcon
                          size={21}
                          weight="duotone"
                          aria-hidden
                        />
                      </span>
                      <span>
                        <strong>{copy?.title ?? row.label}</strong>
                        <small>{copy?.allows ?? row.detail}</small>
                      </span>
                      <StatusPill intent={statusIntent(status)}>
                        {status.label === "Approved" ? "Allowed" : status.label}
                      </StatusPill>
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </div>

        {selected && selectedCopy ? (
          <aside
            id="permission-detail"
            className={styles.permissionDetail}
            aria-live="polite"
          >
            <div className={styles.detailTopline}>
              <span>Selected permission</span>
              <StatusPill intent={statusIntent(permissionState(selected))}>
                {permissionState(selected).label === "Approved"
                  ? "Allowed"
                  : permissionState(selected).label}
              </StatusPill>
            </div>
            <h3>{selectedCopy.title}</h3>
            <div className={styles.permissionRule}>
              <CheckCircle size={20} weight="fill" aria-hidden />
              <span>
                <small>What this allows</small>
                <p>{selectedCopy.allows}</p>
              </span>
            </div>
            <div className={styles.permissionRule}>
              <LockKey size={20} weight="fill" aria-hidden />
              <span>
                <small>What this does not allow</small>
                <p>{selectedCopy.excludes}</p>
              </span>
            </div>
            <dl>
              {selected.values
                .filter((value) => !value.status)
                .map((value) => (
                  <FieldValue
                    key={value.label}
                    label={value.label}
                    value={value.value}
                  />
                ))}
            </dl>
            <button
              type="button"
              className={styles.previewButton}
              onClick={() =>
                setDrawer({
                  title: `Preview permission decision: ${selectedCopy.title}`,
                  description:
                    "See the requested permission and its boundary before legal or merchant approval.",
                  steps: [
                    {
                      title: "Confirm what is allowed",
                      detail: selectedCopy.allows,
                    },
                    {
                      title: "Keep exclusions explicit",
                      detail: selectedCopy.excludes,
                    },
                    {
                      title: "Return without approving",
                      detail:
                        "This demo does not save, publish, or send a legal decision.",
                    },
                  ],
                })
              }
            >
              <Eye size={17} weight="duotone" aria-hidden />
              Preview requested change <span>Demo only</span>
            </button>
          </aside>
        ) : null}
      </div>
      <MerchantPreviewDrawer content={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}

const contactIcons: Icon[] = [
  UserCircle,
  PlugsConnected,
  CreditCard,
  Scales,
  ShieldCheck,
  Lifebuoy,
];

function ContactsView({ view }: { view: MerchantTabView }) {
  const contacts = view.cards ?? [];
  const [selectedId, setSelectedId] = useState(contacts[0]?.id ?? "");
  const [copied, setCopied] = useState("");
  const selected =
    contacts.find((item) => item.id === selectedId) ?? contacts[0];

  const copyEmail = async (contact: MerchantFeatureCard) => {
    try {
      await navigator.clipboard.writeText(contact.meta);
      setCopied(contact.id);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };

  return (
    <div className={styles.viewStack}>
      <SectionTitle
        eyebrow="Who owns what"
        title="Find the right person without reading a directory"
        detail="Choose the responsibility first. The current owner, coverage and demo contact details appear together."
        action={
          <StatusPill intent="positive">All required roles assigned</StatusPill>
        }
      />

      <div className={styles.contactWorkspace}>
        <div
          className={styles.contactGrid}
          role="list"
          aria-label="Merchant responsibility owners"
        >
          {contacts.map((contact, index) => {
            const ContactIcon = contactIcons[index] ?? UserCircle;
            const role =
              contact.fields?.find((field) => field.label === "Role")?.value ??
              "Account owner";
            const active = contact.id === selected?.id;
            return (
              <button
                key={contact.id}
                type="button"
                className={active ? styles.contactActive : undefined}
                onClick={() => setSelectedId(contact.id)}
                aria-pressed={active}
              >
                <span className={styles.contactIcon}>
                  <ContactIcon size={24} weight="duotone" aria-hidden />
                </span>
                <span>
                  <small>{role}</small>
                  <strong>{contact.title}</strong>
                  <p>{contact.detail}</p>
                </span>
                <StatusPill intent="positive">Current</StatusPill>
              </button>
            );
          })}
        </div>

        {selected ? (
          <aside className={styles.contactDetail} aria-live="polite">
            <span className={styles.contactPortrait}>
              <UserCircle size={44} weight="duotone" aria-hidden />
            </span>
            <small>
              {selected.fields?.find((field) => field.label === "Role")?.value}
            </small>
            <h3>{selected.title}</h3>
            <p>{selected.detail}</p>
            <div className={styles.contactActions}>
              <a href={`mailto:${selected.meta}`}>
                <EnvelopeSimple size={18} weight="duotone" aria-hidden />
                Email owner
              </a>
              <button type="button" onClick={() => copyEmail(selected)}>
                <Copy size={18} weight="duotone" aria-hidden />
                {copied === selected.id ? "Copied" : "Copy email"}
              </button>
            </div>
            <dl>
              {selected.fields?.map((field) => (
                <FieldValue
                  key={field.label}
                  label={field.label}
                  value={field.value}
                />
              ))}
            </dl>
            <span className={styles.demoAddress}>
              {selected.meta} · demo address
            </span>
          </aside>
        ) : null}
      </div>

      <section
        className={styles.escalationStrip}
        aria-label="Contact escalation guide"
      >
        <div>
          <Lifebuoy size={24} weight="duotone" aria-hidden />
          <span>
            <small>Daily product or sizing issue</small>
            <strong>Merchant Operations</strong>
          </span>
        </div>
        <ArrowRight size={17} aria-hidden />
        <div>
          <ShieldCheck size={24} weight="duotone" aria-hidden />
          <span>
            <small>Security or shopper-data issue</small>
            <strong>Privacy Office + Legal</strong>
          </span>
        </div>
        <ArrowRight size={17} aria-hidden />
        <div>
          <Coins size={24} weight="duotone" aria-hidden />
          <span>
            <small>Statement or tax question</small>
            <strong>Billing owner</strong>
          </span>
        </div>
      </section>
    </div>
  );
}

function PrivacySupportView({ view }: { view: MerchantTabView }) {
  const activeIncident =
    view.timeline?.find((item) => item.status.tone === "critical") ??
    view.timeline?.[0];
  const resolvedIncidents = (view.timeline ?? []).filter(
    (item) => item.id !== activeIncident?.id,
  );

  return (
    <div className={styles.viewStack}>
      <SectionTitle
        eyebrow="Protect shoppers and resolve issues"
        title="Privacy rules and support work are clear at a glance"
        detail="You receive the operational evidence needed to run commerce. Sensitive PrimeStyleAI shopper profile data stays outside the merchant workspace."
        action={
          <StatusPill intent="critical">1 incident needs action</StatusPill>
        }
      />

      <section
        className={styles.incidentBoard}
        aria-labelledby="incident-title"
      >
        <div className={styles.panelHeading}>
          <div>
            <span>Support and incidents</span>
            <h3 id="incident-title">One issue needs your team</h3>
          </div>
        </div>
        {activeIncident ? <IncidentCard item={activeIncident} active /> : null}
        <details className={styles.resolvedIncidents}>
          <summary>Show resolved incidents</summary>
          <div className={styles.resolvedGrid}>
            {resolvedIncidents.map((item) => (
              <IncidentCard key={item.id} item={item} />
            ))}
          </div>
        </details>
      </section>

      <div className={styles.privacySplit}>
        <section
          className={styles.accessCard}
          aria-labelledby="merchant-can-see"
        >
          <span className={styles.accessIcon}>
            <Eye size={29} weight="duotone" aria-hidden />
          </span>
          <div>
            <small>Merchant access</small>
            <h3 id="merchant-can-see">What your team can see</h3>
            <p>
              Operational status and contract-limited evidence needed to run
              products, carts, orders, returns and support.
            </p>
          </div>
          <ul>
            <li>
              <CheckCircle size={17} weight="fill" aria-hidden />
              Product and system status
            </li>
            <li>
              <CheckCircle size={17} weight="fill" aria-hidden />
              Order and return evidence
            </li>
            <li>
              <CheckCircle size={17} weight="fill" aria-hidden />
              Incident and reconciliation records
            </li>
          </ul>
        </section>
        <section
          className={`${styles.accessCard} ${styles.accessProtected}`}
          aria-labelledby="merchant-never-sees"
        >
          <span className={styles.accessIcon}>
            <LockKey size={29} weight="duotone" aria-hidden />
          </span>
          <div>
            <small>Protected by PrimeStyleAI</small>
            <h3 id="merchant-never-sees">What your team never receives</h3>
            <p>
              Sensitive profile data stays with PrimeStyleAI and remains subject
              to consent, retention and deletion controls.
            </p>
          </div>
          <ul>
            <li>
              <LockKey size={17} weight="fill" aria-hidden />
              Shopper photos or measurements
            </li>
            <li>
              <LockKey size={17} weight="fill" aria-hidden />
              Account and recommendation history
            </li>
            <li>
              <LockKey size={17} weight="fill" aria-hidden />
              PrimeStyleAI credentials
            </li>
          </ul>
        </section>
      </div>

      <section className={styles.slaPanel} aria-labelledby="sla-title">
        <div className={styles.panelHeading}>
          <div>
            <span>Support promise</span>
            <h3 id="sla-title">How quickly we respond</h3>
          </div>
          <StatusPill intent="positive">Coverage current</StatusPill>
        </div>
        <div className={styles.slaGrid}>
          <article>
            <WarningCircle size={23} weight="duotone" aria-hidden />
            <span>
              <small>Urgent security or checkout</small>
              <strong>1 hour</strong>
              <p>First acknowledgement</p>
            </span>
          </article>
          <article>
            <ClockCountdown size={23} weight="duotone" aria-hidden />
            <span>
              <small>Important operational issue</small>
              <strong>4 hours</strong>
              <p>P2 response</p>
            </span>
          </article>
          <article>
            <Lifebuoy size={23} weight="duotone" aria-hidden />
            <span>
              <small>Standard request</small>
              <strong>1 business day</strong>
              <p>Business-hours response</p>
            </span>
          </article>
        </div>
      </section>
    </div>
  );
}

function IncidentCard({
  item,
  active = false,
}: {
  item: MerchantTimelineItem;
  active?: boolean;
}) {
  const IncidentIcon =
    item.icon === "sizing"
      ? Ruler
      : item.icon === "cart"
        ? ShoppingCart
        : LinkSimple;
  return (
    <article
      className={active ? styles.incidentActive : styles.incidentResolved}
    >
      <span className={styles.incidentIcon}>
        <IncidentIcon size={23} weight="duotone" aria-hidden />
      </span>
      <div>
        <strong>{item.title}</strong>
        <p>{item.detail}</p>
        <em>{item.meta}</em>
      </div>
      {active ? (
        <Link href="/merchants/dashboard/products?tab=size-charts">
          Review 12 paused PDPs{" "}
          <ArrowRight size={15} weight="bold" aria-hidden />
        </Link>
      ) : (
        <StatusPill intent="positive">Resolved</StatusPill>
      )}
    </article>
  );
}

const lifecycleScenarios = {
  pause: {
    label: "Pause products",
    icon: PauseCircle,
    summary:
      "Affected products disappear from new PrimeStyleAI shopping experiences while the rest of the account keeps running.",
    impacts: [
      ["Products", "Only selected products stop appearing"],
      ["Shopper access", "Other eligible products remain available"],
      ["Credentials", "Catalog connection remains active"],
      ["Billing", "Unrelated activity continues normally"],
      ["Promotion", "Paused products leave active campaigns"],
      ["Retained records", "Existing evidence follows retention rules"],
    ],
  },
  suspend: {
    label: "Suspend a feature",
    icon: Power,
    summary:
      "The affected AI, cart, tracking or publishing feature stops until its risk or reliability issue is resolved.",
    impacts: [
      ["Products", "Products remain listed when the feature permits"],
      ["Shopper access", "Affected feature becomes unavailable"],
      ["Credentials", "Relevant integration scope is disabled"],
      ["Billing", "Events stop accruing for that feature"],
      ["Promotion", "Campaign use of the feature pauses"],
      ["Retained records", "Prior evidence remains governed"],
    ],
  },
  terminate: {
    label: "End the program",
    icon: Archive,
    summary:
      "New generation and promotion stop, credentials are revoked, content is closed out and final financial records are reconciled.",
    impacts: [
      ["Products", "Products leave PrimeStyleAI experiences"],
      ["Shopper access", "New generation and shopping access stop"],
      ["Credentials", "Credentials revoke at effective termination"],
      ["Billing", "Invoices, returns and disputes close out"],
      ["Promotion", "All merchant-funded promotion stops"],
      ["Retained records", "Only privacy and legal records remain"],
    ],
  },
} as const;

type LifecycleScenarioId = keyof typeof lifecycleScenarios;

function LifecycleView({ view }: { view: MerchantTabView }) {
  const [scenarioId, setScenarioId] = useState<LifecycleScenarioId>("pause");
  const [drawer, setDrawer] = useState<MerchantPreviewDrawerContent | null>(
    null,
  );
  const scenario = lifecycleScenarios[scenarioId];

  return (
    <div className={styles.viewStack}>
      <SectionTitle
        eyebrow="Preview what happens if service changes"
        title="Pause or end the program"
        detail="No stop condition is present. Use the preview to understand a product pause, feature suspension or program closeout without changing anything."
        action={<StatusPill intent="positive">No stop condition</StatusPill>}
      />

      <section
        className={styles.scenarioPanel}
        aria-labelledby="scenario-title"
      >
        <div className={styles.panelHeading}>
          <div>
            <span>Safe scenario preview</span>
            <h3 id="scenario-title">Choose a situation to see its impact</h3>
          </div>
          <StatusPill intent="info">
            Preview only — nothing will change
          </StatusPill>
        </div>
        <div
          className={styles.scenarioTabs}
          role="tablist"
          aria-label="Lifecycle scenarios"
        >
          {(
            Object.entries(lifecycleScenarios) as Array<
              [
                LifecycleScenarioId,
                (typeof lifecycleScenarios)[LifecycleScenarioId],
              ]
            >
          ).map(([id, item]) => {
            const ScenarioIcon = item.icon;
            const active = id === scenarioId;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? styles.scenarioActive : undefined}
                onClick={() => setScenarioId(id)}
              >
                <ScenarioIcon size={21} weight="duotone" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>
        <div
          className={styles.scenarioResult}
          role="tabpanel"
          aria-live="polite"
        >
          <div className={styles.scenarioSummary}>
            <strong>{scenario.label}</strong>
            <p>{scenario.summary}</p>
          </div>
          <div className={styles.impactGrid}>
            {scenario.impacts.map(([label, value], index) => {
              const ImpactIcon =
                [Storefront, Eye, PlugsConnected, Coins, Megaphone, LockKey][
                  index
                ] ?? CheckCircle;
              return (
                <article key={label}>
                  <ImpactIcon size={22} weight="duotone" aria-hidden />
                  <span>
                    <small>{label}</small>
                    <strong>{value}</strong>
                  </span>
                </article>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.previewButton}
            onClick={() =>
              setDrawer({
                title: `Preview ${scenario.label.toLowerCase()}`,
                description: scenario.summary,
                steps: scenario.impacts.map(([title, detail]) => ({
                  title,
                  detail,
                })),
              })
            }
          >
            <Eye size={17} weight="duotone" aria-hidden />
            Preview this decision <span>Demo only</span>
          </button>
        </div>
      </section>

      <section
        className={styles.closeoutPanel}
        aria-labelledby="closeout-title"
      >
        <div className={styles.panelHeading}>
          <div>
            <span>Required closeout sequence</span>
            <h3 id="closeout-title">What happens when the relationship ends</h3>
          </div>
        </div>
        <ol>
          {(view.timeline ?? []).map((item, index) => {
            const CloseoutIcon =
              [PauseCircle, Power, PlugsConnected, LockKey, Receipt][index] ??
              CheckCircle;
            return (
              <li key={item.id}>
                <span>
                  <CloseoutIcon size={21} weight="duotone" aria-hidden />
                </span>
                <small>{index + 1}</small>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <details className={styles.evidenceDrawer}>
        <summary>
          <ClipboardText size={19} weight="duotone" aria-hidden />
          Lifecycle evidence and retained-record rules
        </summary>
        <dl>
          {(view.fields ?? []).map((field) => (
            <FieldValue
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
        </dl>
      </details>
      <MerchantPreviewDrawer content={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}

function ActiveAccountView({
  merchant,
  view,
}: {
  merchant: MerchantDashboardData["merchant"];
  view: MerchantTabView;
}) {
  if (view.id === "agreements") return <AgreementsView view={view} />;
  if (view.id === "permissions") return <PermissionsView view={view} />;
  if (view.id === "contacts") return <ContactsView view={view} />;
  if (view.id === "privacy") return <PrivacySupportView view={view} />;
  if (view.id === "lifecycle") return <LifecycleView view={view} />;
  return <MerchantProfileView merchant={merchant} view={view} />;
}

export function AccountGovernanceWorkspace({
  merchant,
  tabs,
  activeTabId,
}: AccountGovernanceWorkspaceProps) {
  const activeView = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return (
    <div className={styles.scene}>
      <nav className={styles.accountTaskBar} aria-label="Account sections">
        {tabs.map((tab) => {
          const TabIcon = sectionIcons[tab.id] ?? ClipboardText;
          const active = tab.id === activeView.id;
          return (
            <Link
              key={tab.id}
              id={`account-control-${tab.id}`}
              href={accountTaskHref(tab.id)}
              aria-current={active ? "page" : undefined}
              className={active ? styles.accountTaskActive : undefined}
              scroll={false}
            >
              <TabIcon size={17} weight="duotone" aria-hidden />
              <span>{accountTaskLabels[tab.id] ?? tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <details className={styles.mobileTaskChooser}>
        <summary>Choose another task</summary>
        <div>
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={accountTaskHref(tab.id)}
              aria-current={tab.id === activeView.id ? "page" : undefined}
            >
              {accountTaskLabels[tab.id] ?? tab.label}
            </Link>
          ))}
        </div>
      </details>

      <section
        id="account-control-panel"
        aria-labelledby={`account-control-${activeView.id}`}
        className={styles.activePanel}
      >
        <ActiveAccountView
          key={activeView.id}
          merchant={merchant}
          view={activeView}
        />
      </section>

      <p className={styles.demoFooter}>
        Realistic demo data only. Authentication, source documents,
        integrations, persistence, legal approvals and merchant operations are
        not connected.
      </p>
    </div>
  );
}
