import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import Image from "next/image";
import type { MerchantLandingViewModel } from "../types";
import { PartnerIcon } from "../../components/PartnerIcon";
import styles from "./merchantLanding.module.css";

export function MerchantConnectedSystem({ viewModel }: { viewModel: MerchantLandingViewModel }) {
  return (
    <section id="connected-system" className={styles.connectedSystem} aria-labelledby="connected-system-title">
      <div className={styles.systemHeading}>
        <span>One merchant-controlled path</span>
        <h2 id="connected-system-title">Five handoffs.<em>One commercial truth.</em></h2>
        <p>Your product data, shopper decision, exact variant, merchant cart, and order lifecycle stay joined without turning the page into an analytics dashboard.</p>
      </div>
      <div className={styles.systemCanvas}>
        <div className={styles.systemSteps}>
          {viewModel.commerceSteps.map((step) => <article key={step.number}><span>{step.number}</span><PartnerIcon name={step.icon} /><div><h3>{step.title}</h3><p>{step.description}</p></div></article>)}
        </div>
        <div className={styles.systemVisual}>
          <Image src={viewModel.hero.image} alt="Connected merchant fashion campaign" fill sizes="70vw" />
          <div className={styles.productDecision}><span>DIRECT CONNECTED PDP</span><Image src="/images/landing/product-cardigan-yellow.png" alt="Connected product" width={96} height={120} /><div><strong>Exact product</strong><small>Size · color · fit</small></div></div>
          <div className={styles.cartDecision}><CheckCircle size={18} weight="fill" /><span>Confirmed variant<strong>Open merchant cart</strong></span><ArrowRight size={18} /></div>
        </div>
      </div>
    </section>
  );
}
