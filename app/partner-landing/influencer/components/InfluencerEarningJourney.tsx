import { ArrowRight, CheckCircle, Clock, Receipt } from "@phosphor-icons/react";
import Image from "next/image";
import type { InfluencerLandingViewModel } from "../types";
import { PartnerIcon } from "../../components/PartnerIcon";
import styles from "./influencerLanding.module.css";

export function InfluencerEarningJourney({ viewModel, onPrimaryAction }: { viewModel: InfluencerLandingViewModel; onPrimaryAction: () => void }) {
  return (
    <>
      <section id="creator-journey" className={styles.earningJourney} aria-labelledby="earning-journey-title">
        <div className={styles.journeyHeading}>
          <span>How you earn</span>
          <h2 id="earning-journey-title">Everything from inspiration <em>to a validated payout.</em></h2>
          <p>Activate your creator profile, build and publish approved looks, and keep every qualified sale connected through merchant validation.</p>
        </div>
        <div className={styles.journeyGrid}>
          {viewModel.features.map((feature, index) => {
            const earningStep = viewModel.journey[index];
            return (
              <article key={feature.number}>
                <div className={styles.journeyToolNumber}>
                  <span>{feature.number}</span>
                  <i aria-hidden />
                  <PartnerIcon name={feature.icon} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                {earningStep ? (
                  <div className={styles.journeyOutcome}>
                    <strong>{earningStep.title}</strong>
                    <p>{earningStep.description}</p>
                  </div>
                ) : null}
                <small className={styles.journeySketch}>{feature.note}</small>
              </article>
            );
          })}
        </div>
        <div className={styles.statementStory}>
          <div className={styles.statementFilm}><Image src="/media/partner-landing/creator-payout-story.png" alt="Fashion creator preparing an approved look for a merchant link" fill sizes="70vw" /><span>YOUR LOOK</span></div>
          <div className={styles.statementCard}>
            <span>Creator statement</span>
            <h3>Every status, clearly named.</h3>
            <div><Clock size={18} /><p>Pending<small>Merchant or network validation</small></p></div>
            <div><CheckCircle size={18} weight="fill" /><p>Validated<small>Eligible purchase confirmed</small></p></div>
            <div><Receipt size={18} /><p>Paid or adjusted<small>Statement and reconciliation recorded</small></p></div>
          </div>
        </div>
      </section>

      <section id="creator-commission" className={styles.commissionSection} aria-labelledby="commission-title">
        <div className={styles.commissionRule}>
          <span>The affiliate-channel rule</span>
          <strong>100%</strong>
          <h2 id="commission-title">of the commission PrimeStyleAI actually receives on eligible purchases from the originating merchant.</h2>
          <p>Not “100% commission.” Rates, eligibility, return windows, exclusions, reversals, currency, and payment timing still apply.</p>
        </div>
        <div className={styles.rateCard}>
          <span>Know the offer before you publish</span>
          <div>{viewModel.commissionLabels.map((label) => <strong key={label}>{label}</strong>)}</div>
          <p>The offer shows its last-updated conditions beside the product or link action. The transaction record then shows the rate and commission actually validated.</p>
          <button type="button" onClick={onPrimaryAction}>Join waitlist <ArrowRight size={17} /></button>
          <em>Real earnings. Real conditions.</em>
        </div>
      </section>
    </>
  );
}
