import { ArrowRight, CheckCircle, Clock, Receipt } from "@phosphor-icons/react";
import Image from "next/image";
import type { InfluencerLandingViewModel } from "../types";
import { PartnerIcon } from "../../components/PartnerIcon";
import { useCreatorLanguage } from "../../i18n/CreatorLanguageProvider";
import styles from "./influencerLanding.module.css";

export function InfluencerEarningJourney({ viewModel, onPrimaryAction }: { viewModel: InfluencerLandingViewModel; onPrimaryAction: () => void }) {
  const { t } = useCreatorLanguage();

  return (
    <>
      <section id="creator-journey" className={styles.earningJourney} aria-labelledby="earning-journey-title">
        <div className={styles.journeyHeading}>
          <span>{t("How you earn")}</span>
          <h2 id="earning-journey-title">{t("Everything from inspiration")} <em>{t("to a validated payout.")}</em></h2>
          <p>{t("Activate your creator profile, connect with merchants, publish shoppable looks, and keep every qualified sale connected through merchant validation.")}</p>
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
          <div className={styles.statementFilm}><Image src="/media/partner-landing/optimized/creator-payout-story.webp" alt={t("Fashion creator preparing an approved look for a merchant link")} fill sizes="70vw" /><span>{t("YOUR LOOK")}</span></div>
          <div className={styles.statementCard}>
            <span>{t("Creator statement")}</span>
            <h3>{t("Every status, clearly named.")}</h3>
            <div><Clock size={18} /><p>{t("Pending")}<small>{t("Merchant or network validation")}</small></p></div>
            <div><CheckCircle size={18} weight="fill" /><p>{t("Validated")}<small>{t("Eligible purchase confirmed")}</small></p></div>
            <div><Receipt size={18} /><p>{t("Paid or adjusted")}<small>{t("Statement and reconciliation recorded")}</small></p></div>
          </div>
        </div>
      </section>

      <section id="creator-commission" className={styles.commissionSection} aria-labelledby="commission-title">
        <div className={styles.commissionRule}>
          <span>{t("The creator commission promise")}</span>
          <strong>100%</strong>
          <h2 id="commission-title">{t("of the creator commission you agree upon with the merchant goes to you. PrimeStyleAI does not take a percentage.")}</h2>
          <p>{t("Applies to qualifying purchases tracked through PrimeStyleAI. Merchant terms, eligibility requirements, attribution periods, returns, cancellations, reversals, payment-processing fees, taxes, currency conversion and payment timing may apply.")}</p>
        </div>
        <aside className={styles.rateCard} aria-labelledby="commission-offer-title">
          <h3 id="commission-offer-title">{t("Review the offer before you accept")}</h3>
          <dl className={styles.commissionOfferTerms}>
            <div>
              <dt>{t("Your commission")}</dt>
              <dd>{t("The commission rate proposed by the merchant—or the rate you agree on after negotiation.")}</dd>
            </div>
            <div>
              <dt>{t("What counts as a qualifying purchase")}</dt>
              <dd>{t("The conditions a purchase must meet for you to earn a commission.")}</dd>
            </div>
            <div>
              <dt>{t("Tracking and payment")}</dt>
              <dd>{t("How purchases are credited to you, when you are paid, and how returns, cancellations or refunds are handled.")}</dd>
            </div>
          </dl>
          <p>{t("Every merchant offer will clearly show the proposed commission rate and all important conditions. You can review the offer, negotiate directly with the merchant and decide whether to accept it.")}</p>
          <p>{t("After you accept an offer, your transaction history will show purchases credited to you, along with any returns, cancellations, refunds or other adjustments.")}</p>
          <p className={styles.commissionNegotiation}><strong>{t("YOU CONTROL YOUR TERMS")}</strong><br />{t("Set your prices for paid content packages and negotiate your commission directly with merchants before accepting an offer.")}</p>
          <button type="button" onClick={onPrimaryAction}>{t("Join the waitlist")} <ArrowRight size={17} /></button>
          <em>{t("Your content. Your commission.")}</em>
        </aside>
      </section>
    </>
  );
}
