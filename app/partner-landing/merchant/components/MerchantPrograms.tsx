import { ArrowRight, Check, GitBranch, ShieldCheck } from "@phosphor-icons/react";
import Image from "next/image";
import type { MerchantLandingViewModel } from "../types";
import styles from "./merchantLanding.module.css";

export function MerchantPrograms({ viewModel, onPrimaryAction }: { viewModel: MerchantLandingViewModel; onPrimaryAction: () => void }) {
  return (
    <>
      <section id="merchant-channels" className={styles.programs} aria-labelledby="merchant-programs-title">
        <div className={styles.programHeading}>
          <span>Two merchant tracks. Never mixed.</span>
          <h2 id="merchant-programs-title">Choose the relationship that <em>controls the experience.</em></h2>
          <p>The manual keeps affiliate-network merchants and Direct Connected Merchants separate because their rights, pages, cart methods, attribution, and economics are different.</p>
        </div>
        <div className={styles.programCards}>
          <article className={styles.affiliateProgram}>
            <span>Rakuten / Awin affiliate merchant</span><GitBranch size={30} />
            <h3>Discovery that returns to your original product page.</h3>
            <ul><li><Check size={15} /> Approved feed and tracked deep link</li><li><Check size={15} /> Original merchant PDP remains authoritative</li><li><Check size={15} /> Sizing, AI imagery, and cart assistance only where permitted</li><li><Check size={15} /> Network-reported transaction controls commission</li></ul>
            <strong>No Direct Connected standard PDP or try-on invoice.</strong>
          </article>
          <article className={styles.directProgram}>
            <span>Direct Connected Merchant</span><ShieldCheck size={30} />
            <h3>A contracted, integrated commerce experience.</h3>
            <ul><li><Check size={15} /> Standardized product decision pages</li><li><Check size={15} /> Catalog sync, size charts, and AI shopping</li><li><Check size={15} /> Authorized native cart integration</li><li><Check size={15} /> Direct order, return, campaign, and billing rules</li></ul>
            <button type="button" onClick={onPrimaryAction}>Join merchant waitlist <ArrowRight size={16} /></button>
          </article>
        </div>
      </section>

      <section className={styles.campaignSystem} aria-labelledby="campaign-system-title">
        <div className={styles.campaignCopy}>
          <span>Direct publisher campaigns</span>
          <h2 id="campaign-system-title">Creator programs on <em>your terms.</em></h2>
          <p>A direct campaign is configured independently of Rakuten or Awin. Merchant funding, publisher entitlement, attribution, validation, returns, and payout rules must agree before activation.</p>
        </div>
        <div className={styles.termBoard}>{viewModel.campaignTerms.map((term, index) => <div key={term}><span>0{index + 1}</span><strong>{term}</strong><i aria-hidden /></div>)}</div>
      </section>

      <section className={styles.pilotSection} aria-labelledby="pilot-title">
        <div className={styles.pilotFilm}><Image src={viewModel.hero.image} alt="Controlled merchant campaign launch" fill sizes="65vw" /><span>PILOT · CONTROLLED LAUNCH</span></div>
        <div className={styles.pilotCopy}><span>Launch with evidence</span><h2 id="pilot-title">Prove quality before <em>you scale.</em></h2><p>Validate contract, integration, catalog, size charts, AI rights, cart handoff, order reporting, privacy, billing, and support. Then monitor complete results, exact qualified events, cart success, conversions, returns, cost, latency, and incidents.</p><button type="button" onClick={onPrimaryAction}>Join merchant waitlist <ArrowRight size={17} /></button></div>
      </section>
    </>
  );
}
