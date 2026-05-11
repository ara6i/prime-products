"use client";

import { useEffect, useState } from "react";
import { DesktopProductDetail } from "./desktop/DemoProductDetail";
import { MobileProductDetail } from "./mobile/DemoProductDetail";
import type { DemoProductView } from "../../types";

/**
 * Picks ONE of the two detail components at runtime via matchMedia so we
 * only ever mount a single <PrimeStyleTryon> + usePrimeStyleSize() pair.
 * Previously both desktop & mobile rendered side-by-side hidden via CSS,
 * which doubled every backend call (/sizing/sizeguide, /sizing/recommend,
 * /pick-best-garment-image) per page mount.
 */
export function ProductDetailSwitcher({ product }: { product: DemoProductView }) {
  const [variant, setVariant] = useState<"desktop" | "mobile" | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setVariant(mq.matches ? "desktop" : "mobile");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (variant === null) return null;
  return variant === "desktop"
    ? <DesktopProductDetail product={product} />
    : <MobileProductDetail product={product} />;
}
