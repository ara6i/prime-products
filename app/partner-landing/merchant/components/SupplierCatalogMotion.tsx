import Image from "next/image";
import type { CSSProperties } from "react";
import styles from "./merchantSupplierSections.module.css";

const catalogItems = [
  {
    id: "catalog-01",
    mutedSrc: "satin-dress.png",
    colorSrc: "cobalt-handbag.png",
    lane: "0%",
    delay: "0s",
  },
  {
    id: "catalog-02",
    mutedSrc: "tailored-jacket.png",
    colorSrc: "satin-dress.png",
    lane: "33.4%",
    delay: "-0.8s",
  },
  {
    id: "catalog-03",
    mutedSrc: "red-slingbacks.png",
    colorSrc: "sunflower-trousers.png",
    lane: "66.8%",
    delay: "-1.6s",
  },
  {
    id: "catalog-04",
    mutedSrc: "black-trousers.png",
    colorSrc: "coral-jacket.png",
    lane: "0%",
    delay: "-2.4s",
  },
  {
    id: "catalog-05",
    mutedSrc: "gold-earrings.png",
    colorSrc: "cobalt-handbag.png",
    lane: "33.4%",
    delay: "-3.2s",
  },
  {
    id: "catalog-06",
    mutedSrc: "satin-dress.png",
    colorSrc: "red-slingbacks.png",
    lane: "66.8%",
    delay: "-4s",
  },
  {
    id: "catalog-07",
    mutedSrc: "tailored-jacket.png",
    colorSrc: "lime-sneakers.png",
    lane: "0%",
    delay: "-4.8s",
  },
  {
    id: "catalog-08",
    mutedSrc: "red-slingbacks.png",
    colorSrc: "coral-jacket.png",
    lane: "33.4%",
    delay: "-5.6s",
  },
  {
    id: "catalog-09",
    mutedSrc: "black-trousers.png",
    colorSrc: "cobalt-handbag.png",
    lane: "66.8%",
    delay: "-6.4s",
  },
  {
    id: "catalog-10",
    mutedSrc: "gold-earrings.png",
    colorSrc: "violet-dress.png",
    lane: "0%",
    delay: "-7.2s",
  },
  {
    id: "catalog-11",
    mutedSrc: "satin-dress.png",
    colorSrc: "lime-sneakers.png",
    lane: "33.4%",
    delay: "-8s",
  },
  {
    id: "catalog-12",
    mutedSrc: "tailored-jacket.png",
    colorSrc: "violet-dress.png",
    lane: "66.8%",
    delay: "-8.8s",
  },
  {
    id: "catalog-13",
    mutedSrc: "red-slingbacks.png",
    colorSrc: "sunflower-trousers.png",
    lane: "0%",
    delay: "-9.6s",
  },
  {
    id: "catalog-14",
    mutedSrc: "black-trousers.png",
    colorSrc: "violet-dress.png",
    lane: "33.4%",
    delay: "-10.4s",
  },
  {
    id: "catalog-15",
    mutedSrc: "gold-earrings.png",
    colorSrc: "coral-jacket.png",
    lane: "66.8%",
    delay: "-11.2s",
  },
  {
    id: "catalog-16",
    mutedSrc: "satin-dress.png",
    colorSrc: "red-slingbacks.png",
    lane: "0%",
    delay: "-12s",
  },
  {
    id: "catalog-17",
    mutedSrc: "tailored-jacket.png",
    colorSrc: "gold-earrings.png",
    lane: "33.4%",
    delay: "-12.8s",
  },
  {
    id: "catalog-18",
    mutedSrc: "red-slingbacks.png",
    colorSrc: "lime-sneakers.png",
    lane: "66.8%",
    delay: "-13.6s",
  },
] as const;

const cardRoot =
  "/media/partner-landing/merchant-network/supplier-catalog-cards-v2";
const mutedCardRoot =
  "/media/partner-landing/merchant-network/supplier-catalog-cards-muted-v2";

const laneMotion = {
  "0%": {
    edgeY: "-34px",
    centerY: "18px",
    startRoll: "4.5deg",
    endRoll: "-4.5deg",
  },
  "33.4%": {
    edgeY: "0px",
    centerY: "0px",
    startRoll: "1.5deg",
    endRoll: "-1.5deg",
  },
  "66.8%": {
    edgeY: "34px",
    centerY: "-18px",
    startRoll: "-4.5deg",
    endRoll: "4.5deg",
  },
} as const;

type MotionStyle = CSSProperties & {
  "--catalog-lane": string;
  "--catalog-delay": string;
  "--catalog-edge-y": string;
  "--catalog-center-y": string;
  "--catalog-start-roll": string;
  "--catalog-end-roll": string;
};

function CatalogStream({ tone }: { tone: "muted" | "color" }) {
  const streamClass =
    tone === "muted"
      ? `${styles.catalogStream} ${styles.catalogStreamMuted}`
      : `${styles.catalogStream} ${styles.catalogStreamColor}`;
  const streamRoot = tone === "muted" ? mutedCardRoot : cardRoot;

  return (
    <div className={streamClass} aria-hidden="true">
      {catalogItems.map((item) => {
        const path = laneMotion[item.lane];
        const cardSrc = tone === "muted" ? item.mutedSrc : item.colorSrc;
        const motionStyle: MotionStyle = {
          "--catalog-lane": item.lane,
          "--catalog-delay": item.delay,
          "--catalog-edge-y": path.edgeY,
          "--catalog-center-y": path.centerY,
          "--catalog-start-roll": path.startRoll,
          "--catalog-end-roll": path.endRoll,
        };

        return (
          <div className={styles.catalogMover} key={item.id} style={motionStyle}>
            <span className={styles.catalogProductCard}>
              <Image
                src={`${streamRoot}/${cardSrc}`}
                alt=""
                fill
                sizes="(max-width: 760px) 118px, 200px"
                quality={90}
                unoptimized
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function SupplierCatalogMotion() {
  return (
    <figure
      className={styles.catalogMotion}
      role="img"
      aria-label="Supplier product cards move from a grayscale catalog to vivid merchant-ready listings after they cross the blue approval line."
    >
      <CatalogStream tone="muted" />
      <CatalogStream tone="color" />

      <Image
        className={styles.catalogMotionLine}
        src="/media/partner-landing/merchant-network/supplier-catalog-line-only-v1.png"
        alt=""
        width={100}
        height={800}
        sizes="44px"
        unoptimized
      />
    </figure>
  );
}
