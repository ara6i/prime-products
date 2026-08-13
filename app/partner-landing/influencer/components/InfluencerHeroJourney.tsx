"use client";

import {
  ArrowBendDownLeft,
  ArrowBendDownRight,
  CheckCircle,
  InstagramLogo,
  LinkSimple,
  MegaphoneSimple,
  TiktokLogo,
} from "@phosphor-icons/react";
import Image from "next/image";
import styles from "./influencerLanding.module.css";

const HERO_STEPS = [
  { number: "01", title: "Choose it", body: "Connect with merchants and choose products." },
  { number: "02", title: "Create campaigns & affiliate links", body: "Turn selected products into a tracked link ready for your content." },
  { number: "03", title: "Post it. Sell it.", body: "We help your audience purchase with confidence using virtual try-on and our AI size recommender." },
  { number: "04", title: "Get paid", body: "Validated sales become a clear payout statement." },
];

const CREATOR_IMAGE = "/media/partner-landing/creator-orange-white.png";
const CAMPAIGN_IMAGE = "/media/partner-landing/optimized/creator-campaign-affiliate.webp";

function StepRail({ number }: { number: string }) {
  return <div className={styles.stepRail}><span>{number}</span><i aria-hidden /></div>;
}

export function InfluencerHeroJourney() {
  return (
    <div className={styles.heroJourney}>
      <div className={styles.heroSteps}>
        <article className={styles.heroStep}>
          <StepRail number={HERO_STEPS[0].number} />
          <h2>{HERO_STEPS[0].title}</h2>
          <p>{HERO_STEPS[0].body}</p>
          <div className={styles.fitProof}>
            <div className={styles.fitPortrait}><Image src={CREATOR_IMAGE} alt="Creator styling a shoppable look" fill sizes="220px" /></div>
            <div className={styles.fitPanel}>
              <span>Size <small>XXS &nbsp; XS &nbsp; S &nbsp; M &nbsp; L &nbsp; XL</small></span>
              <span>Height <small>5′ 3″</small></span>
              <span>Fit <small>True to size</small></span>
              <strong>AI fit confidence <em>94%</em></strong>
            </div>
          </div>
        </article>

        <article className={styles.heroStep}>
          <StepRail number={HERO_STEPS[1].number} />
          <h2>{HERO_STEPS[1].title}</h2>
          <p>{HERO_STEPS[1].body}</p>
          <div className={styles.campaignProof}>
            <div className={styles.campaignPortrait}>
              <Image src={CAMPAIGN_IMAGE} alt="Creator building a fashion campaign and affiliate link" fill quality={90} sizes="176px" />
            </div>
            <div className={styles.campaignStack} aria-label="Campaign and affiliate link tools">
              <span><MegaphoneSimple size={19} weight="fill" /></span>
              <span><LinkSimple size={19} weight="bold" /></span>
            </div>
          </div>
        </article>

        <article className={styles.heroStep}>
          <StepRail number={HERO_STEPS[2].number} />
          <h2>{HERO_STEPS[2].title}</h2>
          <p>{HERO_STEPS[2].body}</p>
          <div className={styles.shareProof}>
            <div className={styles.creatorPhone}>
              <Image src={CREATOR_IMAGE} alt="Creator publishing a tracked shoppable look" fill sizes="180px" />
              <span><CheckCircle size={11} weight="fill" /> Ready</span>
            </div>
            <div className={styles.socialStack} aria-label="Supported creator channels">
              <span><TiktokLogo size={18} weight="fill" /></span>
              <span><InstagramLogo size={18} weight="fill" /></span>
              <span><LinkSimple size={18} weight="bold" /></span>
            </div>
          </div>
        </article>

        <article className={styles.heroStep}>
          <StepRail number={HERO_STEPS[3].number} />
          <h2>{HERO_STEPS[3].title}</h2>
          <p>{HERO_STEPS[3].body}</p>
          <div className={styles.earningProof}>
            <span>Commission earned</span>
            <strong>$128.40</strong>
            <small>+24% vs last 7 days</small>
            <div><span>Order #10492</span><b>$42.30</b></div>
            <div><span>Order #10491</span><b>$36.20</b></div>
            <div><span>Order #10490</span><b>$49.90</b></div>
            <p><Image src={CREATOR_IMAGE} alt="" width={22} height={22} /><span>Paid to you<small>After network validation</small></span></p>
          </div>
        </article>

        <p className={`${styles.heroScribble} ${styles.heroScribbleStart}`}><ArrowBendDownRight size={36} weight="light" /><span>Approved products.<br />Real rates.</span></p>
        <p className={`${styles.heroScribble} ${styles.heroScribbleEnd}`}><ArrowBendDownLeft size={36} weight="light" /><span>Tracked sale.<br />Validated payout.</span></p>
      </div>
    </div>
  );
}
