import { shopRunwayLooks } from "../../runway/data/shopRunway.data";

type PrimeStyleOutfitSlot =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "shoe"
  | "bag";

type PrimeStyleOutfitAlternative = {
  slot: PrimeStyleOutfitSlot;
  productId: string;
  title: string;
  image: string;
  url?: string;
  color: string;
  garmentType: string;
  recommendedSize: string;
};

type PrimeStyleOutfitItem = PrimeStyleOutfitAlternative & {
  selected: boolean;
  alternatives?: PrimeStyleOutfitAlternative[];
};

type PrimeStyleOutfitLook = {
  id: string;
  label: string;
  items: PrimeStyleOutfitItem[];
};

type RunwayProductPresentation = {
  slot: PrimeStyleOutfitSlot;
  color: string;
  garmentType: string;
  recommendedSize: string;
};

const RUNWAY_PRODUCT_PRESENTATION: Record<string, RunwayProductPresentation> = {
  "signal-shell": {
    slot: "outerwear",
    color: "Coral",
    garmentType: "Technical shell",
    recommendedSize: "M",
  },
  "arc-mini": {
    slot: "bag",
    color: "Coral",
    garmentType: "Mini bag",
    recommendedSize: "One size",
  },
  "cloud-runner": {
    slot: "shoe",
    color: "White",
    garmentType: "Sneakers",
    recommendedSize: "8",
  },
  "cloudline-layer": {
    slot: "outerwear",
    color: "Camel",
    garmentType: "Long coat",
    recommendedSize: "M",
  },
  "noir-halo-camel": {
    slot: "dress",
    color: "Black",
    garmentType: "Mini dress",
    recommendedSize: "M",
  },
  "noir-step-boot": {
    slot: "shoe",
    color: "Black",
    garmentType: "Ankle boots",
    recommendedSize: "8",
  },
  "lilac-jacket": {
    slot: "outerwear",
    color: "Lilac",
    garmentType: "Volume jacket",
    recommendedSize: "M",
  },
  "lavender-mini": {
    slot: "bag",
    color: "Lavender",
    garmentType: "Mini bag",
    recommendedSize: "One size",
  },
  "lime-column": {
    slot: "bottom",
    color: "Lime",
    garmentType: "Midi skirt",
    recommendedSize: "M",
  },
  "cobalt-track": {
    slot: "top",
    color: "Cobalt",
    garmentType: "Track jacket",
    recommendedSize: "M",
  },
  "form-handbag": {
    slot: "bag",
    color: "Cobalt",
    garmentType: "Shoulder bag",
    recommendedSize: "One size",
  },
  "aero-runner": {
    slot: "shoe",
    color: "White",
    garmentType: "Sneakers",
    recommendedSize: "8",
  },
  "noir-halo": {
    slot: "outerwear",
    color: "Black",
    garmentType: "Sculpted blazer",
    recommendedSize: "M",
  },
  "ivory-column": {
    slot: "shoe",
    color: "Ivory",
    garmentType: "Column boots",
    recommendedSize: "8",
  },
  "signal-arc": {
    slot: "bag",
    color: "Coral",
    garmentType: "Mini bag",
    recommendedSize: "One size",
  },
};

function mapRunwayProduct(
  product: (typeof shopRunwayLooks)[number]["products"][number],
): PrimeStyleOutfitItem {
  const presentation = RUNWAY_PRODUCT_PRESENTATION[product.id];
  if (!presentation) {
    throw new Error(`Missing outfit presentation for ${product.id}`);
  }

  return {
    ...presentation,
    productId: product.id,
    title: product.name,
    image: product.image,
    selected: true,
  };
}

const runwayItems = shopRunwayLooks.flatMap((look) =>
  look.products.map(mapRunwayProduct),
);

function alternativesFor(item: PrimeStyleOutfitItem) {
  return runwayItems
    .filter(
      (candidate) =>
        candidate.slot === item.slot && candidate.productId !== item.productId,
    )
    .slice(0, 4)
    .map((candidate) => ({
      slot: candidate.slot,
      productId: candidate.productId,
      title: candidate.title,
      image: candidate.image,
      url: candidate.url,
      color: candidate.color,
      garmentType: candidate.garmentType,
      recommendedSize: candidate.recommendedSize,
    }));
}

/** The five generated, shoppable looks already used by the shop landing page. */
export const productInstantOutfitLooks: PrimeStyleOutfitLook[] =
  shopRunwayLooks.map((look) => ({
    id: look.id,
    label: look.title,
    items: look.products.map((product) => {
      const item = mapRunwayProduct(product);
      return {
        ...item,
        alternatives: alternativesFor(item),
      };
    }),
  }));
