"use client";

import { useShopRunway } from "../hooks/useShopRunway";
import { useShopBag } from "../../bag/useShopBag";
import { ShopRunwayView } from "./ShopRunwayView";

type RunwayCategory = "Women" | "Men" | "Denim" | "Accessories";

type ShopRunwayExperienceProps = {
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
  onOpenCategory,
}: ShopRunwayExperienceProps) {
  const state = useShopRunway();
  const bag = useShopBag();

  return (
    <ShopRunwayView
      state={state}
      onAddToBag={(product) => bag.add({
        productId: product.id,
        name: product.name,
        brandName: product.brand,
        image: product.image,
        size: "",
        color: "",
        priceCents: product.priceCents,
        currency: "USD",
      })}
      onShopLook={() =>
        onOpenCategory(categoryByLook[state.activeLook.id] ?? "Women")
      }
    />
  );
}
