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
  { day: "M", clicks: 48, sales: 27 },
  { day: "T", clicks: 63, sales: 38 },
  { day: "W", clicks: 56, sales: 42 },
  { day: "T", clicks: 78, sales: 54 },
  { day: "F", clicks: 68, sales: 47 },
  { day: "S", clicks: 91, sales: 66 },
  { day: "S", clicks: 82, sales: 61 },
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
  return (
    <>
      <section
        id="public-profile"
        className={styles.publicProfileStory}
        aria-labelledby="public-profile-title"
      >
        <div className={styles.profileStoryCopy}>
          <span className={styles.storyEyebrow}>Your public, shoppable profile</span>
          <h2 id="public-profile-title">
            Your profile becomes <em>their fitting room.</em>
          </h2>
          <p>
            Your audience can discover your style, open the products you recommend, try them on
            virtually, and continue to the merchant to buy. When an eligible purchase is
            validated, the commission is credited to you.
          </p>
          <p className={styles.profileBenefitNote}>
            <ShoppingBagOpen size={18} weight="bold" /> A shoppable creator page featuring your
            approved looks is included with your creator account.
          </p>
          <ol className={styles.profilePath}>
            {PROFILE_PATH.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <div><strong>{step.title}</strong><small>{step.body}</small></div>
              </li>
            ))}
          </ol>
          <button type="button" className={styles.storyCta} onClick={onCtaClick}>
            See a public creator profile <ArrowUpRight size={18} weight="bold" />
          </button>
        </div>

        <div className={styles.profileShowcase} aria-label="Preview of Maya Laurent's public shoppable profile">
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
                alt="Maya Laurent wearing an orange fashion look"
                fill
                sizes="(max-width: 980px) 86vw, 34vw"
              />
              <small>Paris cover · August</small>
            </div>
            <div className={styles.profileShowcaseIdentity}>
              <span className={styles.profileEdition}>Living shoppable lookbook</span>
              <h3>Maya Laurent <SealCheck size={20} weight="fill" aria-label="Verified creator" /></h3>
              <p>@mayalaurent · Paris, France</p>
              <blockquote>“Timeless pieces. Effortless days. Style that feels like you.”</blockquote>
              <div className={styles.profileShowcaseStats}>
                <span><strong>248K</strong><small>followers</small></span>
                <span><strong>10</strong><small>new stories</small></span>
              </div>
              <div
                className={styles.profileActiveChannels}
                aria-label="Maya Laurent is active on Instagram, TikTok, and Threads"
              >
                <span>Active channels</span>
                <div>
                  {PROFILE_CHANNELS.map(({ name, icon: Icon, tone }) => (
                    <span className={styles.profileChannel} data-platform={tone} key={name}>
                      <Icon size={16} weight="fill" aria-hidden />
                      <strong>{name}</strong>
                      <small><i /> Active</small>
                    </span>
                  ))}
                </div>
              </div>
              <aside className={styles.profileCommissionReceipt}>
                <span><CheckCircle size={17} weight="fill" /> Eligible purchase</span>
                <strong>+$9.44</strong>
                <small>Commission · pending validation</small>
              </aside>
            </div>
          </div>

          <div className={styles.profileShelf}>
            <div className={styles.profileShelfHeading}>
              <span>Shop Maya&apos;s edit</span>
              <small>Try on before you buy</small>
            </div>
            <div className={styles.profileShelfGrid}>
              {PROFILE_PRODUCTS.map((product) => (
                <article key={product.name}>
                  <div className={styles.profileProductImage}>
                    <Image src={product.image} alt={product.name} fill sizes="150px" />
                  </div>
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.merchant} · {product.price}</small>
                    <button type="button" onClick={onCtaClick}>
                      <MagicWand size={13} weight="bold" /> Try it on
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
        aria-label="Creator dashboard analytics preview"
      >
        <div className={styles.dashboardShowcase} aria-label="Preview of the PrimeStyleAI creator dashboard">
          <header className={styles.dashboardShowcaseHeader}>
            <div className={styles.dashboardGreeting}>
              <span>Creator workspace</span>
              <strong>Your week is growing <Sparkle size={18} weight="fill" /></strong>
              <small>Live campaign performance · updated 2 min ago</small>
            </div>
            <div className={styles.dashboardCreator}><Image src="/media/partner-landing/optimized/avatar-elena-96.webp" alt="" width={38} height={38} /><span><strong>Elena Rivera</strong><small>Fashion creator</small></span></div>
          </header>

          <div className={styles.dashboardSummary}>
            {DASHBOARD_STATS.map(({ label, value, change, tone, icon: Icon }) => (
              <article key={label} data-tone={tone}>
                <Icon size={19} weight="bold" />
                <span>{label}</span>
                <strong>{value}</strong>
                <small><TrendUp size={12} weight="bold" /> {change} this month</small>
              </article>
            ))}
          </div>

          <div className={styles.dashboardAnalytics}>
            <article className={styles.performanceCard}>
              <header><div><span>Performance</span><strong>Clicks that became sales</strong></div><small>Last 7 days</small></header>
              <div className={styles.performanceTotal}><strong>1,284</strong><span><TrendUp size={13} weight="bold" /> 16.8%</span></div>
              <div className={styles.performanceChart} aria-label="Seven-day clicks and sales chart">
                {PERFORMANCE_BARS.map((bar, index) => (
                  <span key={`${bar.day}-${index}`}>
                    <i style={{ height: `${bar.clicks}%` }}><b style={{ height: `${bar.sales}%` }} /></i>
                    <small>{bar.day}</small>
                  </span>
                ))}
              </div>
              <footer><span><i data-series="clicks" />Clicks</span><span><i data-series="sales" />Sales</span></footer>
            </article>

            <article className={styles.channelCard}>
              <header><span>Channel results</span><small>Tracked traffic</small></header>
              <div>
                {CHANNEL_RESULTS.map(({ name, value, conversion, icon: Icon, tone }) => (
                  <div key={name} data-tone={tone}>
                    <span><Icon size={16} weight="bold" /></span>
                    <p><strong>{name}</strong><small>{value} clicks</small></p>
                    <b>{conversion}</b>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className={styles.dashboardWorkspace}>
            <article className={styles.merchantConnections}>
              <header>
                <span><Handshake size={19} weight="bold" /> Connect with merchants</span>
                <small>3 new opportunities</small>
              </header>
              <p className={styles.merchantConnectionsIntro}>
                Discover merchants and products from connected brands.
              </p>
              <div>
                {MERCHANT_CONNECTIONS.map((merchant) => (
                  <div key={merchant.name} data-tone={merchant.tone}>
                    <span><Storefront size={16} weight="bold" /></span>
                    <p><strong>{merchant.name}</strong><small>{merchant.campaign}</small></p>
                    <b>{merchant.rate}</b>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.commissionTracker}>
              <header><span>Commission tracker</span><small>August</small></header>
              <strong>$2,460</strong>
              <p>Available earnings</p>
              <div className={styles.commissionStatuses}>
                <span><i data-status="validated" />Validated <b>$1,680</b></span>
                <span><i data-status="pending" />Pending <b>$824</b></span>
                <span><i data-status="paid" />Paid this month <b>$3,190</b></span>
              </div>
              <button type="button" onClick={onCtaClick}><Wallet size={15} weight="bold" /> View payout</button>
            </article>
          </div>

          <button type="button" className={styles.dashboardOpenCta} onClick={onCtaClick}>
            Open your creator dashboard <ArrowUpRight size={17} weight="bold" />
          </button>
        </div>
      </section>
    </>
  );
}
