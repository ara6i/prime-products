import type { ShowcaseProduct } from "../../data/showcaseCatalog.data";

/**
 * The five existing editorial views used while final multi-item outfit renders
 * are being produced. A generated render can replace a fallback by adding a
 * PNG at the matching showcase-sdk-results path; the public URL stays stable.
 */
export const SHOWCASE_DEMO_RESULT_VIEWS = [
  "03-model-front",
  "04-model-three-quarter",
  "06-model-movement",
  "07-model-crop",
  "09-model-alternate",
] as const;

export function showcaseEditorialAsset(
  product: Pick<ShowcaseProduct, "id" | "gender">,
  view: (typeof SHOWCASE_DEMO_RESULT_VIEWS)[number],
) {
  return `/media/global-shop/showcase-v5/${product.gender}/${product.id}/${view}.png`;
}

export function showcasePreparedResultAsset(
  product: Pick<ShowcaseProduct, "id" | "gender">,
  lookIndex: number,
) {
  const lookNumber = String(lookIndex + 1).padStart(2, "0");
  return `/shop/prepared-results/${product.gender}/${product.id}/look-${lookNumber}.png`;
}

export function showcasePreparedResultFile(
  product: Pick<ShowcaseProduct, "id" | "gender">,
  lookIndex: number,
) {
  const lookNumber = String(lookIndex + 1).padStart(2, "0");
  return `media/global-shop/showcase-sdk-results/${product.gender}/${product.id}/look-${lookNumber}.png`;
}
