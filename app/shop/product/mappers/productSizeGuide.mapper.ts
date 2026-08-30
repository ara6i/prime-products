import type {
  ProductDetailViewModel,
  ProductSizeGuideData,
} from "../types/productDetail.types";

const ALPHA_SIZE_OFFSET: Record<string, number> = {
  XXS: -2,
  XS: -1,
  S: 0,
  M: 1,
  L: 2,
  XL: 3,
  XXL: 4,
  "2XL": 4,
  XXXL: 5,
  "3XL": 5,
};

function range(start: number, spread = 4) {
  return `${Math.round(start)}-${Math.round(start + spread)}`;
}

function sizeOffset(size: string, index: number) {
  return ALPHA_SIZE_OFFSET[size.trim().toUpperCase()] ?? index;
}

function mapBottomRows(product: ProductDetailViewModel) {
  return product.sizes.map((size, index) => {
    const numericSize = Number(size);

    if (Number.isFinite(numericSize) && numericSize >= 20) {
      const waistCm = numericSize * 2.54;
      return [
        size,
        range(waistCm, 2),
        range(waistCm + 25, 3),
        "82.5",
      ];
    }

    const offset = sizeOffset(size, index);
    return [
      size,
      range(68 + offset * 5),
      range(92 + offset * 5),
      "81",
    ];
  });
}

function mapBodyRows(product: ProductDetailViewModel, isMenswear: boolean) {
  const chestBase = isMenswear ? 88 : 84;
  const waistBase = isMenswear ? 76 : 66;
  const hipsBase = isMenswear ? 92 : 90;
  const step = isMenswear ? 6 : 4;

  return product.sizes.map((size, index) => {
    const offset = sizeOffset(size, index);
    return [
      size,
      range(chestBase + offset * step),
      range(waistBase + offset * step),
      range(hipsBase + offset * step),
    ];
  });
}

export function mapProductSizeGuide(
  product: ProductDetailViewModel,
): ProductSizeGuideData {
  if (product.sizeGuide) return product.sizeGuide;
  const context = `${product.category} ${product.name}`.toLowerCase();
  const oneSize = product.sizes.length === 1 && /one\s*size/i.test(product.sizes[0] ?? "");

  if (oneSize) {
    return {
      title: `${product.name} size guide`,
      headers: ["Size"],
      rows: [[product.sizes[0] ?? "One size"]],
    };
  }

  const isBottom = /jean|denim|bottom|trouser|pant|skirt|short/.test(context);
  if (isBottom) {
    return {
      title: `${product.name} size guide`,
      headers: ["Size", "Waist (cm)", "Hips (cm)", "Inseam (cm)"],
      rows: mapBottomRows(product),
    };
  }

  return {
    title: `${product.name} size guide`,
    headers: ["Size", "Chest/Bust (cm)", "Waist (cm)", "Hips (cm)"],
    rows: mapBodyRows(product, /\bmen(?:'s)?\b/.test(context)),
  };
}
