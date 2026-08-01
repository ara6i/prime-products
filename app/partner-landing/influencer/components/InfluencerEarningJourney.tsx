import { ArrowRight, CheckCircle, Clock, Receipt } from "@phosphor-icons/react";
import type { InfluencerLandingViewModel } from "../types";
import styles from "./influencerLanding.module.css";

export function InfluencerEarningJourney({ viewModel, onPrimaryAction }: { viewModel: InfluencerLandingViewModel; onPrimaryAction: () => void }) {
  return (
    <>
      <section id="creator-journey" className={styles.earningJourney} aria-labelledby="earning-journey-title">
        <div className={styles.journeyHeading}>
          <span>How you earn</span>
          <h2 id="earning-journey-title">From your link <em>to a validated payout.</em></h2>
          <p>The sale is not guessed from a dashboard click. It moves through merchant and network validation before it becomes payable.</p>
        </div>
        <div className={styles.journeyGrid}>
          {viewModel.journey.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}
        </div>
        <div className={styles.statementStory}>
          <div className={styles.statementFilm}><video src="/media/partner-landing/creator-portrait.mp4" poster="/media/partner-landing/creator-portrait-poster.jpg" autoPlay muted loop playsInline /><span>YOUR LOOK</span></div>
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
          <button type="button" onClick={onPrimaryAction}>Join the creator program <ArrowRight size={17} /></button>
          <em>Real earnings. Real conditions.</em>
        </div>
      </section>
    </>
  );
}
