import {
  FlowerIcon,
  PalmTreeIcon,
  LeafIcon,
  SnowflakeIcon,
  TShirtIcon,
  JacketIcon,
  JeansIcon,
  DressIcon,
  CoatIcon,
  ShoeIcon,
  HandBagIcon,
  WatchIcon,
} from "@/app/shared/components/icons";
import type {
  OccasionCategory,
  SeasonCategory,
  ClothingCategory,
} from "@/app/catalog/types";

export const occasions: OccasionCategory[] = [
  {
    id: "wedding-guest",
    name: "Wedding Guest",
    imageUrl: "/images/catalog/occasion-wedding.png",
  },
  {
    id: "casual-everyday",
    name: "Casual Everyday",
    imageUrl: "/images/catalog/occasion-casual.png",
  },
  {
    id: "formal-evening",
    name: "Formal Evening",
    imageUrl: "/images/catalog/occasion-formal.png",
  },
  {
    id: "work-office",
    name: "Work/Office",
    imageUrl: "/images/catalog/occasion-work.png",
  },
];

export const seasons: SeasonCategory[] = [
  {
    id: "spring",
    name: "Spring",
    icon: FlowerIcon,
    gradient: "var(--season-spring-gradient)",
  },
  {
    id: "summer",
    name: "Summer",
    icon: PalmTreeIcon,
    gradient: "var(--season-summer-gradient)",
  },
  {
    id: "fall",
    name: "Fall",
    icon: LeafIcon,
    gradient: "var(--season-fall-gradient)",
  },
  {
    id: "winter",
    name: "Winter",
    icon: SnowflakeIcon,
    gradient: "var(--season-winter-gradient)",
  },
];

export const categories: ClothingCategory[] = [
  { id: "tops", name: "Tops", icon: TShirtIcon },
  { id: "outerwear", name: "Outerwear", icon: JacketIcon },
  { id: "bottoms", name: "Bottoms", icon: JeansIcon },
  { id: "dresses", name: "Dresses", icon: DressIcon },
  { id: "suits", name: "Suits", icon: CoatIcon },
  { id: "shoes", name: "Shoes", icon: ShoeIcon },
  { id: "bags", name: "Bags", icon: HandBagIcon },
  { id: "accessories", name: "Accessories", icon: WatchIcon },
];
