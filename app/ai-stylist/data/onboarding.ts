import type {
  StylistOccasion,
  StylistVibe,
} from "@/app/ai-stylist/types";

export type StylistGender = "female" | "male";

export interface StylistOccasionOption {
  id: string;
  label: string;
  api: StylistOccasion;
  vibes: StylistVibe[];
}

export const STYLIST_STEP_LABELS = [
  "Occasion",
  "Weather",
  "Budget",
  "Model",
] as const;

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

const ORIGINAL_OCCASION_ASSETS: Partial<Record<string, string>> = {
  "casual-everyday":
    "/images/ai-stylist/onboarding/occasion-casual.png",
  "work-office": "/images/ai-stylist/onboarding/occasion-work.png",
  "formal-evening":
    "/images/ai-stylist/onboarding/occasion-formal.png",
  "wedding-guest":
    "/images/ai-stylist/onboarding/occasion-wedding.png",
};

export function occasionAsset(
  gender: StylistGender,
  occasionId: string,
): string {
  const originalAsset = ORIGINAL_OCCASION_ASSETS[occasionId];
  if (originalAsset) return originalAsset;

  return `/images/ai-stylist/onboarding/occasions/${gender}-${occasionId}.png`;
}
