import {
  ArrowUpRight,
  ChartLineUp,
  CheckCircle,
  CursorClick,
  Handshake,
  InstagramLogo,
  LinkSimple,
  MagicWand,
  SealCheck,
  ShoppingBagOpen,
  Sparkle,
  Storefront,
  ThreadsLogo,
  TiktokLogo,
  TrendUp,
  Wallet,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useCreatorLanguage } from "../../i18n/CreatorLanguageProvider";
import styles from "./influencerLanding.module.css";

const PROFILE_PRODUCTS = [
  {
    name: "Sunlight cardigan",
    merchant: "Maison Rue",
    price: "$118",
    image: "/media/influencer-dashboard/products/sunlight-cardigan.webp",
  },
  {
    name: "Coastal stripe",
    merchant: "Maison Rue",
    price: "$126",
    image: "/media/influencer-dashboard/products/coastal-stripe-cardigan.webp",
  },
  {
    name: "Organic cotton tee",
    merchant: "Blue Standard",
    price: "$68",
    image: "/media/influencer-dashboard/products/cotton-tshirt.webp",
  },
] as const;

const PROFILE_PATH = [
  { number: "01", title: "They discover", body: "Your films, looks, and edit live in one public profile." },
  { number: "02", title: "They try it on", body: "Virtual try-on and AI sizing help them choose with confidence." },
  { number: "03", title: "They purchase", body: "Checkout stays with the merchant through your tracked journey." },
  { number: "04", title: "You earn", body: "Eligible, validated purchases become creator commission." },
] as const;

const PROFILE_CHANNELS = [
  { name: "Instagram", icon: InstagramLogo, tone: "instagram" },
  { name: "TikTok", icon: TiktokLogo, tone: "tiktok" },
  { name: "Threads", icon: ThreadsLogo, tone: "threads" },
] as const;

const DASHBOARD_STATS = [
  { label: "Shoppable sales", value: "$8,420", change: "+18.4%", tone: "peach", icon: ShoppingBagOpen },
  { label: "Creator commission", value: "$2,460", change: "+24%", tone: "mint", icon: Wallet },
  { label: "Tracked clicks", value: "18.7K", change: "+11%", tone: "lavender", icon: CursorClick },
  { label: "Conversion rate", value: "6.8%", change: "+0.9%", tone: "sun", icon: ChartLineUp },
] as const;

const PERFORMANCE_BARS = [
  { day: "Mon", clicks: 48, sales: 27 },
  { day: "Tue", clicks: 63, sales: 38 },
  { day: "Wed", clicks: 56, sales: 42 },
  { day: "Thu", clicks: 78, sales: 54 },
  { day: "Fri", clicks: 68, sales: 47 },
  { day: "Sat", clicks: 91, sales: 66 },
  { day: "Sun", clicks: 82, sales: 61 },
] as const;

const CHANNEL_RESULTS = [
  { name: "Instagram", value: "9.8K", conversion: "7.4%", icon: InstagramLogo, tone: "instagram" },
  { name: "TikTok", value: "6.1K", conversion: "5.9%", icon: TiktokLogo, tone: "tiktok" },
  { name: "Creator link", value: "2.8K", conversion: "8.1%", icon: LinkSimple, tone: "link" },
] as const;

const MERCHANT_CONNECTIONS = [
  { name: "Maison Rue", campaign: "Summer style edit", rate: "8%", tone: "rose" },
  { name: "Atelier North", campaign: "Modern workwear week", rate: "12%", tone: "orange" },
  { name: "Blue Standard", campaign: "Everyday essentials", rate: "6–10%", tone: "violet" },
] as const;

export function InfluencerProfileDashboardStory({ onCtaClick }: { onCtaClick: () => void }) {
  const { t } = useCreatorLanguage();

  return (
    <>
      <section
        id="public-profile"
        className={styles.publicProfileStory}
        aria-labelledby="public-profile-title"
      >
        <div className={styles.profileStoryCopy}>
          <span className={styles.storyEyebrow}>{t("Your public, shoppable profile")}</span>
          <h2 id="public-profile-title">
            {t("Your profile becomes")} <em>{t("their fitting room.")}</em>
          </h2>
          <p>
            {t("Your audience can discover your style, open the products you recommend, try them on virtually, and continue to the merchant to buy. When an eligible purchase is validated, the commission is credited to you.")}
          </p>
          <p className={styles.profileBenefitNote}>
            <ShoppingBagOpen size={18} weight="bold" /> {t("A shoppable creator page featuring your approved looks is included with your creator account.")}
          </p>
          <ol className={styles.profilePath}>
            {PROFILE_PATH.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <div><strong>{t(step.title)}</strong><small>{t(step.body)}</small></div>
              </li>
            ))}
          </ol>
          <button type="button" className={styles.storyCta} onClick={onCtaClick}>
            {t("See a public creator profile")} <ArrowUpRight size={18} weight="bold" />
          </button>
        </div>

        <div className={styles.profileShowcase} aria-label={t("Preview of Maya Laurent's public shoppable profile")}>
          <header className={styles.profileShowcaseHeader}>
            <Image
              className={styles.profileShowcaseLogo}
              src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
              alt="PrimeStyleAI"
              width={34}
              height={34}
            />
          </header>

          <div className={styles.profileShowcaseHero}>
            <div className={styles.profileShowcasePortrait}>
              <Image
                src="/media/partner-landing/optimized/creator-match-maya.webp"
                alt={t("Maya Laurent wearing an orange fashion look")}
                fill
                sizes="(max-width: 980px) 86vw, 34vw"
              />
              <small>{t("Paris cover · August")}</small>
            </div>
            <div className={styles.profileShowcaseIdentity}>
              <span className={styles.profileEdition}>{t("Living shoppable lookbook")}</span>
              <h3>Maya Laurent <SealCheck size={20} weight="fill" aria-label={t("Verified creator")} /></h3>
              <p>@mayalaurent · {t("Paris, France")}</p>
              <blockquote>{t("“Timeless pieces. Effortless days. Style that feels like you.”")}</blockquote>
              <div className={styles.profileShowcaseStats}>
                <span><strong>248K</strong><small>{t("followers")}</small></span>
                <span><strong>10</strong><small>{t("new stories")}</small></span>
              </div>
              <div
                className={styles.profileActiveChannels}
                aria-label={t("Maya Laurent is active on Instagram, TikTok, and Threads")}
              >
                <span>{t("Active channels")}</span>
                <div>
                  {PROFILE_CHANNELS.map(({ name, icon: Icon, tone }) => (
                    <span className={styles.profileChannel} data-platform={tone} key={name}>
                      <Icon size={16} weight="fill" aria-hidden />
                      <strong>{name}</strong>
                      <small><i /> {t("Active")}</small>
                    </span>
                  ))}
                </div>
              </div>
              <aside className={styles.profileCommissionReceipt}>
                <span><CheckCircle size={17} weight="fill" /> {t("Eligible purchase")}</span>
                <strong>+$9.44</strong>
                <small>{t("Commission · pending validation")}</small>
              </aside>
            </div>
          </div>

          <div className={styles.profileShelf}>
            <div className={styles.profileShelfHeading}>
              <span>{t("Shop Maya's edit")}</span>
              <small>{t("Try on before you buy")}</small>
            </div>
            <div className={styles.profileShelfGrid}>
              {PROFILE_PRODUCTS.map((product) => (
                <article key={product.name}>
                  <div className={styles.profileProductImage}>
                    <Image src={product.image} alt={t(product.name)} fill sizes="150px" />
                  </div>
                  <div>
                    <strong>{t(product.name)}</strong>
                    <small>{product.merchant} · {product.price}</small>
                    <button type="button" onClick={onCtaClick}>
                      <MagicWand size={13} weight="bold" /> {t("Try it on")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

        </div>
      </section>

      <section
        id="creator-dashboard"
        className={styles.creatorDashboardStory}
        aria-label={t("Creator dashboard analytics preview")}
      >
        <div className={styles.dashboardShowcase} aria-label={t("Preview of the PrimeStyleAI creator dashboard")}>
          <header className={styles.dashboardShowcaseHeader}>
            <div className={styles.dashboardGreeting}>
              <span>{t("Creator workspace")}</span>
              <strong>{t("Your week is growing")} <Sparkle size={18} weight="fill" /></strong>
              <small>{t("Live campaign performance · updated 2 min ago")}</small>
            </div>
            <div className={styles.dashboardCreator}><Image src="/media/partner-landing/optimized/avatar-elena-96.webp" alt="" width={38} height={38} /><span><strong>Elena Rivera</strong><small>{t("Fashion creator")}</small></span></div>
          </header>

          <div className={styles.dashboardSummary}>
            {DASHBOARD_STATS.map(({ label, value, change, tone, icon: Icon }) => (
              <article key={label} data-tone={tone}>
                <Icon size={19} weight="bold" />
                <span>{t(label)}</span>
                <strong>{value}</strong>
                <small><TrendUp size={12} weight="bold" /> {t("{change} this month", { change })}</small>
              </article>
            ))}
          </div>

          <div className={styles.dashboardAnalytics}>
            <article className={styles.performanceCard}>
              <header><div><span>{t("Performance")}</span><strong>{t("Clicks that became sales")}</strong></div><small>{t("Last 7 days")}</small></header>
              <div className={styles.performanceTotal}><strong>1,284</strong><span><TrendUp size={13} weight="bold" /> 16.8%</span></div>
              <div className={styles.performanceChart} aria-label={t("Seven-day clicks and sales chart")}>
                {PERFORMANCE_BARS.map((bar, index) => (
                  <span key={`${bar.day}-${index}`}>
                    <i style={{ height: `${bar.clicks}%` }}><b style={{ height: `${bar.sales}%` }} /></i>
                    <small>{t(bar.day)}</small>
                  </span>
                ))}
              </div>
              <footer><span><i data-series="clicks" />{t("Clicks")}</span><span><i data-series="sales" />{t("Sales")}</span></footer>
            </article>

            <article className={styles.channelCard}>
              <header><span>{t("Channel results")}</span><small>{t("Tracked traffic")}</small></header>
              <div>
                {CHANNEL_RESULTS.map(({ name, value, conversion, icon: Icon, tone }) => (
                  <div key={name} data-tone={tone}>
                    <span><Icon size={16} weight="bold" /></span>
                    <p><strong>{t(name)}</strong><small>{t("{value} clicks", { value })}</small></p>
                    <b>{conversion}</b>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className={styles.dashboardWorkspace}>
            <article className={styles.merchantConnections}>
              <header>
                <span><Handshake size={19} weight="bold" /> {t("Connect with merchants")}</span>
                <small>{t("3 new opportunities")}</small>
              </header>
              <p className={styles.merchantConnectionsIntro}>
                {t("Discover merchants and products from connected brands.")}
              </p>
              <div>
                {MERCHANT_CONNECTIONS.map((merchant) => (
                  <div key={merchant.name} data-tone={merchant.tone}>
                    <span><Storefront size={16} weight="bold" /></span>
                    <p><strong>{merchant.name}</strong><small>{t(merchant.campaign)}</small></p>
                    <b>{merchant.rate}</b>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.commissionTracker}>
              <header><span>{t("Commission tracker")}</span><small>{t("August")}</small></header>
              <strong>$2,460</strong>
              <p>{t("Available earnings")}</p>
              <div className={styles.commissionStatuses}>
                <span><i data-status="validated" />{t("Validated")} <b>$1,680</b></span>
                <span><i data-status="pending" />{t("Pending")} <b>$824</b></span>
                <span><i data-status="paid" />{t("Paid this month")} <b>$3,190</b></span>
              </div>
              <button type="button" onClick={onCtaClick}><Wallet size={15} weight="bold" /> {t("View payout")}</button>
            </article>
          </div>

          <button type="button" className={styles.dashboardOpenCta} onClick={onCtaClick}>
            {t("Open your creator dashboard")} <ArrowUpRight size={17} weight="bold" />
          </button>
        </div>
      </section>
    </>
  );
}
