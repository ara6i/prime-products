import {
  ArrowRight,
  CaretRight,
  CheckCircle,
  LinkSimple,
  MegaphoneSimple,
} from "@phosphor-icons/react";
import Image from "next/image";
import styles from "./shopCreatorHero.module.css";

const JOURNEY_IMAGES = {
  choose: "/media/global-shop/creator-system/journey-choose-v1.webp",
  campaign: "/media/global-shop/creator-system/journey-campaign-v2.webp",
  post: "/media/global-shop/creator-system/journey-post-v1.webp",
  payout: "/media/global-shop/creator-system/journey-payout-v2.webp",
} as const;

function CardHeader({ badge }: { badge: string }) {
  return (
    <span className={styles.roundBadge}>{badge}</span>
  );
}

function CardSummary({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.cardSummary}>
      <p>{children}</p>
      <span className={styles.cardChevrons} aria-hidden="true">
        <CaretRight size={19} weight="bold" />
        <CaretRight size={19} weight="bold" />
        <CaretRight size={19} weight="bold" />
      </span>
    </div>
  );
}

function JourneyConnector() {
  return (
    <span className={styles.journeyConnector} aria-hidden="true">
      <small>next</small>
      <ArrowRight size={47} weight="light" />
    </span>
  );
}

export function ShopCreatorJourney() {
  return (
    <div
      className={styles.campaignJourney}
      id="creator-journey"
      aria-label="How the creator system works"
    >
      <ol className={styles.campaignGrid}>
        <li>
          <article className={styles.campaignCard} aria-labelledby="creator-step-01">
            <CardHeader badge="Pick products" />
            <figure className={styles.cardVisual}>
              <Image
                src={JOURNEY_IMAGES.choose}
                alt="Fashion creator presenting a coral handbag"
                fill
                quality={90}
                sizes="(max-width: 760px) 92vw, 43vw"
              />
            </figure>
            <div className={styles.cardContent}>
              <h3 id="creator-step-01">Choose it</h3>
              <CardSummary>
                Connect with merchants and choose products.
              </CardSummary>
              <dl className={styles.fitDetails}>
                <div className={styles.sizeDetail}>
                  <dt>Size</dt>
                  <dd>XXS&nbsp;&nbsp; XS&nbsp;&nbsp; S&nbsp;&nbsp; M&nbsp;&nbsp; L&nbsp;&nbsp; XL</dd>
                </div>
                <div>
                  <dt>Height</dt>
                  <dd>5′ 3″</dd>
                </div>
                <div>
                  <dt>Fit</dt>
                  <dd>True to size</dd>
                </div>
                <div className={styles.confidenceDetail}>
                  <dt>AI fit confidence</dt>
                  <dd>94%</dd>
                </div>
              </dl>
            </div>
          </article>
          <JourneyConnector />
        </li>

        <li>
          <article className={styles.campaignCard} aria-labelledby="creator-step-02">
            <CardHeader badge="Build links" />
            <figure className={styles.cardVisual}>
              <Image
                src={JOURNEY_IMAGES.campaign}
                alt="Fashion creator presenting a campaign phone and link"
                fill
                quality={90}
                sizes="(max-width: 760px) 92vw, 43vw"
              />
            </figure>
            <div className={styles.cardContent}>
              <h3 id="creator-step-02">Create campaigns &amp; affiliate links</h3>
              <CardSummary>
                Turn selected products into a tracked link ready for your content.
              </CardSummary>
              <div className={styles.toolChips} aria-label="Campaign tools">
                <span>
                  <MegaphoneSimple size={17} weight="fill" /> Campaign
                </span>
                <span>
                  <LinkSimple size={17} weight="bold" /> Affiliate link
                </span>
              </div>
            </div>
          </article>
          <JourneyConnector />
        </li>

        <li>
          <article className={styles.campaignCard} aria-labelledby="creator-step-03">
            <CardHeader badge="Post & sell" />
            <figure className={styles.cardVisual}>
              <Image
                src={JOURNEY_IMAGES.post}
                alt="Fashion creator recording a shoppable post with a lavender phone"
                fill
                quality={90}
                sizes="(max-width: 760px) 92vw, 43vw"
              />
            </figure>
            <div className={styles.cardContent}>
              <h3 id="creator-step-03">Post it. Sell it.</h3>
              <CardSummary>
                We help your audience purchase with confidence using virtual
                try-on and our AI size recommender.
              </CardSummary>
              <span className={styles.readyStatus}>
                <CheckCircle size={18} weight="fill" /> Ready
              </span>
            </div>
          </article>
          <JourneyConnector />
        </li>

        <li>
          <article className={styles.campaignCard} aria-labelledby="creator-step-04">
            <CardHeader badge="Track payouts" />
            <figure className={styles.cardVisual}>
              <Image
                src={JOURNEY_IMAGES.payout}
                alt="Fashion creator celebrating with a bright payout card"
                fill
                quality={90}
                sizes="(max-width: 760px) 92vw, 43vw"
              />
            </figure>
            <div className={styles.cardContent}>
              <h3 id="creator-step-04">Get paid</h3>
              <CardSummary>
                Validated sales become a clear payout statement.
              </CardSummary>
              <div className={styles.payoutPanel}>
                <header>
                  <span>Commission earned</span>
                  <strong>$128.40</strong>
                  <small>+24% vs last 7 days</small>
                </header>
                <div className={styles.orderRow}>
                  <span>Order #10492</span>
                  <b>$42.30</b>
                </div>
                <div className={styles.orderRow}>
                  <span>Order #10491</span>
                  <b>$36.20</b>
                </div>
                <div className={styles.orderRow}>
                  <span>Order #10490</span>
                  <b>$49.90</b>
                </div>
                <footer>
                  <span>Paid to you</span>
                  <small>After network validation</small>
                </footer>
              </div>
            </div>
          </article>
        </li>
      </ol>
    </div>
  );
}
