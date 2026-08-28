"use client";

import { ArrowLeft, ArrowRight, Ruler } from "@phosphor-icons/react";
import type { PrimeStyleTryonProps } from "@primestyleai/tryon/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, type CSSProperties } from "react";
import {
  ARC_JACKET_SIZE_ROWS,
  ARC_JACKET_SIZES,
  type ArcJacketSize,
} from "./arcJacketSizeGuide";
import { MerchantSizeGuideModal } from "./MerchantSizeGuideModal";
import styles from "./merchantPdpSdk.module.css";

const PrimeStyleTryon = dynamic<PrimeStyleTryonProps>(
  () =>
    import("../../../../../primestyleai-tryon-sdk/dist/react/index.js").then(
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

export function MerchantPdpSdkSection() {
  const [selectedSize, setSelectedSize] = useState<ArcJacketSize>("M");
  const [selectedColour, setSelectedColour] = useState(0);
  const [bagAdded, setBagAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const activeColour = COLOURS[selectedColour];

  const addToBag = () => setBagAdded(true);

  const chooseColour = (index: number) => {
    setSelectedColour(index);
    setBagAdded(false);
  };

  const moveColour = (direction: -1 | 1) => {
    chooseColour((selectedColour + direction + COLOURS.length) % COLOURS.length);
  };

  const previousColour = COLOURS[(selectedColour - 1 + COLOURS.length) % COLOURS.length];
  const nextColour = COLOURS[(selectedColour + 1) % COLOURS.length];

  return (
    <section
      id="ai-fitting"
      className={styles.section}
      aria-labelledby="merchant-sdk-product-title"
    >
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
                    className={size === selectedSize ? styles.sizeActive : undefined}
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
            <p className={styles.productType}>Women&apos;s jacket</p>
            <h2 id="merchant-sdk-product-title">Arc Jacket</h2>
            <p className={styles.productDescription}>
              A sculpted cropped jacket with curved ivory panels and one clean
              accent line. Bright enough to feel joyful, restrained enough to
              wear every day.
            </p>

            <PrimeStyleTryon
              key={activeColour.slug}
              apiUrl={
                process.env.NEXT_PUBLIC_API_BASE_URL ||
                process.env.NEXT_PUBLIC_API_URL ||
                "http://localhost:4000"
              }
              productId={`merchant-arc-jacket-${activeColour.slug}`}
              productImage={activeColour.image}
              productImages={COLOURS.map((colour) => colour.image)}
              garmentReferenceImage={activeColour.image}
              productTitle={`Arc Jacket — ${activeColour.name}`}
              productCategory="Women's jackets"
              productSubcategory="Cropped jacket"
              productGender="female"
              productType="Sculpted cropped jacket"
              productFitType="apparel"
              productVendor="Merchant Store"
              productTags={[
                "women",
                "jacket",
                "structured",
                "curved-panel",
                "cropped",
                activeColour.slug,
              ]}
              productDescription={`Cropped ${activeColour.name.toLowerCase()} jacket with curved warm-ivory panels, restrained contrast piping, and a polished metal zip.`}
              productMaterial="Premium cotton twill with smooth satin details and a lightweight lining."
              sizeGuideData={SIZE_GUIDE}
              productUrl="/merchants#ai-fitting"
              buttonText="Find my size & try it on"
              buttonIcon={<Ruler size={18} weight="bold" />}
              showPoweredBy
              addToBagLabel="Add Arc Jacket to bag"
              onAddToBag={addToBag}
              className={styles.sdkRoot}
              classNames={{ button: styles.sdkButton }}
            />
          </article>
        </div>

        <footer className={styles.productFooter} aria-label="Product navigation">
          <div className={styles.footerNavigation}>
            <button
              type="button"
              className={styles.footerControl}
              onClick={() => moveColour(-1)}
              aria-label={`Previous colour: ${previousColour.name}`}
            >
              <span>Prev</span>
              <ArrowLeft
                size={32}
                weight="regular"
                preserveAspectRatio="none"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className={styles.footerControl}
              onClick={() => moveColour(1)}
              aria-label={`Next colour: ${nextColour.name}`}
            >
              <span>Next</span>
              <ArrowRight
                size={32}
                weight="regular"
                preserveAspectRatio="none"
                aria-hidden="true"
              />
            </button>
          </div>
          <p className={styles.footerColour} aria-live="polite">
            <span>{String(selectedColour + 1).padStart(2, "0")} / {String(COLOURS.length).padStart(2, "0")}</span>
            {activeColour.name}
          </p>
          <button
            type="button"
            className={styles.addToBagButton}
            onClick={addToBag}
            aria-live="polite"
          >
            {bagAdded ? "Added to bag" : "Add to bag — $148"}
          </button>
        </footer>
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
