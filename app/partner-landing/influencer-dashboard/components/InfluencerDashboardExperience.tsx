"use client";

import {
  ArrowLeft,
  Bank,
  Bell,
  BookOpenText,
  Briefcase,
  CaretDown,
  ChartLineUp,
  Check,
  CheckCircle,
  CirclesFour,
  Clock,
  Copy,
  DownloadSimple,
  FileText,
  GearSix,
  Globe,
  House,
  IdentificationCard,
  Info,
  Lifebuoy,
  LinkSimple,
  LockKey,
  MagicWand,
  MagnifyingGlass,
  Package,
  PaperPlaneTilt,
  Power,
  Receipt,
  ShieldCheck,
  Sparkle,
  Storefront,
  UserCircle,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { Bar, BarChart, Tooltip, XAxis } from "recharts";
import { useInfluencerDashboard } from "../hooks/useInfluencerDashboard";
import { getChannelLabel } from "../mappers/influencerDashboardMapper";
import type {
  CampaignTerms,
  CreatorChannel,
  CreatorProduct,
  GeneratedLink,
  InfluencerCampaignFilter,
  InfluencerDashboardCampaign,
  InfluencerDashboardSection,
  SupportCaseType,
} from "../types";
import styles from "./influencerDashboard.module.css";

const sectionMeta: Record<InfluencerDashboardSection, { title: string; eyebrow: string }> = {
  overview: { title: "Turn your influence into income", eyebrow: "Creator workspace" },
  campaigns: { title: "Find your next campaign", eyebrow: "Approved opportunities" },
  products: { title: "Choose a product. Create your link.", eyebrow: "Products and links" },
  links: { title: "Every link keeps your credit", eyebrow: "Tracked links" },
  earnings: { title: "Know exactly what you earned", eyebrow: "Commission and earnings" },
  transactions: { title: "Follow every eligible sale", eyebrow: "Transactions" },
  payouts: { title: "Get paid with a clear statement", eyebrow: "Payouts and statements" },
  profile: { title: "Keep your creator profile ready", eyebrow: "Profile and compliance" },
  support: { title: "Resolve issues with a clear record", eyebrow: "Support and claims" },
};

const navigation: Array<{
  id: InfluencerDashboardSection;
  label: string;
  icon: typeof House;
}> = [
  { id: "overview", label: "Overview", icon: House },
  { id: "campaigns", label: "Campaigns", icon: Storefront },
  { id: "products", label: "Products and links", icon: Package },
  { id: "links", label: "Tracked links", icon: LinkSimple },
  { id: "earnings", label: "Earnings", icon: ChartLineUp },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "payouts", label: "Payouts", icon: Wallet },
];

const filters: Array<{ id: InfluencerCampaignFilter; label: string; icon: typeof CirclesFour }> = [
  { id: "all", label: "All", icon: CirclesFour },
  { id: "affiliate", label: "Affiliate", icon: Storefront },
  { id: "direct", label: "Direct", icon: Briefcase },
  { id: "high-rate", label: "High rate", icon: Sparkle },
];

const supportOptions: Array<{ value: SupportCaseType; label: string }> = [
  { value: "missing_transaction", label: "Missing transaction" },
  { value: "broken_link", label: "Broken link" },
  { value: "campaign_restriction", label: "Campaign restriction" },
  { value: "traffic_verification", label: "Traffic verification" },
  { value: "payout_support", label: "Payout support" },
];

const disclosureText = "I may earn a commission when you shop through this PrimeStyleAI link.";

function channelTone(channel: CreatorChannel) {
  if (channel === "affiliate_rakuten") return styles.channelRakuten;
  if (channel === "affiliate_awin") return styles.channelAwin;
  return styles.channelDirect;
}

function statusLabel(status: CreatorProduct["status"]) {
  if (status === "active") return "Eligible";
  if (status === "terms_review") return "Terms required";
  if (status === "unavailable") return "Unavailable";
  return "Suspended";
}

function AvatarStack({ images }: { images: string[] }) {
  return (
    <span className={styles.avatarStack} aria-label="Creators already promoting this campaign">
      {images.map((src, index) => (
        <Image key={`${src}-${index}`} src={src} alt="" width={28} height={28} />
      ))}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: CreatorChannel }) {
  return <span className={`${styles.channelBadge} ${channelTone(channel)}`}>{getChannelLabel(channel)}</span>;
}

function CampaignCard({
  campaign,
  selected,
  onSelect,
  onProducts,
}: {
  campaign: InfluencerDashboardCampaign;
  selected: boolean;
  onSelect: () => void;
  onProducts: () => void;
}) {
  return (
    <article className={`${styles.campaignCard} ${styles[campaign.accent]} ${selected ? styles.campaignSelected : ""}`}>
      <button className={styles.campaignSelect} type="button" onClick={onSelect} aria-label={`View ${campaign.title} details`} />
      <div className={styles.cardTopline}>
        <span className={styles.campaignType}>
          {campaign.kind === "direct" ? <Briefcase size={16} weight="bold" /> : <Storefront size={16} weight="bold" />}
          {campaign.kind === "direct" ? "Direct" : campaign.network}
        </span>
        <span className={styles.ratePill}>{campaign.rate}</span>
      </div>
      <div className={styles.cardBody}>
        <p>{campaign.merchant}</p>
        <h2>{campaign.title}</h2>
        <span>{campaign.category} · {campaign.region}</span>
      </div>
      <div className={styles.cardFooter}>
        <span>{campaign.products} approved products</span>
        <AvatarStack images={campaign.avatars} />
        <button type="button" onClick={onProducts} aria-label={`Browse products in ${campaign.title}`}>
          <Package size={17} weight="bold" />
        </button>
      </div>
    </article>
  );
}

function CampaignGrid({
  campaigns,
  selectedCampaignId,
  onSelect,
  onProducts,
}: {
  campaigns: InfluencerDashboardCampaign[];
  selectedCampaignId: string | null;
  onSelect: (campaignId: string) => void;
  onProducts: (campaignId: string) => void;
}) {
  if (campaigns.length === 0) {
    return (
      <div className={styles.emptyState}>
        <MagnifyingGlass size={28} />
        <strong>No approved campaigns match this search.</strong>
        <span>Try a merchant, category, region, or campaign type.</span>
      </div>
    );
  }

  return (
    <div className={styles.campaignGrid}>
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          selected={selectedCampaignId === campaign.id}
          onSelect={() => onSelect(campaign.id)}
          onProducts={() => onProducts(campaign.id)}
        />
      ))}
    </div>
  );
}

function ProductCard({
  product,
  selected,
  termsAccepted,
  priority,
  onSelect,
}: {
  product: CreatorProduct;
  selected: boolean;
  termsAccepted: boolean;
  priority: boolean;
  onSelect: () => void;
}) {
  const canSelect = product.status !== "unavailable" && product.status !== "suspended";
  const needsTermsReview = product.status === "terms_review" && !termsAccepted;
  return (
    <article className={`${styles.productCard} ${selected ? styles.productSelected : ""}`}>
      <div className={styles.productImage}>
        <Image src={product.image} alt={product.title} width={360} height={420} priority={priority} />
        <ChannelBadge channel={product.channel} />
        <span className={`${styles.productStatus} ${styles[`productStatus_${product.status}`]}`}>{statusLabel(product.status)}</span>
      </div>
      <div className={styles.productCopy}>
        <p>{product.merchant}</p>
        <h2>{product.title}</h2>
        <div className={styles.productPrice}><strong>{product.price}</strong><span>{product.rate}</span></div>
        <small>{product.availability} · {product.lastUpdated}</small>
        <span className={styles.productCondition}>{product.rateCondition}</span>
        <button type="button" onClick={onSelect} disabled={!canSelect}>
          {canSelect ? <><LinkSimple size={17} weight="bold" /> {needsTermsReview ? "Review terms & create link" : "Select and create link"}</> : <><LockKey size={17} /> {statusLabel(product.status)}</>}
        </button>
      </div>
    </article>
  );
}

function ProductsPanel({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  return (
    <>
      <div className={styles.productFilters}>
        <div className={styles.filters}>
          {filters.slice(0, 3).map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                type="button"
                className={dashboard.productFilters.channel === filter.id ? styles.filterActive : undefined}
                aria-pressed={dashboard.productFilters.channel === filter.id}
                onClick={() => dashboard.setProductFilter("channel", filter.id as "all" | "affiliate" | "direct")}
              >
                <Icon size={18} weight="bold" />{filter.label}
              </button>
            );
          })}
        </div>
        <label className={styles.search}>
          <MagnifyingGlass size={18} />
          <input value={dashboard.productFilters.search} onChange={(event) => dashboard.setProductFilter("search", event.target.value)} placeholder="Search products" />
        </label>
      </div>
      <div className={styles.selectFilters}>
        <label>Campaign
          <select value={dashboard.productFilters.campaignId} onChange={(event) => dashboard.setProductFilter("campaignId", event.target.value)}>
            <option value="all">All campaigns</option>
            {dashboard.viewModel.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}
          </select>
        </label>
        <label>Category
          <select value={dashboard.productFilters.category} onChange={(event) => dashboard.setProductFilter("category", event.target.value)}>
            <option value="all">All categories</option>
            {dashboard.viewModel.productFilterOptions.categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label>Region
          <select value={dashboard.productFilters.region} onChange={(event) => dashboard.setProductFilter("region", event.target.value)}>
            <option value="all">All regions</option>
            {dashboard.viewModel.productFilterOptions.regions.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </label>
        <label>Commission
          <select value={dashboard.productFilters.rate} onChange={(event) => dashboard.setProductFilter("rate", event.target.value as "any" | "high-rate")}>
            <option value="any">Any rate</option>
            <option value="high-rate">10%+ or $10+</option>
          </select>
        </label>
      </div>
      <div className={styles.sectionLabel}><span>Approved products</span><small>{dashboard.viewModel.products.length} shown</small></div>
      {dashboard.viewModel.products.length ? (
        <div className={styles.productGrid}>
          {dashboard.viewModel.products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              selected={dashboard.selectedProduct?.id === product.id}
              termsAccepted={dashboard.acceptedCampaigns.has(product.campaignId)}
              priority={index < 2}
              onSelect={() => dashboard.selectProduct(product.id)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Package size={30} />
          <strong>No approved products match these filters.</strong>
          <span>Change the campaign, category, region, rate, or channel.</span>
        </div>
      )}
    </>
  );
}

function OverviewMetrics({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  const items = [
    ["Approved campaigns", dashboard.viewModel.summary.approvedCampaigns, "Ready to promote"],
    ["Eligible products", dashboard.viewModel.summary.approvedProducts, "Rights and terms cleared"],
    ["Active links", dashboard.viewModel.summary.activeLinks, "Across both channels"],
    ["Available earnings", dashboard.viewModel.summary.availableBalance, `Next payout ${dashboard.viewModel.summary.nextPayout}`],
  ];
  return (
    <div className={styles.overviewMetrics}>
      {items.map(([label, value, detail]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
    </div>
  );
}

function LinksPanel({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  return (
    <div className={styles.listPanel}>
      <div className={styles.listHeader}><span>Link and product</span><span>Channel</span><span>Performance</span><span>Attribution</span><span>Status</span><span>Actions</span></div>
      {dashboard.viewModel.generatedLinks.map((link) => (
        <article key={link.id} className={`${styles.listRow} ${dashboard.selectedLink?.id === link.id ? styles.listRowSelected : ""}`}>
          <button type="button" className={styles.linkIdentity} onClick={() => dashboard.setSelectedLinkId(link.id)}>
            <span className={styles.listIcon}><LinkSimple size={20} weight="bold" /></span>
            <span><strong>{link.label}</strong><small>{link.product} · {link.merchant}</small></span>
          </button>
          <ChannelBadge channel={link.channel} />
          <div><strong>{link.clicks.toLocaleString()} clicks</strong><small>{link.conversions} conversions</small></div>
          <div><strong>{link.attributionExpiresAt}</strong><small>{link.lastActivity}</small></div>
          <span className={`${styles.status} ${styles[`linkStatus_${link.status}`]}`}>{link.status}</span>
          <div className={styles.rowActions}>
            <button type="button" disabled={link.status === "expired" || link.status === "review"} onClick={() => dashboard.copyText(link.url, link.id)} aria-label={`Copy ${link.label}`}>
              {dashboard.copiedValue === link.id ? <Check size={17} weight="bold" /> : <Copy size={17} />}
            </button>
            <button type="button" disabled={link.status === "expired" || link.status === "review"} onClick={() => dashboard.toggleLinkDisabled(link.id)} aria-label={`${link.status === "disabled" ? "Enable" : "Disable"} ${link.label}`}>
              <Power size={17} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function EarningsPanel({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  const statuses = [
    ["Pending", "$610", "Merchant or network review"],
    ["Validated", "$1,240", "Confirmed eligible"],
    ["Payable", "$820", "Ready for statement"],
    ["Paid", "$8,392", "Lifetime settled"],
    ["Adjusted", "−$84", "Network amendments"],
    ["Reversed", "−$116", "Returns and cancellations"],
  ];
  return (
    <>
      <div className={styles.earningsGrid}>
        <article className={styles.bigBalance}><span>Available balance</span><strong>{dashboard.viewModel.summary.availableBalance}</strong><small>Validated and ready for payout</small><button type="button" onClick={() => dashboard.setSection("payouts")}>View statements</button></article>
        <article><span>Affiliate balance</span><strong>{dashboard.viewModel.summary.affiliateBalance}</strong><small>You receive 100% of commission PrimeStyleAI actually receives on eligible originating-merchant purchases.</small></article>
        <article><span>Direct balance</span><strong>{dashboard.viewModel.summary.directBalance}</strong><small>Direct campaign rates, attribution, and funding stay separate from Rakuten and Awin.</small></article>
        <article><span>Pending validation</span><strong>{dashboard.viewModel.summary.pendingBalance}</strong><small>Estimates are not payable until the controlling source validates the transaction.</small></article>
      </div>
      <section className={styles.statusBreakdown}>
        <div className={styles.panelHeading}><div><strong>Commission status</strong><small>Actual recorded amounts across both separated ledgers</small></div></div>
        <div>{statuses.map(([label, amount, detail]) => <article key={label}><span>{label}</span><strong>{amount}</strong><small>{detail}</small></article>)}</div>
      </section>
    </>
  );
}

function TransactionPanel({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  return (
    <div className={styles.transactionPanel}>
      <div className={styles.transactionHead}><span>Transaction</span><span>Product</span><span>Channel</span><span>Sale</span><span>Rate</span><span>Commission</span><span>Status</span></div>
      {dashboard.viewModel.transactions.map((transaction) => (
        <div className={styles.transactionRow} key={transaction.id}>
          <span><strong>{transaction.id}</strong><small>{transaction.date}</small></span>
          <span><strong>{transaction.product}</strong><small>{transaction.merchant}</small></span>
          <ChannelBadge channel={transaction.channel} />
          <span>{transaction.sale}</span>
          <span>{transaction.rate}</span>
          <span>{transaction.commission}</span>
          <span className={`${styles.status} ${styles[`status${transaction.status}`]}`}>{transaction.status}</span>
        </div>
      ))}
      <div className={styles.trackingNotice}><Info size={19} /><span><strong>Tracking has limits.</strong> Cross-device changes, blocked identifiers, another qualified publisher click, or missing merchant reporting can prevent attribution.</span></div>
      <button type="button" className={styles.supportLink} onClick={() => dashboard.openSupport("missing_transaction")}><Lifebuoy size={18} /> Report a missing transaction</button>
    </div>
  );
}

function PayoutPanel({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  return (
    <>
      <div className={styles.payoutPanel}>
        <article><Wallet size={25} weight="fill" /><span>Next payout</span><strong>{dashboard.viewModel.summary.nextPayout}</strong><small>{dashboard.viewModel.creator.payoutMethod} · {dashboard.viewModel.creator.payoutThreshold}</small></article>
        <article><Bank size={25} weight="fill" /><span>Available</span><strong>{dashboard.viewModel.summary.availableBalance}</strong><small>USD primary · foreign-currency treatment appears on each statement</small></article>
        <article><CheckCircle size={25} weight="fill" /><span>Tax status</span><strong>Ready</strong><small>{dashboard.viewModel.creator.taxStatus} · no action needed</small></article>
      </div>
      <section className={styles.statementPanel}>
        <div className={styles.panelHeading}><div><strong>Payout statements</strong><small>Payments, adjustments, currencies, and transaction counts</small></div></div>
        {dashboard.viewModel.payoutStatements.map((statement) => (
          <article key={statement.id}>
            <span><FileText size={20} /><span><strong>{statement.period}</strong><small>{statement.id}</small></span></span>
            <span><strong>{statement.amount}</strong><small>{statement.currency}</small></span>
            <span><strong>{statement.transactions}</strong><small>transactions</small></span>
            <span><strong>{statement.adjustments}</strong><small>adjustments</small></span>
            <span className={`${styles.status} ${statement.status === "Paid" ? styles.statusPaid : styles.statusPending}`}>{statement.status}</span>
            <button type="button"><DownloadSimple size={18} /> Download</button>
          </article>
        ))}
      </section>
    </>
  );
}

function ProfilePanel({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  return (
    <div className={styles.profileLayout}>
      <section className={styles.profileSummary}>
        <div className={styles.profileIdentity}>
          <Image src={dashboard.viewModel.creator.avatar} alt={dashboard.viewModel.creator.name} width={72} height={72} />
          <div><strong>{dashboard.viewModel.creator.name}</strong><small>{dashboard.viewModel.creator.role} · {dashboard.viewModel.creator.country}</small></div>
          <span>{dashboard.viewModel.creator.readiness}% ready</span>
        </div>
        <div className={styles.profileFacts}>
          <article><IdentificationCard size={21} /><span>Publisher ID</span><strong>{dashboard.viewModel.creator.publisherId}</strong></article>
          <article><ShieldCheck size={21} /><span>Tax status</span><strong>{dashboard.viewModel.creator.taxStatus}</strong></article>
          <article><Bank size={21} /><span>Payout method</span><strong>{dashboard.viewModel.creator.payoutMethod}</strong></article>
        </div>
        <div className={styles.propertyList}><strong>Approved promotional properties</strong>{dashboard.viewModel.creator.properties.map((property) => <span key={property}><Globe size={17} />{property}<CheckCircle size={17} weight="fill" /></span>)}</div>
      </section>
      <section className={styles.profileChecklist}>
        {dashboard.viewModel.profileChecklist.map((item) => (
          <article key={item.label}>
            <span className={item.complete ? styles.completeCheck : styles.openCheck}>{item.complete ? <Check size={16} weight="bold" /> : null}</span>
            <div><strong>{item.label}</strong><small>{item.detail}</small></div>
            <button type="button">{item.complete ? "View" : "Complete"}</button>
          </article>
        ))}
      </section>
      <section className={styles.disclosureCard}><ShieldCheck size={24} weight="fill" /><div><strong>Current disclosure language</strong><p>{disclosureText}</p><small>Use it clearly and conspicuously wherever you may earn compensation.</small></div><button type="button" onClick={() => dashboard.copyText(disclosureText, "profile-disclosure")}>{dashboard.copiedValue === "profile-disclosure" ? <Check size={17} /> : <Copy size={17} />} Copy</button></section>
    </div>
  );
}

function SupportPanel({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  return (
    <div className={styles.supportLayout}>
      <section className={styles.supportForm}>
        <div className={styles.panelHeading}><div><strong>Open a support case</strong><small>Create an auditable record for the correct operations team</small></div></div>
        {dashboard.submittedCase ? <div className={styles.successMessage}><CheckCircle size={22} weight="fill" /><span><strong>{dashboard.submittedCase} created</strong><small>Your case is now in the operations queue.</small></span></div> : null}
        <label>Issue type<select value={dashboard.supportType} onChange={(event) => dashboard.setSupportType(event.target.value as SupportCaseType)}>{supportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Order, transaction, link, or campaign reference<input value={dashboard.supportReference} onChange={(event) => dashboard.setSupportReference(event.target.value)} placeholder="Example: TX-8342 or Maison Rue campaign" /></label>
        <label>What happened?<textarea value={dashboard.supportDetails} onChange={(event) => dashboard.setSupportDetails(event.target.value)} placeholder="Describe the issue and include dates, the shopper journey, and any supporting context." /></label>
        <button type="button" onClick={dashboard.submitSupport} disabled={!dashboard.supportReference.trim() || !dashboard.supportDetails.trim()}><PaperPlaneTilt size={18} weight="bold" /> Submit case</button>
      </section>
      <section className={styles.caseList}>
        <div className={styles.panelHeading}><div><strong>Your cases</strong><small>Open and historical support records</small></div></div>
        {dashboard.viewModel.supportCases.map((supportCase) => <article key={supportCase.id}><span><Lifebuoy size={19} /></span><div><strong>{supportCase.subject}</strong><small>{supportCase.id} · {supportCase.updatedAt}</small></div><span className={`${styles.status} ${supportCase.status === "Resolved" ? styles.statusPaid : styles.statusPending}`}>{supportCase.status}</span></article>)}
      </section>
      <section className={styles.noticeList}>
        <div className={styles.panelHeading}><div><strong>Notices</strong><small>Rate, campaign, payout, and compliance updates</small></div></div>
        {dashboard.viewModel.notices.map((notice) => <article key={notice.id} className={styles[`notice_${notice.tone}`]}><span>{notice.tone === "warning" ? <WarningCircle size={19} weight="fill" /> : notice.tone === "success" ? <CheckCircle size={19} weight="fill" /> : <Info size={19} weight="fill" />}</span><div><strong>{notice.title}</strong><small>{notice.detail}</small></div><time>{notice.date}</time></article>)}
      </section>
    </div>
  );
}

function CampaignDetail({
  campaign,
  terms,
  accepted,
  onAccept,
  onProducts,
}: {
  campaign: InfluencerDashboardCampaign;
  terms: CampaignTerms | null;
  accepted: boolean;
  onAccept: () => void;
  onProducts: () => void;
}) {
  return (
    <section className={styles.detailPanel}>
      <span className={styles.detailIcon}>{campaign.kind === "direct" ? <Briefcase size={22} weight="fill" /> : <Storefront size={22} weight="fill" />}</span>
      <ChannelBadge channel={campaign.channel} />
      <h2>{campaign.title}</h2>
      <p>{campaign.merchant} · {campaign.category} · {campaign.region}</p>
      <div className={styles.detailRate}><span>Campaign rate</span><strong>{campaign.rate}</strong><small>{campaign.condition}</small></div>
      <dl>
        <div><dt>Attribution</dt><dd>{terms?.attributionWindow}</dd></div>
        <div><dt>Eligible products</dt><dd>{terms?.eligibleProducts}</dd></div>
        <div><dt>Rate type</dt><dd>{terms?.rateType}</dd></div>
        <div><dt>Assets</dt><dd>{terms?.assetCount} approved</dd></div>
      </dl>
      <div className={styles.restrictions}><strong>Material conditions</strong>{terms?.restrictions.map((restriction) => <span key={restriction}><Check size={14} />{restriction}</span>)}</div>
      {campaign.kind === "direct" && !accepted ? <div className={styles.termsCallout}><LockKey size={19} /><span><strong>Direct campaign terms required</strong><small>Accept the separate Direct Publisher Campaign Terms before creating links.</small></span><button type="button" onClick={onAccept}>Accept terms</button></div> : <div className={styles.approvedCallout}><CheckCircle size={19} weight="fill" /><span><strong>Approved to promote</strong><small>Terms accepted · updated {terms?.lastUpdated}</small></span></div>}
      <button className={styles.primaryAction} type="button" onClick={onProducts}><Package size={18} weight="bold" /> Browse approved products</button>
    </section>
  );
}

function LinkBuilder({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  const product = dashboard.selectedProduct;
  if (!product) {
    return <div className={styles.builderEmpty}><span><Package size={28} /></span><strong>Select an approved product</strong><p>Choose a product to see its commission conditions, disclosure, campaign assets, and tracked-link builder.</p></div>;
  }
  const termsAccepted = dashboard.acceptedCampaigns.has(product.campaignId);
  const trackingCopy = product.channel === "direct_connected"
    ? "PrimeStyleAI click/session tracking is attached. No Rakuten or Awin fields are used."
    : `${product.network} subpublisher transparency is attached server-side without personal data in the URL.`;
  return (
    <section className={styles.linkBuilder}>
      <div className={styles.builderProduct}>
        <Image src={product.image} alt={product.title} width={110} height={130} />
        <div><ChannelBadge channel={product.channel} /><strong>{product.title}</strong><small>{product.merchant} · {product.price}</small></div>
      </div>
      <div className={styles.builderFacts}>
        <span><strong>{product.rate}</strong><small>{product.rateCondition}</small></span>
        <span><strong>{product.estimatedEarning ?? "Confirmed later"}</strong><small>Estimated earning</small></span>
      </div>
      <p className={styles.liveTruth}><Clock size={16} /> {product.availability} · {product.lastUpdated}. The live merchant destination controls.</p>
      {product.status === "terms_review" && !termsAccepted ? <div className={styles.termsCallout}><LockKey size={19} /><span><strong>Accept direct campaign terms</strong><small>This campaign is separate from all Rakuten and Awin rules.</small></span><button type="button" onClick={() => dashboard.acceptCampaignTerms(product.campaignId)}>Accept terms</button></div> : null}
      {product.status === "unavailable" || product.status === "suspended" ? <div className={styles.blockedCallout}><WarningCircle size={19} /><span><strong>Link generation blocked</strong><small>{product.availability}. Historical links remain visible for reconciliation.</small></span></div> : null}
      <label className={styles.builderField}>Link label<input value={dashboard.linkLabel} onChange={(event) => dashboard.setLinkLabel(event.target.value)} placeholder="Name this promotion" /></label>
      <label className={styles.builderField}>Required disclosure<div className={styles.disclosureInput}><span>{disclosureText}</span><button type="button" onClick={() => dashboard.copyText(disclosureText, "builder-disclosure")} aria-label="Copy disclosure">{dashboard.copiedValue === "builder-disclosure" ? <Check size={16} /> : <Copy size={16} />}</button></div></label>
      <div className={styles.assetRow}><span><FileText size={18} />{product.assetCount} approved campaign assets</span><button type="button">View assets</button></div>
      <div className={styles.trackingInfo}><ShieldCheck size={18} weight="fill" /><span>{trackingCopy}</span></div>
      <button className={styles.generateButton} type="button" onClick={dashboard.generateSelectedLink} disabled={!dashboard.canGenerateSelectedLink || !dashboard.linkLabel.trim()}><LinkSimple size={18} weight="bold" /> Generate tracked link</button>
      {dashboard.generatedUrl ? <div className={styles.generatedResult}><CheckCircle size={20} weight="fill" /><span><strong>Link ready</strong><small>{dashboard.generatedUrl}</small></span><button type="button" onClick={() => dashboard.copyText(dashboard.generatedUrl ?? "", "generated-url")}>{dashboard.copiedValue === "generated-url" ? <Check size={17} /> : <Copy size={17} />}</button></div> : null}
      <small className={styles.sellerNote}>{product.seller} · destination: {product.productDestination}</small>
    </section>
  );
}

function LinkDetail({ dashboard, link }: { dashboard: ReturnType<typeof useInfluencerDashboard>; link: GeneratedLink }) {
  return (
    <section className={styles.detailPanel}>
      <span className={styles.detailIcon}><LinkSimple size={22} weight="bold" /></span>
      <ChannelBadge channel={link.channel} />
      <h2>{link.label}</h2>
      <p>{link.product} · {link.merchant}</p>
      <div className={styles.linkUrl}><span>{link.url}</span><button type="button" disabled={link.status === "expired" || link.status === "review"} onClick={() => dashboard.copyText(link.url, `detail-${link.id}`)}>{dashboard.copiedValue === `detail-${link.id}` ? <Check size={16} /> : <Copy size={16} />}</button></div>
      <dl>
        <div><dt>Campaign</dt><dd>{link.campaign}</dd></div>
        <div><dt>Clicks</dt><dd>{link.clicks.toLocaleString()}</dd></div>
        <div><dt>Conversions</dt><dd>{link.conversions}</dd></div>
        <div><dt>Attribution</dt><dd>{link.attributionExpiresAt}</dd></div>
      </dl>
      <div className={styles.trackingInfo}><ShieldCheck size={18} weight="fill" /><span>{link.channel === "direct_connected" ? "Direct click/session ledger only; no network subpublisher fields." : "Affiliate network reporting controls transaction eligibility and commission."}</span></div>
      <button className={styles.primaryAction} type="button" disabled={link.status === "expired" || link.status === "review"} onClick={() => dashboard.toggleLinkDisabled(link.id)}><Power size={18} /> {link.status === "disabled" ? "Enable link" : "Disable link"}</button>
    </section>
  );
}

function DefaultInsights({ dashboard }: { dashboard: ReturnType<typeof useInfluencerDashboard> }) {
  return (
    <>
      <div className={styles.insightTopbar}>
        <button type="button" aria-label="Notifications" onClick={() => dashboard.setSection("support")}><Bell size={19} /></button>
        <button type="button" aria-label="Settings" onClick={() => dashboard.setSection("profile")}><GearSix size={20} /></button>
      </div>
      <Image className={styles.profileAvatar} src={dashboard.viewModel.creator.avatar} alt={dashboard.viewModel.creator.name} width={66} height={66} priority />
      <strong className={styles.profileName}>{dashboard.viewModel.creator.name}</strong>
      <span className={styles.profileRole}>{dashboard.viewModel.creator.role}</span>
      <button type="button" className={styles.readiness} onClick={() => dashboard.setSection("profile")}>
        <span><UserCircle size={21} weight="bold" /></span><strong>{dashboard.viewModel.creator.readiness}% ready</strong><small>{dashboard.viewModel.creator.community} creator peers</small><CaretDown size={15} />
      </button>
      <section className={styles.activityCard}>
        <div className={styles.activityHeading}><span>Activity</span><button type="button">6 months <CaretDown size={12} /></button></div>
        <strong>24.8K <small>clicks</small></strong>
        <p><ChartLineUp size={15} weight="bold" /> 18.4% above last period</p>
        <div className={styles.chart} aria-label="Creator activity chart">
          <BarChart width={282} height={126} data={dashboard.viewModel.activity} barCategoryGap="18%">
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#686b73" }} />
            <Tooltip cursor={{ fill: "rgba(33,84,239,.05)" }} contentStyle={{ border: "0", borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="clicks" stackId="activity" fill="#2154EF" radius={[0, 0, 4, 4]} />
            <Bar dataKey="sales" stackId="activity" fill="#6035F2" />
            <Bar dataKey="paid" stackId="activity" fill="#FF9B50" radius={[8, 8, 0, 0]} />
          </BarChart>
        </div>
      </section>
      <section className={styles.balanceCard}><span>Available earnings</span><strong>{dashboard.viewModel.summary.availableBalance}</strong><small>Next payout · {dashboard.viewModel.summary.nextPayout}</small><button type="button" onClick={() => dashboard.setSection("payouts")}>View payout</button></section>
      <section className={styles.quickActions}><span>Quick actions</span><button type="button" onClick={() => dashboard.setSection("products")}><Package size={19} /> Select product & create link</button><button type="button" onClick={() => dashboard.setSection("links")}><LinkSimple size={19} /> Manage links</button><button type="button" onClick={() => dashboard.openSupport("missing_transaction")}><BookOpenText size={19} /> Report missing sale</button></section>
    </>
  );
}

export function InfluencerDashboardExperience() {
  const dashboard = useInfluencerDashboard();
  const meta = sectionMeta[dashboard.section];
  const showCampaignControls = dashboard.section === "overview" || dashboard.section === "campaigns";

  return (
    <main className={styles.stage}>
      <section className={styles.dashboard} aria-label="PrimeStyleAI influencer dashboard UI preview">
        <aside className={styles.sidebar}>
          <Link href="/influencers" className={styles.brand} aria-label="Back to PrimeStyleAI influencers"><Image src="/icon.svg" alt="PrimeStyleAI" width={42} height={42} priority /></Link>
          <nav className={styles.primaryNav} aria-label="Creator dashboard">
            {navigation.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} type="button" title={item.label} aria-label={item.label} aria-pressed={dashboard.section === item.id} className={dashboard.section === item.id ? styles.navActive : undefined} onClick={() => dashboard.setSection(item.id)}><Icon size={21} weight={dashboard.section === item.id ? "fill" : "regular"} /></button>;
            })}
            <Link href="/influencers/dashboard/outfit-studio" className={styles.studioNavLink} title="Outfit Studio" aria-label="Outfit Studio"><MagicWand size={21} /></Link>
          </nav>
          <div className={styles.sidebarBottom}>
            <button type="button" title="Support and claims" aria-label="Support and claims" aria-pressed={dashboard.section === "support"} onClick={() => dashboard.setSection("support")}><Lifebuoy size={21} /></button>
            <button type="button" title="Profile and compliance" aria-label="Profile and compliance" aria-pressed={dashboard.section === "profile"} onClick={() => dashboard.setSection("profile")}><GearSix size={21} /></button>
            <button type="button" className={styles.miniAvatar} title="Creator profile" aria-label="Creator profile" onClick={() => dashboard.setSection("profile")}><Image src={dashboard.viewModel.creator.avatar} alt="" width={36} height={36} /></button>
          </div>
        </aside>

        <section className={styles.workspace}>
          <header className={styles.workspaceHeader}>
            <Link href="/influencers" aria-label="Back to influencer page"><ArrowLeft size={19} /></Link>
            <span>{dashboard.section === "overview" ? "Creator workspace" : `Creator workspace · ${meta.eyebrow}`}</span>
            <button type="button" aria-label="Notifications" onClick={() => dashboard.setSection("support")}><Bell size={20} /><i /></button>
          </header>

          <section className={styles.mainColumn}>
            <p className={styles.eyebrow}>{meta.eyebrow}</p>
            <h1>{meta.title}</h1>

            {dashboard.section === "overview" ? <OverviewMetrics dashboard={dashboard} /> : null}

            {showCampaignControls ? (
              <>
                <div className={styles.discoveryBar}>
                  <div className={styles.filters}>
                    {filters.map((filter) => {
                      const Icon = filter.icon;
                      return <button key={filter.id} type="button" className={dashboard.campaignFilter === filter.id ? styles.filterActive : undefined} aria-pressed={dashboard.campaignFilter === filter.id} onClick={() => dashboard.setCampaignFilter(filter.id)}><Icon size={18} weight="bold" />{filter.label}</button>;
                    })}
                  </div>
                  <label className={styles.search}><MagnifyingGlass size={18} /><input value={dashboard.campaignSearch} onChange={(event) => dashboard.setCampaignSearch(event.target.value)} placeholder="Search campaigns" /></label>
                </div>
                <div className={styles.sectionLabel}><span>{dashboard.section === "overview" ? "Most promising" : "Approved campaigns"}</span><small>{dashboard.viewModel.campaigns.length} available</small></div>
                <CampaignGrid campaigns={dashboard.viewModel.campaigns} selectedCampaignId={dashboard.selectedCampaign?.id ?? null} onSelect={dashboard.selectCampaign} onProducts={dashboard.openProductsForCampaign} />
              </>
            ) : null}

            {dashboard.section === "products" ? <ProductsPanel dashboard={dashboard} /> : null}
            {dashboard.section === "links" ? <LinksPanel dashboard={dashboard} /> : null}
            {dashboard.section === "earnings" ? <EarningsPanel dashboard={dashboard} /> : null}
            {dashboard.section === "transactions" ? <TransactionPanel dashboard={dashboard} /> : null}
            {dashboard.section === "payouts" ? <PayoutPanel dashboard={dashboard} /> : null}
            {dashboard.section === "profile" ? <ProfilePanel dashboard={dashboard} /> : null}
            {dashboard.section === "support" ? <SupportPanel dashboard={dashboard} /> : null}
          </section>

          <aside className={styles.insightPanel}>
            {dashboard.section === "products" ? <LinkBuilder dashboard={dashboard} /> : dashboard.section === "links" && dashboard.selectedLink ? <LinkDetail dashboard={dashboard} link={dashboard.selectedLink} /> : (dashboard.section === "overview" || dashboard.section === "campaigns") && dashboard.selectedCampaign ? <CampaignDetail campaign={dashboard.selectedCampaign} terms={dashboard.selectedCampaignTerms} accepted={dashboard.acceptedCampaigns.has(dashboard.selectedCampaign.id)} onAccept={() => dashboard.acceptCampaignTerms(dashboard.selectedCampaign?.id ?? "")} onProducts={() => dashboard.openProductsForCampaign(dashboard.selectedCampaign?.id ?? "")} /> : <DefaultInsights dashboard={dashboard} />}
          </aside>
        </section>
      </section>
    </main>
  );
}
