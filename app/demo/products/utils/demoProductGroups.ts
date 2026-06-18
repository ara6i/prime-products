import type { DemoProductCard } from "../types";

export type DemoProductGroupId = "women" | "men" | "accessories" | "uniform";

export interface DemoProductGroupConfig {
  id: DemoProductGroupId;
  label: string;
  kicker: string;
  title: string;
  description: string;
}

export const DEMO_PRODUCT_GROUPS: DemoProductGroupConfig[] = [
  {
    id: "women",
    label: "Women",
    kicker: "001 / Women's fitting room",
    title: "Designed to move from size match to try-on.",
    description: "Dresses, denim, shoes, swim, and tailored pieces routed through the right sizing flow.",
  },
  {
    id: "men",
    label: "Men",
    kicker: "002 / Men's fitting room",
    title: "Sharp product tests for menswear and footwear.",
    description: "Shirts, trousers, swim, tuxedos, and male-coded shoe flows stay separated from accessories.",
  },
  {
    id: "accessories",
    label: "Accessories",
    kicker: "003 / Accessory lab",
    title: "Objects, eyewear, jewelry, and headwear get their own path.",
    description: "Bags, belts, hats, sunglasses, rings, bracelets, necklaces, earrings, and watches avoid apparel-only routing.",
  },
  {
    id: "uniform",
    label: "Uniform",
    kicker: "004 / Women's uniform studio",
    title: "Women's medical uniforms ready for sizing tests.",
    description: "Scrub sets stay separated as women products with their own uniform testing rack.",
  },
];

const ACCESSORY_FIT_TYPES = new Set([
  "accessory",
  "bag",
  "belt",
  "bracelet",
  "earring",
  "hat",
  "necklace",
  "ring",
  "sunglasses",
  "watch",
]);

const ACCESSORY_CATEGORY_PATTERN = /\b(accessor|bag|belt|bracelet|earring|eyewear|glasses|hat|headwear|jewel|necklace|pendant|ring|sunglass|watch)\b/i;
const UNIFORM_CATEGORY_PATTERN = /\b(uniform|scrub|medical|workwear|healthcare|clinic|hospital)\b/i;

function searchable(product: DemoProductCard): string {
  return [
    product.name,
    product.category,
    product.subcategory,
    product.gender,
    product.fitType,
    ...product.tags,
  ].join(" ");
}

export function isDemoAccessory(product: DemoProductCard): boolean {
  return ACCESSORY_FIT_TYPES.has(product.fitType) || ACCESSORY_CATEGORY_PATTERN.test(searchable(product));
}

export function getDemoProductGroup(product: DemoProductCard): DemoProductGroupId {
  if (UNIFORM_CATEGORY_PATTERN.test(searchable(product))) return "uniform";
  if (isDemoAccessory(product)) return "accessories";

  const text = searchable(product).toLowerCase();
  if (/\b(male|men|mens|men's)\b/.test(text)) return "men";
  if (/\b(female|women|womens|women's)\b/.test(text)) return "women";

  return "women";
}

export function groupDemoProducts(products: DemoProductCard[]): Record<DemoProductGroupId, DemoProductCard[]> {
  return products.reduce<Record<DemoProductGroupId, DemoProductCard[]>>(
    (groups, product) => {
      groups[getDemoProductGroup(product)].push(product);
      return groups;
    },
    { women: [], men: [], accessories: [], uniform: [] },
  );
}

export function formatDemoFitType(fitType: string): string {
  const labels: Record<string, string> = {
    apparel: "Apparel",
    accessory: "Accessory",
    bag: "Bag",
    belt: "Belt",
    bracelet: "Bracelet",
    earring: "Earring",
    hat: "Hat",
    necklace: "Necklace",
    ring: "Ring",
    shoe: "Shoe",
    sunglasses: "Eyewear",
    watch: "Watch",
  };

  return labels[fitType] ?? fitType.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
