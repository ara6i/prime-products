"use client";

import { useShopRunway } from "../hooks/useShopRunway";
import { ShopRunwayView } from "./ShopRunwayView";

type RunwayCategory = "Women" | "Men" | "Denim" | "Accessories";

type ShopRunwayExperienceProps = {
  bagCount: number;
  onAddToBag: () => void;
  onOpenCart: () => void;
  onOpenCategory: (category: RunwayCategory) => void;
};

const categoryByLook: Record<string, RunwayCategory> = {
  signal: "Women",
  camel: "Women",
  lilac: "Women",
  cobalt: "Men",
  noir: "Women",
};

export function ShopRunwayExperience({
  onAddToBag,
  onOpenCategory,
}: ShopRunwayExperienceProps) {
  const state = useShopRunway();

  return (
    <ShopRunwayView
      state={state}
      onAddToBag={onAddToBag}
      onShopLook={() =>
        onOpenCategory(categoryByLook[state.activeLook.id] ?? "Women")
      }
    />
  );
}
