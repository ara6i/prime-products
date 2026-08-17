import { ArrowUpRight } from "@phosphor-icons/react";
import Image from "next/image";
import styles from "./merchantLanding.module.css";

type MerchantTryOnSizingSectionProps = {
  onPrimaryAction: () => void;
};

export function MerchantTryOnSizingSection({
  onPrimaryAction,
}: MerchantTryOnSizingSectionProps) {
  return (
    <section
      id="ai-fitting"
      className={styles.fitExperience}
      aria-labelledby="ai-fitting-title"
    >
      <Image
        className={`${styles.fitExperienceImage} ${styles.fitExperienceImageDesktop}`}
        src="/media/partner-landing/merchant-tryon-ai-sizing-section-chatgpt-hd.webp"
        alt="Shopper using PrimeStyleAI virtual try-on and AI size matching in a glass retail atrium"
        fill
        sizes="100vw"
        quality={90}
      />
      <Image
        className={`${styles.fitExperienceImage} ${styles.fitExperienceImageMobile}`}
        src="/media/partner-landing/merchant-tryon-ai-sizing-mobile-static-4k.webp"
        alt="Shopper in a lime puffer jacket using PrimeStyleAI on her phone"
        fill
        sizes="(max-width: 560px) 200vw, 1px"
        quality={100}
      />
      <div className={styles.fitExperienceOverlay} aria-hidden="true" />

      <div className={styles.fitExperienceCopy}>
        <p className={styles.fitExperienceEyebrow}>
          <span>01</span>
          Virtual try-on + AI sizing
        </p>
        <h2 id="ai-fitting-title">
          See the look.
          <span>Know the size.</span>
        </h2>
        <p className={styles.fitExperienceBody}>
          Let shoppers try on your products and find the right size before
          checkout—so they buy with more confidence and send fewer fit-related
          returns back to your store.
        </p>
        <div
          className={styles.fitExperienceProof}
          aria-label="AI fitting benefits"
        >
          <span>Virtual try-on</span>
          <span>AI size match</span>
          <span>Fit confidence</span>
        </div>
        <button
          type="button"
          className={styles.fitExperienceButton}
          onClick={onPrimaryAction}
        >
          Add AI fitting to your store
          <ArrowUpRight size={17} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
