import { ArrowDownRight, CheckCircle } from "@phosphor-icons/react";
import Image from "next/image";
import type { MerchantLandingViewModel } from "../types";
import { PartnerIcon } from "../../components/PartnerIcon";
import styles from "./merchantLanding.module.css";

export function MerchantCapabilities({ viewModel }: { viewModel: MerchantLandingViewModel }) {
  return (
    <section id="merchant-capabilities" className={styles.capabilities} aria-labelledby="merchant-capabilities-title">
      <div className={styles.capabilityIntro}>
        <span>Direct Connected capabilities</span>
        <h2 id="merchant-capabilities-title">Give every product a <em>better decision path.</em></h2>
        <p>These capabilities belong to the Direct Connected program and only operate within the catalog, content, AI, cart, reporting, and indexing rights you authorize.</p>
      </div>
      <div className={styles.capabilityGrid}>
        {viewModel.capabilities.map((capability, index) => (
          <article key={capability.title} className={index === 2 || index === 5 ? styles.featuredCapability : undefined}>
            <span>{capability.label}</span><PartnerIcon name={capability.icon} /><h3>{capability.title}</h3><p>{capability.description}</p>
            {index === 2 ? <div className={styles.aiFilm}><Image src="/media/partner-landing/creator-portrait-poster.jpg" alt="Authorized creator content" fill sizes="33vw" /><strong><CheckCircle size={16} weight="fill" /> Authorized output</strong></div> : null}
          </article>
        ))}
      </div>
      <p className={styles.capabilityAnnotation}>Rights travel with every output <ArrowDownRight size={36} /></p>
    </section>
  );
}
