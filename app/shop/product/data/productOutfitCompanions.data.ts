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
 * PDP companion pieces for prepared women demos. The two showcase products
 * for each slot are added by the mapper before these three, producing five
 * genuinely different replacement options per category.
 */
export const WOMEN_SDK_EXTRA_COMPANIONS: Partial<
  Record<ShowcaseSlot, ProductOutfitCompanion[]>
> = {
  top: [
    {
      slot: "top",
      productId: "daily-edit-vela-denim",
      title: "Vela Cropped Denim",
      image: "/media/global-shop/daily-edit-pdp-v1/vela-front.png",
      color: "Indigo",
      recommendedSize: "M",
      url: "/shop/product/daily-edit-vela-denim",
    },
    {
      slot: "top",
      productId: "daily-edit-signal-shell",
      title: "Signal Sport Shell",
      image: "/media/global-shop/daily-edit-pdp-v1/signal-front.png",
      color: "Signal coral",
      recommendedSize: "M",
      url: "/shop/product/daily-edit-signal-shell",
    },
    {
      slot: "top",
      productId: "daily-edit-noir-halo",
      title: "Noir Halo Blazer",
      image: "/media/global-shop/daily-edit-pdp-v1/noir-front.png",
      color: "Black",
      recommendedSize: "M",
      url: "/shop/product/daily-edit-noir-halo",
    },
  ],
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

// Kept as an alias for callers and tests written for the original first demo.
export const CAMEL_BLAZER_EXTRA_COMPANIONS = WOMEN_SDK_EXTRA_COMPANIONS;

const ARC_OUTFIT_ROOT = "/media/global-shop/arc-jacket-demo-v2/outfits";

/**
 * Five coordinated underlayers, shoes, and sunglasses for the Cobalt Track
 * Set. The set already contains its ivory trouser, so no bottom or bag is
 * added to its prepared outfit builder.
 */
export const COBALT_SET_COMPANIONS: Partial<
  Record<ShowcaseSlot, ProductOutfitCompanion[]>
> = {
  top: [
    {
      slot: "top",
      productId: "men-heather-grey-boxy-hoodie",
      title: "Heather Grey Boxy Hoodie",
      image: `${ARC_OUTFIT_ROOT}/look-01/heather-grey-boxy-hoodie.png`,
      color: "Heather grey",
      recommendedSize: "M",
    },
    {
      slot: "top",
      productId: "men-washed-black-layered-long-sleeve",
      title: "Washed Black Layered Long Sleeve",
      image: `${ARC_OUTFIT_ROOT}/look-02/washed-black-layered-long-sleeve.png`,
      color: "Washed black",
      recommendedSize: "M",
    },
    {
      slot: "top",
      productId: "men-ivory-waffle-long-sleeve",
      title: "Ivory Waffle Long Sleeve",
      image: `${ARC_OUTFIT_ROOT}/look-03/ivory-waffle-long-sleeve.png`,
      color: "Warm ivory",
      recommendedSize: "M",
    },
    {
      slot: "top",
      productId: "men-charcoal-funnel-sweatshirt",
      title: "Charcoal Funnel Sweatshirt",
      image: `${ARC_OUTFIT_ROOT}/look-04/charcoal-funnel-sweatshirt.png`,
      color: "Charcoal",
      recommendedSize: "M",
    },
    {
      slot: "top",
      productId: "men-charcoal-white-layered-top",
      title: "Charcoal & White Layered Top",
      image: `${ARC_OUTFIT_ROOT}/look-05/charcoal-white-layered-top.png`,
      color: "Charcoal and white",
      recommendedSize: "M",
    },
  ],
  shoe: [
    {
      slot: "shoe",
      productId: "men-black-white-skate-sneakers",
      title: "Black & White Skate Sneakers",
      image: `${ARC_OUTFIT_ROOT}/look-01/black-white-skate-sneakers.png`,
      color: "Black and white",
      recommendedSize: "EU 43",
    },
    {
      slot: "shoe",
      productId: "men-black-technical-runners",
      title: "Black Technical Runners",
      image: `${ARC_OUTFIT_ROOT}/look-02/black-technical-runners.png`,
      color: "Black",
      recommendedSize: "EU 43",
    },
    {
      slot: "shoe",
      productId: "men-cobalt-ivory-high-tops",
      title: "Cobalt & Ivory High-Tops",
      image: `${ARC_OUTFIT_ROOT}/look-03/cobalt-ivory-high-tops.png`,
      color: "Cobalt and ivory",
      recommendedSize: "EU 43",
    },
    {
      slot: "shoe",
      productId: "men-black-high-top-sneaker-boots",
      title: "Black High-Top Sneaker Boots",
      image: `${ARC_OUTFIT_ROOT}/look-04/black-high-top-sneaker-boots.png`,
      color: "Black",
      recommendedSize: "EU 43",
    },
    {
      slot: "shoe",
      productId: "men-ivory-black-chunky-runners",
      title: "Ivory & Black Chunky Runners",
      image: `${ARC_OUTFIT_ROOT}/look-05/ivory-black-chunky-runners.png`,
      color: "Ivory and black",
      recommendedSize: "EU 43",
    },
  ],
  accessory: [
    {
      slot: "accessory",
      productId: "men-matte-black-slim-rectangle-sunglasses",
      title: "Matte Black Slim Rectangle Sunglasses",
      image: `${ARC_OUTFIT_ROOT}/look-01/matte-black-slim-rectangle-sunglasses.png`,
      color: "Matte black",
      recommendedSize: "One size",
    },
    {
      slot: "accessory",
      productId: "men-glossy-black-angular-wrap-sunglasses",
      title: "Glossy Black Angular Wrap Sunglasses",
      image: `${ARC_OUTFIT_ROOT}/look-02/glossy-black-angular-wrap-sunglasses.png`,
      color: "Glossy black",
      recommendedSize: "One size",
    },
    {
      slot: "accessory",
      productId: "men-cobalt-ivory-geometric-sunglasses",
      title: "Cobalt & Ivory Geometric Sunglasses",
      image: `${ARC_OUTFIT_ROOT}/look-03/translucent-cobalt-ivory-geometric-sunglasses.png`,
      color: "Cobalt and ivory",
      recommendedSize: "One size",
    },
    {
      slot: "accessory",
      productId: "men-gunmetal-narrow-shield-sunglasses",
      title: "Gunmetal Narrow Shield Sunglasses",
      image: `${ARC_OUTFIT_ROOT}/look-04/gunmetal-black-narrow-shield-sunglasses.png`,
      color: "Gunmetal black",
      recommendedSize: "One size",
    },
    {
      slot: "accessory",
      productId: "men-ivory-black-sport-sunglasses",
      title: "Ivory & Black Sport Sunglasses",
      image: `${ARC_OUTFIT_ROOT}/look-05/ivory-black-sport-rectangle-sunglasses.png`,
      color: "Ivory and black",
      recommendedSize: "One size",
    },
  ],
};

export const MEN_SDK_COMPANIONS: Partial<
  Record<ShowcaseSlot, ProductOutfitCompanion[]>
> = {
  ...COBALT_SET_COMPANIONS,
  bottom: [
    {
      slot: "bottom",
      productId: "men-washed-black-wide-cargo-jeans",
      title: "Washed Black Wide Cargo Jeans",
      image: `${ARC_OUTFIT_ROOT}/look-01/washed-black-wide-cargo-jeans.png`,
      color: "Washed black",
      recommendedSize: "32",
    },
    {
      slot: "bottom",
      productId: "men-graphite-parachute-cargos",
      title: "Graphite Parachute Cargos",
      image: `${ARC_OUTFIT_ROOT}/look-02/graphite-parachute-cargos.png`,
      color: "Graphite",
      recommendedSize: "M",
    },
    {
      slot: "bottom",
      productId: "men-charcoal-wide-carpenter-jeans",
      title: "Charcoal Wide Carpenter Jeans",
      image: `${ARC_OUTFIT_ROOT}/look-03/charcoal-wide-carpenter-jeans.png`,
      color: "Charcoal",
      recommendedSize: "32",
    },
    {
      slot: "bottom",
      productId: "men-black-coated-utility-trousers",
      title: "Black Coated Utility Trousers",
      image: `${ARC_OUTFIT_ROOT}/look-04/black-coated-utility-trousers.png`,
      color: "Coated black",
      recommendedSize: "32",
    },
    {
      slot: "bottom",
      productId: "men-black-ivory-wide-track-pants",
      title: "Black & Ivory Wide Track Pants",
      image: `${ARC_OUTFIT_ROOT}/look-05/black-ivory-wide-track-pants.png`,
      color: "Black and ivory",
      recommendedSize: "M",
    },
  ],
};
