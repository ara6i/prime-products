import type { ShowcaseSlot } from "../../data/showcaseCatalog.data";

export type ProductOutfitCompanion = {
  slot: ShowcaseSlot;
  productId: string;
  title: string;
  image: string;
  color: string;
  recommendedSize: string;
  url?: string;
};

const WOMEN_SDK_ASSET_ROOT =
  "/media/global-shop/sdk-companions-v1/women";

/**
 * PDP-only companion pieces for the prepared Camel Blazer demo. The two
 * showcase products for each slot are added by the mapper before these three,
 * producing five genuinely different replacement options per category.
 */
export const CAMEL_BLAZER_EXTRA_COMPANIONS: Partial<
  Record<ShowcaseSlot, ProductOutfitCompanion[]>
> = {
  bottom: [
    {
      slot: "bottom",
      productId: "women-cream-wide-leg-trouser",
      title: "Cream Wide-Leg Trouser",
      image: `${WOMEN_SDK_ASSET_ROOT}/bottom/cream-wide-leg-trouser.png`,
      color: "Soft cream",
      recommendedSize: "28",
    },
    {
      slot: "bottom",
      productId: "women-espresso-satin-midi-skirt",
      title: "Espresso Satin Midi Skirt",
      image: `${WOMEN_SDK_ASSET_ROOT}/bottom/espresso-satin-midi-skirt.png`,
      color: "Deep espresso",
      recommendedSize: "M",
    },
    {
      slot: "bottom",
      productId: "women-ecru-straight-jean",
      title: "Ecru Straight-Leg Jean",
      image: `${WOMEN_SDK_ASSET_ROOT}/bottom/ecru-straight-jean.png`,
      color: "Warm ecru",
      recommendedSize: "28",
    },
  ],
  shoe: [
    {
      slot: "shoe",
      productId: "women-chocolate-leather-loafer",
      title: "Chocolate Leather Loafer",
      image: `${WOMEN_SDK_ASSET_ROOT}/shoe/chocolate-leather-loafer.png`,
      color: "Dark chocolate",
      recommendedSize: "EU 38",
    },
    {
      slot: "shoe",
      productId: "women-taupe-suede-ankle-boot",
      title: "Taupe Suede Ankle Boot",
      image: `${WOMEN_SDK_ASSET_ROOT}/shoe/taupe-suede-ankle-boot.png`,
      color: "Warm taupe",
      recommendedSize: "EU 38",
    },
    {
      slot: "shoe",
      productId: "women-burgundy-mary-jane-pump",
      title: "Burgundy Mary Jane Pump",
      image: `${WOMEN_SDK_ASSET_ROOT}/shoe/burgundy-mary-jane-pump.png`,
      color: "Muted burgundy",
      recommendedSize: "EU 38",
    },
  ],
  bag: [
    {
      slot: "bag",
      productId: "women-cognac-east-west-bag",
      title: "Cognac East-West Bag",
      image: `${WOMEN_SDK_ASSET_ROOT}/bag/cognac-east-west-bag.png`,
      color: "Warm cognac",
      recommendedSize: "One size",
    },
    {
      slot: "bag",
      productId: "women-burgundy-top-handle-bag",
      title: "Burgundy Top-Handle Bag",
      image: `${WOMEN_SDK_ASSET_ROOT}/bag/burgundy-top-handle-bag.png`,
      color: "Muted burgundy",
      recommendedSize: "One size",
    },
    {
      slot: "bag",
      productId: "women-black-pebbled-crossbody",
      title: "Black Pebbled Crossbody",
      image: `${WOMEN_SDK_ASSET_ROOT}/bag/black-pebbled-crossbody.png`,
      color: "Black",
      recommendedSize: "One size",
    },
  ],
  accessory: [
    {
      slot: "accessory",
      productId: "women-brushed-gold-pendant",
      title: "Brushed-Gold Pendant",
      image: `${WOMEN_SDK_ASSET_ROOT}/accessory/brushed-gold-pendant.png`,
      color: "Brushed gold",
      recommendedSize: "One size",
    },
    {
      slot: "accessory",
      productId: "women-tortoiseshell-rectangle-sunglasses",
      title: "Tortoiseshell Rectangle Sunglasses",
      image: `${WOMEN_SDK_ASSET_ROOT}/accessory/tortoiseshell-rectangle-sunglasses.png`,
      color: "Dark tortoiseshell",
      recommendedSize: "One size",
    },
    {
      slot: "accessory",
      productId: "women-pearl-drop-earrings",
      title: "Pearl Drop Earrings",
      image: `${WOMEN_SDK_ASSET_ROOT}/accessory/pearl-drop-earrings.png`,
      color: "Ivory and brushed gold",
      recommendedSize: "One size",
    },
  ],
};
