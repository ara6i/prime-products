import { ArrowBendRightDown } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import styles from "./merchantOutfitBuilder.module.css";

const benefits = [
  {
    index: "01",
    title: "Build complete outfits",
    body: "Customers can mix, match, and save a full look around the product they already love.",
  },
  {
    index: "02",
    title: "Suggest more products",
    body: "Show complementary pieces at the moment of intent, so one product can lead to a larger basket.",
  },
  {
    index: "03",
    title: "Promote the right match",
    body: "When your product completes a look with products from another merchant, we can surface it to relevant shoppers across the PrimeStyleAI network.",
  },
] as const;

export function MerchantOutfitBuilderSection() {
  return (
    <section
      id="outfit-builder"
      className={styles.section}
      aria-labelledby="outfit-builder-title"
    >
      <div className={styles.layout}>
        <figure className={styles.visual}>
          <Image
            src="/media/partner-landing/merchant-network/outfit-builder/outfit-builder-scrapbook-v1.png"
            alt="Four colorful outfits built around four colorways of one oversized shirt, presented as a handmade fashion scrapbook"
            width={1003}
            height={1568}
            sizes="(max-width: 900px) 92vw, (max-width: 1440px) 48vw, 680px"
            quality={90}
          />
          <figcaption>
            One product idea <span>Four complete looks</span>
          </figcaption>
        </figure>

        <article className={styles.copy}>
          <p className={styles.eyebrow}>Outfit Builder · Shopping Network</p>
          <h2 id="outfit-builder-title">
            One product.
            <span>A complete look.</span>
          </h2>
          <p className={styles.description}>
            Your customers can build outfits around your products and get
            suggestions for pieces that genuinely work together.
          </p>

          <div className={styles.benefits}>
            {benefits.map((benefit) => (
              <article key={benefit.index}>
                <span>{benefit.index}</span>
                <div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.body}</p>
                </div>
              </article>
            ))}
          </div>

          <p className={styles.closing}>
            More relevant suggestions. More product discovery. More chances to
            sell.
          </p>

          <Link
            className={styles.sdkCue}
            href="#ai-fitting"
            aria-label="See how customers land on your product page, find their right size, and try it on"
          >
            <span>
              See how customers land on your PDP,
              <strong>find their right size and try it on.</strong>
            </span>
            <ArrowBendRightDown size={126} weight="thin" aria-hidden="true" />
          </Link>
        </article>
      </div>
    </section>
  );
}
