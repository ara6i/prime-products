import type { ClothingCategory } from "@/app/try-on/types";

export const CLOTHING_CATEGORIES: { value: ClothingCategory; label: string }[] = [
  { value: "upper-body", label: "Upper" },
  { value: "lower-body", label: "Lower" },
  { value: "full-body", label: "Full Body" },
  { value: "accessories", label: "Accessories" },
];
