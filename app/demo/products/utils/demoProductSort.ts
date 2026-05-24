import type { DemoProductCard } from "../types";

const CLOTHING_KEYWORDS = [
  "shirt",
  "t-shirt",
  "trouser",
  "pant",
  "short",
  "swim",
  "suit",
];

const ACCESSORY_KEYWORDS = [
  "accessor",
  "bag",
  "backpack",
  "belt",
  "bracelet",
  "earring",
  "eyewear",
  "hat",
  "jewelry",
  "necklace",
  "pendant",
  "ring",
  "sunglass",
];

const COMPLETE_LOOK_ORDER = [
  "floral-print-linen-blend-trousers",
  "flat-leather-criss-cross-sandals",
  "floral-linen-blend-shirt",
];

function getCompleteLookOrder(product: DemoProductCard): number {
  return COMPLETE_LOOK_ORDER.indexOf(product.id);
}

function hasAnyKeyword(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function getProductPriority(product: DemoProductCard): number {
  const name = product.name.toLowerCase();
  const category = product.category.toLowerCase();
  const searchable = `${name} ${category}`;

  if (name.includes("tuxedo")) return 0;
  if (name.includes("wedding dress") || category.includes("wedding dress")) return 1;
  if (name.includes("dress") || category.includes("dress")) return 2;
  if (hasAnyKeyword(searchable, CLOTHING_KEYWORDS)) return 3;
  if (name.includes("shoe") || name.includes("sneaker") || category.includes("shoe") || category.includes("footwear")) return 4;
  if (hasAnyKeyword(searchable, ACCESSORY_KEYWORDS)) return 5;

  return 6;
}

export function sortDemoProducts(products: DemoProductCard[]): DemoProductCard[] {
  return products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const lookOrderA = getCompleteLookOrder(a.product);
      const lookOrderB = getCompleteLookOrder(b.product);
      if (lookOrderA >= 0 || lookOrderB >= 0) {
        if (lookOrderA >= 0 && lookOrderB >= 0) return lookOrderA - lookOrderB;
        return lookOrderA >= 0 ? -1 : 1;
      }

      const priorityDelta = getProductPriority(a.product) - getProductPriority(b.product);
      return priorityDelta || a.index - b.index;
    })
    .map(({ product }) => product);
}
