import type {
  StylistOccasion,
  StylistVibe,
} from "@/app/ai-stylist/types";

export type StylistGender = "female" | "male";
export type StylistGarmentSelection =
  | "dress"
  | "top"
  | "bottom"
  | "shoe"
  | "outerwear"
  | "bag"
  | "watch"
  | "accessory";

export interface StylistGarmentOption {
  id: StylistGarmentSelection;
  label: string;
  description: string;
  maleDescription?: string;
  asset: string;
  maleAsset?: string;
  womenOnly?: boolean;
  unavailable?: boolean;
  unavailableMessage?: string;
}

export interface StylistOccasionOption {
  id: string;
  label: string;
  api: StylistOccasion;
  vibes: StylistVibe[];
}

export const STYLIST_STEP_LABELS = [
  "Occasion",
  "Pieces",
  "Weather",
  "Budget",
  "Model",
] as const;

export const STYLIST_GARMENT_OPTIONS: StylistGarmentOption[] = [
  {
    id: "dress",
    label: "Dress",
    description: "One-piece looks and gowns",
    asset: "/images/ai-stylist/onboarding/garments/garment-dress-v2.webp",
    womenOnly: true,
  },
  {
    id: "top",
    label: "Tops",
    description: "Shirts, blouses and knitwear",
    maleDescription: "Shirts, polos and knitwear",
    asset: "/images/ai-stylist/onboarding/garments/garment-top-v2.webp",
    maleAsset: "/images/ai-stylist/onboarding/garments/garment-top-male-v2.webp",
  },
  {
    id: "bottom",
    label: "Bottoms",
    description: "Trousers, denim and skirts",
    maleDescription: "Trousers, denim and shorts",
    asset: "/images/ai-stylist/onboarding/garments/garment-bottom-v2.webp",
    maleAsset: "/images/ai-stylist/onboarding/garments/garment-bottom-male-v2.webp",
  },
  {
    id: "shoe",
    label: "Shoes",
    description: "Footwear for the look",
    asset: "/images/ai-stylist/onboarding/garments/garment-shoes-v2.webp",
    maleAsset: "/images/ai-stylist/onboarding/garments/garment-shoes-male-v2.webp",
  },
  {
    id: "outerwear",
    label: "Outerwear",
    description: "Coats, jackets and layers",
    asset: "/images/ai-stylist/onboarding/garments/garment-outerwear-v2.webp",
    maleAsset: "/images/ai-stylist/onboarding/garments/garment-outerwear-male-v2.webp",
  },
  {
    id: "bag",
    label: "Bags",
    description: "Totes, backpacks and shoulder bags",
    maleDescription: "Backpacks, messenger and crossbody bags",
    asset: "/images/ai-stylist/onboarding/garments/garment-bag-v2.webp",
    maleAsset: "/images/ai-stylist/onboarding/garments/garment-bag-male-v2.webp",
  },
  {
    id: "watch",
    label: "Watches",
    description: "Classic and statement watches",
    asset: "/images/ai-stylist/onboarding/garments/garment-watch-v2.webp",
    maleAsset: "/images/ai-stylist/onboarding/garments/garment-watch-male-v2.webp",
    unavailable: true,
    unavailableMessage: "No refined watches yet",
  },
  {
    id: "accessory",
    label: "Accessories",
    description: "Sunglasses, jewelry, scarves and belts",
    maleDescription: "Sunglasses, ties, belts and cufflinks",
    asset: "/images/ai-stylist/onboarding/garments/garment-accessories-v2.webp",
    maleAsset: "/images/ai-stylist/onboarding/garments/garment-accessories-male-v2.webp",
  },
];

export function garmentOptionAsset(
  option: StylistGarmentOption,
  gender: StylistGender,
): string {
  return gender === "male" && option.maleAsset
    ? option.maleAsset
    : option.asset;
}

export function garmentOptionDescription(
  option: StylistGarmentOption,
  gender: StylistGender,
): string {
  return gender === "male" && option.maleDescription
    ? option.maleDescription
    : option.description;
}

export const STYLIST_OCCASIONS: StylistOccasionOption[] = [
  {
    id: "casual-everyday",
    label: "Casual Everyday",
    api: "casual-day",
    vibes: ["casual"],
  },
  {
    id: "work-office",
    label: "Work / Office",
    api: "work-office",
    vibes: ["business"],
  },
  {
    id: "formal-evening",
    label: "Formal Evening",
    api: "formal-event",
    vibes: ["classic", "glamorous"],
  },
  {
    id: "wedding-guest",
    label: "Wedding Guest",
    api: "wedding-guest",
    vibes: ["romantic", "classic"],
  },
  {
    id: "date-night",
    label: "Date Night",
    api: "date-night",
    vibes: ["romantic", "glamorous"],
  },
  {
    id: "party-night",
    label: "Party / Night Out",
    api: "party",
    vibes: ["edgy", "glamorous"],
  },
  {
    id: "sports-workout",
    label: "Sports / Workout",
    api: "sports-workout",
    vibes: ["sporty"],
  },
  {
    id: "travel",
    label: "Travel",
    api: "travel",
    vibes: ["minimal", "casual"],
  },
  {
    id: "vacation-resort",
    label: "Vacation / Resort",
    api: "vacation",
    vibes: ["casual", "boho"],
  },
];

export function occasionSkipsSeasonStep(occasionId: string): boolean {
  return occasionId === "wedding" || occasionId === "wedding-guest";
}

const ORIGINAL_OCCASION_ASSETS: Partial<Record<string, string>> = {
  "casual-everyday":
    "/images/ai-stylist/onboarding/occasion-casual.png",
  "work-office": "/images/ai-stylist/onboarding/occasion-work.png",
  "formal-evening":
    "/images/ai-stylist/onboarding/occasion-formal.png",
  "wedding-guest":
    "/images/ai-stylist/onboarding/occasion-wedding.png",
};

const GENERATED_OCCASION_ASSETS: Record<
  StylistGender,
  Partial<Record<string, string>>
> = {
  female: {
    "date-night":
      "/images/ai-stylist/onboarding/occasions/female-date-night-v4.webp",
    "party-night":
      "/images/ai-stylist/onboarding/occasions/female-party-night-v4.webp",
    "sports-workout":
      "/images/ai-stylist/onboarding/occasions/female-sports-workout-v4.webp",
    travel:
      "/images/ai-stylist/onboarding/occasions/female-travel-v4.webp",
    "vacation-resort":
      "/images/ai-stylist/onboarding/occasions/female-vacation-resort-v4.webp",
  },
  male: {
    "casual-everyday":
      "/images/ai-stylist/onboarding/occasions/male-casual-everyday-v3.webp",
    "work-office":
      "/images/ai-stylist/onboarding/occasions/male-work-office-v3.webp",
    "formal-evening":
      "/images/ai-stylist/onboarding/occasions/male-formal-evening-v3.webp",
    "wedding-guest":
      "/images/ai-stylist/onboarding/occasions/male-wedding-guest-v3.webp",
    "date-night":
      "/images/ai-stylist/onboarding/occasions/male-date-night-v4.webp",
    "party-night":
      "/images/ai-stylist/onboarding/occasions/male-party-night-v4.webp",
    "sports-workout":
      "/images/ai-stylist/onboarding/occasions/male-sports-workout-v4.webp",
    travel:
      "/images/ai-stylist/onboarding/occasions/male-travel-v4.webp",
    "vacation-resort":
      "/images/ai-stylist/onboarding/occasions/male-vacation-resort-v4.webp",
  },
};

export function occasionAsset(
  gender: StylistGender,
  occasionId: string,
): string {
  const generatedAsset = GENERATED_OCCASION_ASSETS[gender][occasionId];
  if (generatedAsset) return generatedAsset;

  const originalAsset = ORIGINAL_OCCASION_ASSETS[occasionId];
  if (originalAsset) return originalAsset;

  return `/images/ai-stylist/onboarding/occasions/${gender}-${occasionId}.png`;
}
