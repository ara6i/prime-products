"use client";

import {
  ArrowBendDownLeft,
  ArrowBendDownRight,
  ChartLineUp,
  Check,
  Plus,
  SealCheck,
} from "@phosphor-icons/react";
import Image from "next/image";
import styles from "./merchantLanding.module.css";

const HERO_STEPS = [
  { number: "01", title: "Select products", body: "Pick the pieces. Set your brief." },
  { number: "02", title: "Match creators", body: "We match by audience, style and performance." },
  { number: "03", title: "Approve content", body: "Review, request edits, and lock content rights." },
  { number: "04", title: "Track orders", body: "See attributed orders, returns and exchanges." },
  { number: "05", title: "Reconcile & grow", body: "Validate results, settle campaigns and scale." },
];

const CREATOR_IMAGE = "/media/partner-landing/creator-orange-white.png";

const CREATORS = [
  { name: "Maya L.", rate: "Eng. rate 4.8%", image: "/media/partner-landing/creator-match-maya.png" },
  { name: "Rae K.", rate: "Eng. rate 3.9%", image: "/media/partner-landing/creator-match-rae.png" },
  { name: "Zoe S.", rate: "Eng. rate 4.3%", image: "/media/partner-landing/creator-match-zoe.png" },
];

function StepRail({ number }: { number: string }) {
  return <div className={styles.stepRail}><span>{number}</span><i aria-hidden /></div>;
}

export function MerchantHeroJourney() {
  return (
    <div className={styles.heroJourney}>
      <div className={styles.heroSteps}>
        <article className={styles.heroStep}>
          <StepRail number={HERO_STEPS[0].number} />
          <h2>{HERO_STEPS[0].title}</h2>
          <p>{HERO_STEPS[0].body}</p>
          <div className={styles.productProof}>
            <Image src="/media/partner-landing/merchant-product-trio.png" alt="Mustard, orange and ivory garments selected for a creator campaign" fill sizes="240px" />
          </div>
        </article>

        <article className={styles.heroStep}>
          <StepRail number={HERO_STEPS[1].number} />
          <h2>{HERO_STEPS[1].title}</h2>
          <p>{HERO_STEPS[1].body}</p>
          <div className={styles.creatorProof}>
            {CREATORS.map((creator) => (
              <div key={creator.name}>
                <Image src={creator.image} alt="" width={26} height={26} />
                <span><strong>{creator.name}</strong><small>{creator.rate}</small></span>
                <Plus size={14} weight="bold" />
              </div>
            ))}
          </div>
        </article>

        <article className={styles.heroStep}>
          <StepRail number={HERO_STEPS[2].number} />
          <h2>{HERO_STEPS[2].title}</h2>
          <p>{HERO_STEPS[2].body}</p>
          <div className={styles.approvalProof}>
            <div><Image src={CREATOR_IMAGE} alt="Approved creator campaign content" fill sizes="180px" /></div>
            <strong><Check size={15} weight="bold" /> Approved</strong>
            <small>‹ <span>1 / 8</span> ›</small>
          </div>
        </article>

        <article className={styles.heroStep}>
          <StepRail number={HERO_STEPS[3].number} />
          <h2>{HERO_STEPS[3].title}</h2>
          <p>{HERO_STEPS[3].body}</p>
          <div className={styles.salesProof}>
            <span>Attributed revenue</span>
            <strong>$286,540</strong>
            <small>+38% vs last campaign</small>
            <ChartLineUp size={76} weight="light" />
            <div><span>Orders<strong>1,842</strong></span><span>AOV<strong>$155</strong></span></div>
          </div>
        </article>

        <article className={styles.heroStep}>
          <StepRail number={HERO_STEPS[4].number} />
          <h2>{HERO_STEPS[4].title}</h2>
          <p>{HERO_STEPS[4].body}</p>
          <div className={styles.reconcileProof}>
            <span><SealCheck size={17} weight="fill" /> Campaign reconciled</span>
            <div><small>Validated orders</small><strong>1,842</strong></div>
            <div><small>Returns matched</small><strong>100%</strong></div>
            <div><small>Next action</small><strong>Scale winners</strong></div>
          </div>
        </article>

        <p className={`${styles.merchantScribble} ${styles.merchantScribbleProducts}`}><ArrowBendDownRight size={35} weight="light" /><span>Your catalog.<br />Campaign-ready.</span></p>
        <p className={`${styles.merchantScribble} ${styles.merchantScribbleResults}`}><ArrowBendDownLeft size={35} weight="light" /><span>Every order.<br />Fully reconciled.</span></p>
      </div>
    </div>
  );
}
