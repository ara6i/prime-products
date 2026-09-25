import type {
  PrimeStyleInstantOutfitResult,
  PrimeStyleOutfitLook,
} from "@primestyleai/tryon-shop/react";

const OUTFIT_ASSET_ROOT = "/media/global-shop/arc-jacket-demo-v2/outfits";

export const ARC_JACKET_OUTFIT_LOOKS: PrimeStyleOutfitLook[] = [
  {
    id: "arc-concrete-layer",
    label: "Concrete Layer",
    items: [
      {
        slot: "top",
        productId: "arc-concrete-layer-grey-hoodie",
        title: "Heather Grey Boxy Hoodie",
        image: `${OUTFIT_ASSET_ROOT}/look-01/heather-grey-boxy-hoodie.png`,
        color: "Heather grey",
        garmentType: "Hoodie",
        recommendedSize: "M",
      },
      {
        slot: "bottom",
        productId: "arc-concrete-layer-cargo-jeans",
        title: "Washed Black Wide Cargo Jeans",
        image: `${OUTFIT_ASSET_ROOT}/look-01/washed-black-wide-cargo-jeans.png`,
        color: "Washed black",
        garmentType: "Cargo jeans",
        recommendedSize: "M",
      },
      {
        slot: "shoe",
        productId: "arc-concrete-layer-skate-sneakers",
        title: "Black & White Skate Sneakers",
        image: `${OUTFIT_ASSET_ROOT}/look-01/black-white-skate-sneakers.png`,
        color: "Black / white",
        garmentType: "Sneakers",
        recommendedSize: "US 10",
      },
      {
        slot: "accessory",
        productId: "arc-concrete-layer-slim-rectangle-sunglasses",
        title: "Matte Black Slim Rectangle Sunglasses",
        image: `${OUTFIT_ASSET_ROOT}/look-01/matte-black-slim-rectangle-sunglasses.png`,
        color: "Matte black",
        garmentType: "Sunglasses",
        recommendedSize: "52 mm",
      },
    ],
  },
  {
    id: "arc-night-transit",
    label: "Night Transit",
    items: [
      {
        slot: "top",
        productId: "arc-night-transit-layered-top",
        title: "Washed Black Layered Long Sleeve",
        image: `${OUTFIT_ASSET_ROOT}/look-02/washed-black-layered-long-sleeve.png`,
        color: "Washed black / white",
        garmentType: "Layered long sleeve",
        recommendedSize: "M",
      },
      {
        slot: "bottom",
        productId: "arc-night-transit-parachute-cargos",
        title: "Graphite Parachute Cargos",
        image: `${OUTFIT_ASSET_ROOT}/look-02/graphite-parachute-cargos.png`,
        color: "Graphite",
        garmentType: "Parachute cargos",
        recommendedSize: "M",
      },
      {
        slot: "shoe",
        productId: "arc-night-transit-technical-runners",
        title: "Black Technical Runners",
        image: `${OUTFIT_ASSET_ROOT}/look-02/black-technical-runners.png`,
        color: "Black / cobalt",
        garmentType: "Technical sneakers",
        recommendedSize: "US 10",
      },
      {
        slot: "accessory",
        productId: "arc-night-transit-angular-wrap-sunglasses",
        title: "Glossy Black Angular Wrap Sunglasses",
        image: `${OUTFIT_ASSET_ROOT}/look-02/glossy-black-angular-wrap-sunglasses.png`,
        color: "Glossy black",
        garmentType: "Sunglasses",
        recommendedSize: "58 mm",
      },
    ],
  },
  {
    id: "arc-ice-signal",
    label: "Ice Signal",
    items: [
      {
        slot: "top",
        productId: "arc-ice-signal-waffle-top",
        title: "Ivory Waffle Long Sleeve",
        image: `${OUTFIT_ASSET_ROOT}/look-03/ivory-waffle-long-sleeve.png`,
        color: "Warm ivory",
        garmentType: "Waffle long sleeve",
        recommendedSize: "M",
      },
      {
        slot: "bottom",
        productId: "arc-ice-signal-carpenter-jeans",
        title: "Charcoal Wide Carpenter Jeans",
        image: `${OUTFIT_ASSET_ROOT}/look-03/charcoal-wide-carpenter-jeans.png`,
        color: "Charcoal",
        garmentType: "Carpenter jeans",
        recommendedSize: "M",
      },
      {
        slot: "shoe",
        productId: "arc-ice-signal-high-tops",
        title: "Cobalt & Ivory High-Tops",
        image: `${OUTFIT_ASSET_ROOT}/look-03/cobalt-ivory-high-tops.png`,
        color: "Cobalt / ivory",
        garmentType: "High-top sneakers",
        recommendedSize: "US 10",
      },
      {
        slot: "accessory",
        productId: "arc-ice-signal-geometric-sunglasses",
        title: "Cobalt & Ivory Geometric Sunglasses",
        image: `${OUTFIT_ASSET_ROOT}/look-03/translucent-cobalt-ivory-geometric-sunglasses.png`,
        color: "Cobalt / ivory",
        garmentType: "Sunglasses",
        recommendedSize: "54 mm",
      },
    ],
  },
  {
    id: "arc-shadow-hardware",
    label: "Shadow Hardware",
    items: [
      {
        slot: "top",
        productId: "arc-shadow-hardware-funnel-sweatshirt",
        title: "Charcoal Funnel Sweatshirt",
        image: `${OUTFIT_ASSET_ROOT}/look-04/charcoal-funnel-sweatshirt.png`,
        color: "Washed charcoal",
        garmentType: "Quarter-zip sweatshirt",
        recommendedSize: "M",
      },
      {
        slot: "bottom",
        productId: "arc-shadow-hardware-coated-trousers",
        title: "Black Coated Utility Trousers",
        image: `${OUTFIT_ASSET_ROOT}/look-04/black-coated-utility-trousers.png`,
        color: "Black",
        garmentType: "Utility trousers",
        recommendedSize: "M",
      },
      {
        slot: "shoe",
        productId: "arc-shadow-hardware-sneaker-boots",
        title: "Black High-Top Sneaker Boots",
        image: `${OUTFIT_ASSET_ROOT}/look-04/black-high-top-sneaker-boots.png`,
        color: "Black",
        garmentType: "Sneaker boots",
        recommendedSize: "US 10",
      },
      {
        slot: "accessory",
        productId: "arc-shadow-hardware-shield-sunglasses",
        title: "Gunmetal Black Narrow Shield Sunglasses",
        image: `${OUTFIT_ASSET_ROOT}/look-04/gunmetal-black-narrow-shield-sunglasses.png`,
        color: "Gunmetal / black",
        garmentType: "Sunglasses",
        recommendedSize: "60 mm",
      },
    ],
  },
  {
    id: "arc-studio-track",
    label: "Studio Track",
    items: [
      {
        slot: "top",
        productId: "arc-studio-track-layered-top",
        title: "Charcoal & White Layered Top",
        image: `${OUTFIT_ASSET_ROOT}/look-05/charcoal-white-layered-top.png`,
        color: "Charcoal / white",
        garmentType: "Layered top",
        recommendedSize: "M",
      },
      {
        slot: "bottom",
        productId: "arc-studio-track-track-pants",
        title: "Black & Ivory Wide Track Pants",
        image: `${OUTFIT_ASSET_ROOT}/look-05/black-ivory-wide-track-pants.png`,
        color: "Black / ivory",
        garmentType: "Track pants",
        recommendedSize: "M",
      },
      {
        slot: "shoe",
        productId: "arc-studio-track-chunky-runners",
        title: "Ivory & Black Chunky Runners",
        image: `${OUTFIT_ASSET_ROOT}/look-05/ivory-black-chunky-runners.png`,
        color: "Ivory / black",
        garmentType: "Chunky sneakers",
        recommendedSize: "US 10",
      },
      {
        slot: "accessory",
        productId: "arc-studio-track-sport-rectangle-sunglasses",
        title: "Ivory & Black Sport Rectangle Sunglasses",
        image: `${OUTFIT_ASSET_ROOT}/look-05/ivory-black-sport-rectangle-sunglasses.png`,
        color: "Ivory / black",
        garmentType: "Sunglasses",
        recommendedSize: "55 mm",
      },
    ],
  },
];

export type ArcJacketColourSlug =
  "cobalt" | "coral" | "butter" | "mint" | "lilac";

const COLOUR_SLUGS: ArcJacketColourSlug[] = [
  "cobalt",
  "coral",
  "butter",
  "mint",
  "lilac",
];

function resultsForColour(
  colour: ArcJacketColourSlug,
): PrimeStyleInstantOutfitResult[] {
  return ARC_JACKET_OUTFIT_LOOKS.map((look, index) => ({
    lookId: look.id,
    image: `/media/global-shop/arc-jacket-demo-v2/results/${colour}/look-0${index + 1}.png`,
    recommendedSize: "M",
    confidence: "high",
    reasoning:
      "Size M preserves the Arc Jacket's intended cropped streetwear line with comfortable chest and shoulder ease.",
  }));
}

export const ARC_JACKET_OUTFIT_RESULTS_BY_COLOUR = Object.fromEntries(
  COLOUR_SLUGS.map((colour) => [colour, resultsForColour(colour)]),
) as Record<ArcJacketColourSlug, PrimeStyleInstantOutfitResult[]>;

export const ARC_JACKET_TRYON_BY_COLOUR = Object.fromEntries(
  COLOUR_SLUGS.map((colour) => [
    colour,
    `/media/global-shop/arc-jacket-demo-v2/tryon/${colour}.png`,
  ]),
) as Record<ArcJacketColourSlug, string>;

// Kept for callers that do not choose a color explicitly.
export const ARC_JACKET_OUTFIT_RESULTS =
  ARC_JACKET_OUTFIT_RESULTS_BY_COLOUR.cobalt;
