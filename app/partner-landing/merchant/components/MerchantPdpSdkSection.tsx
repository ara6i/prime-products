"use client";

import { Ruler } from "@phosphor-icons/react";
import type { PrimeStyleTryonProps } from "@primestyleai/tryon-shop/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, type CSSProperties } from "react";
import {
  ARC_JACKET_SIZE_ROWS,
  ARC_JACKET_SIZES,
  type ArcJacketSize,
} from "./arcJacketSizeGuide";
import {
  ARC_JACKET_OUTFIT_LOOKS,
  ARC_JACKET_OUTFIT_RESULTS_BY_COLOUR,
} from "./arcJacketOutfitLooks";
import { MerchantSizeGuideModal } from "./MerchantSizeGuideModal";
import styles from "./merchantPdpSdk.module.css";

const PrimeStyleTryon = dynamic<PrimeStyleTryonProps>(
  () =>
    import("@primestyleai/tryon-shop/react").then(
      (module) => module.PrimeStyleTryon,
    ),
  {
    ssr: false,
    loading: () => (
      <div className={styles.sdkLoading} aria-live="polite">
        Loading AI fitting…
      </div>
    ),
  },
);

const COLOURS = [
  {
    name: "Cobalt",
    slug: "cobalt",
    hex: "#2458dc",
    ink: "#ffffff",
    image: "/media/partner-landing/merchant-network/studio-jacket-cobalt.png",
    alt: "Cobalt Arc Jacket with warm ivory panels and a restrained coral accent",
  },
  {
    name: "Coral",
    slug: "coral",
    hex: "#ff625b",
    ink: "#161616",
    image: "/media/partner-landing/merchant-network/studio-jacket-coral.png",
    alt: "Coral Arc Jacket with warm ivory panels and a restrained pink accent",
  },
  {
    name: "Butter",
    slug: "butter",
    hex: "#f7d65a",
    ink: "#161616",
    image: "/media/partner-landing/merchant-network/studio-jacket-butter.png",
    alt: "Butter-yellow Arc Jacket with warm ivory panels and a restrained tangerine accent",
  },
  {
    name: "Mint",
    slug: "mint",
    hex: "#9edfc9",
    ink: "#132c2c",
    image: "/media/partner-landing/merchant-network/studio-jacket-mint.png",
    alt: "Mint Arc Jacket with warm ivory panels and a restrained deep-teal accent",
  },
  {
    name: "Lilac",
    slug: "lilac",
    hex: "#b78bd8",
    ink: "#1c1424",
    image: "/media/partner-landing/merchant-network/studio-jacket-lilac.png",
    alt: "Lilac Arc Jacket with warm ivory panels and a restrained plum accent",
  },
] as const;

const SIZE_GUIDE = {
  title: "Arc Jacket garment size guide",
  unit: "cm",
  headers: ["Size", "Chest", "Hem", "Sleeve"],
  rows: ARC_JACKET_SIZE_ROWS.map((row) => [
    row.size,
    String(row.chest),
    String(row.hem),
    String(row.sleeve),
  ]),
};

const ARC_JACKET_RAW_MODEL_PHOTO =
  "/media/global-shop/arc-jacket-demo-v2/model-source.png";

type MerchantPdpSdkSectionProps = {
  productUrl?: string;
};

export function MerchantPdpSdkSection({
  productUrl = "/merchants#ai-fitting",
}: MerchantPdpSdkSectionProps = {}) {
  const [selectedSize, setSelectedSize] = useState<ArcJacketSize>("M");
  const [selectedColour, setSelectedColour] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const activeColour = COLOURS[selectedColour];

  const chooseColour = (index: number) => setSelectedColour(index);

  return (
    <section
      id="ai-fitting"
      className={styles.section}
      aria-labelledby="merchant-sdk-product-title"
    >
      <header className={styles.sectionIntro}>
        <div>
          <span>AI fitting, built into the look</span>
          <h2 id="merchant-sdk-section-title">
            Try it. Size it. Style the whole look.
          </h2>
        </div>
        <div
          className={styles.sectionDemoCue}
          aria-label="See the Arc Jacket AI fitting demo below"
        >
          <span>See a demo!</span>
          <svg viewBox="0 0 220 130" aria-hidden="true">
            <path d="M10 24c58-18 154 4 181 77" />
            <path d="m173 88 19 14 4-24" />
            <path
              className={styles.sectionDemoCueEcho}
              d="M12 28c58-17 150 5 178 74"
            />
          </svg>
        </div>
      </header>

      <div
        className={styles.productStage}
        style={
          {
            "--product-accent": activeColour.hex,
            "--product-accent-ink": activeColour.ink,
          } as CSSProperties
        }
      >
        <div className={styles.productCanvas}>
          <aside className={styles.controls} aria-label="Jacket options">
            <fieldset className={styles.optionGroup}>
              <legend>Select size</legend>
              <div className={styles.sizeList}>
                {ARC_JACKET_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={
                      size === selectedSize ? styles.sizeActive : undefined
                    }
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={size === selectedSize}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.sizeGuideTrigger}
                onClick={() => setSizeGuideOpen(true)}
                aria-haspopup="dialog"
                aria-controls="arc-jacket-size-guide-dialog"
                aria-expanded={sizeGuideOpen}
              >
                <Ruler size={15} weight="regular" aria-hidden="true" />
                Size guide
              </button>
            </fieldset>

            <fieldset className={styles.optionGroup}>
              <legend>Select colour</legend>
              <span className={styles.selectedColour}>
                {COLOURS[selectedColour].name}
              </span>
              <div className={styles.colourList}>
                {COLOURS.map((colour, index) => (
                  <button
                    key={colour.name}
                    type="button"
                    className={
                      index === selectedColour ? styles.colourActive : undefined
                    }
                    style={{ "--swatch": colour.hex } as CSSProperties}
                    onClick={() => chooseColour(index)}
                    aria-label={`Select ${colour.name}`}
                    aria-pressed={index === selectedColour}
                  />
                ))}
              </div>
            </fieldset>

            <span className={styles.scrollCue} aria-hidden="true">
              Scroll down
            </span>
          </aside>

          <div className={styles.productVisual}>
            <Image
              key={activeColour.slug}
              src={activeColour.image}
              alt={activeColour.alt}
              fill
              loading="eager"
              quality={90}
              sizes="(max-width: 760px) 92vw, 50vw"
            />
          </div>

          <article className={styles.productDetails}>
            <p className={styles.productType}>Men&apos;s jacket</p>
            <h2 id="merchant-sdk-product-title">Arc Jacket</h2>
            <p className={styles.productDescription}>
              A sculpted cropped jacket with curved ivory panels and one clean
              accent line. Bright enough to feel joyful, restrained enough to
              wear every day.
            </p>

            <div className={styles.aiFitCopy}>
              <strong>AI sizing + virtual try-on</strong>
              <span>
                Upload one photo to get your recommended size and see the Arc
                Jacket on you.
              </span>
              <small>
                This interactive demo uses a prepared model photo. AI sizing and
                virtual try-on are estimates and illustrations, not guarantees of
                actual fit or appearance. Live photo processing requires separate
                consent.
              </small>
            </div>

            <div className={styles.sdkCtaWrap}>
              <div className={styles.sdkPrompt}>
                <span>Try it now!</span>
                <svg viewBox="0 0 78 38" aria-hidden="true">
                  <path d="M3 7c23-8 48 2 64 24" />
                  <path d="M58 28l10 4-2-11" />
                  <path
                    className={styles.sdkPromptEcho}
                    d="M4 9c22-7 46 2 62 23"
                  />
                </svg>
              </div>

              <PrimeStyleTryon
                key={activeColour.slug}
                apiUrl={
                  process.env.NEXT_PUBLIC_API_BASE_URL ||
                  process.env.NEXT_PUBLIC_API_URL ||
                  "http://localhost:4000"
                }
                productId={`merchant-arc-jacket-${activeColour.slug}`}
                productImage={activeColour.image}
                productImages={[activeColour.image]}
                garmentReferenceImage={activeColour.image}
                garmentDetailImage={activeColour.image}
                productTitle={`Arc Jacket — ${activeColour.name}`}
                productCategory="Men's jackets"
                productSubcategory="Cropped jacket"
                productGender="male"
                productType="Sculpted cropped jacket"
                productFitType="apparel"
                productVendor="Merchant Store"
                productTags={[
                  "men",
                  "menswear",
                  "jacket",
                  "structured",
                  "curved-panel",
                  "cropped",
                  activeColour.slug,
                ]}
                productDescription={`Cropped ${activeColour.name.toLowerCase()} jacket with curved warm-ivory panels, restrained contrast piping, and a polished metal zip.`}
                productMaterial="Premium cotton twill with smooth satin details and a lightweight lining."
                sizeGuideData={SIZE_GUIDE}
                outfitBuilderSource="ai-stylist"
                instantOutfitLooks={ARC_JACKET_OUTFIT_LOOKS}
                instantOutfitResults={
                  ARC_JACKET_OUTFIT_RESULTS_BY_COLOUR[activeColour.slug]
                }
                guidedDemoAutoplay
                usePresetProfileOnly
                showHeaderControls={false}
                presetProfile={{
                  id: "arc-jacket-demo-model",
                  gender: "male",
                  photoUrl: ARC_JACKET_RAW_MODEL_PHOTO,
                  height: 180,
                  weight: 78,
                  heightUnit: "cm",
                  weightUnit: "kg",
                  age: 28,
                }}
                productUrl={productUrl}
                buttonText="Find my size & try it on"
                buttonIcon={<Ruler size={18} weight="bold" />}
                showPoweredBy
                className={styles.sdkRoot}
                classNames={{ button: styles.sdkButton }}
                addToBagLabel="Save to look"
                continueShoppingLabel="Keep styling"
                backToProductPageLabel="Back to Arc Jacket"
              />
            </div>
          </article>
        </div>
      </div>
      <MerchantSizeGuideModal
        open={sizeGuideOpen}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
        onClose={() => setSizeGuideOpen(false)}
      />
    </section>
  );
}
