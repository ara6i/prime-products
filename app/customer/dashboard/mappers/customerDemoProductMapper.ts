import { getDemoProductGroup } from "@/app/demo/products/utils/demoProductGroups";
import type { DemoProductApi, DemoProductCard } from "@/app/demo/products/types";
import type {
  CustomerImportedProduct,
  CustomerImportedVariant,
  CustomerProductSelectionState,
} from "../types/products";

const GROUP_LABELS: Record<ReturnType<typeof getDemoProductGroup>, string> = {
  women: "Women",
  men: "Men",
  accessories: "Accessories",
  uniform: "Uniform",
};

function isStocked(value: string | undefined): boolean {
  const normalized = (value ?? "").toLowerCase();
  return !normalized || normalized.includes("in") || normalized.includes("available") || normalized.includes("stock");
}

function variantAvailable(value: boolean | undefined, productStock: string | undefined): boolean {
  return value !== false && isStocked(productStock);
}

function sizeAvailable(value: string | undefined, productStock: string | undefined): boolean {
  const normalized = (value ?? "").toLowerCase();
  if (!normalized) return isStocked(productStock);
  return !normalized.includes("out") && !normalized.includes("unavailable") && !normalized.includes("sold");
}

function variantInventory(available: boolean): number {
  return available ? 100 : 0;
}

function optionalStringField(option: unknown, key: string): string | undefined {
  if (!option || typeof option !== "object") return undefined;
  const value = (option as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function makeVariant(input: {
  id: string;
  image: string;
  color?: string;
  size?: string;
  sku?: string;
  available: boolean;
}): CustomerImportedVariant {
  return {
    id: input.id,
    title: [input.color, input.size].filter(Boolean).join(" / ") || input.sku || "Default variant",
    sku: input.sku ?? input.id,
    image: input.image,
    inventoryQuantity: variantInventory(input.available),
    selectedOptions: [
      input.color ? { name: "Color", value: input.color } : null,
      input.size ? { name: "Size", value: input.size } : null,
    ].filter((option): option is { name: string; value: string } => Boolean(option)),
  };
}

function mapRawVariants(product: DemoProductApi, card: DemoProductCard): CustomerImportedVariant[] {
  const variants: CustomerImportedVariant[] = [];
  const productImage = card.generatedCover || card.image || product.image_urls?.[0] || product.gallery?.[0] || "";

  product.variants?.forEach((variant) => {
    const color = variant.name || product.color || card.colorVariants[0]?.name;
    const image = variant.images?.[0] || card.colorVariants.find((item) => item.name === color)?.image || productImage;
    const colorAvailable = variantAvailable(variant.available, product.stock_status);
    const sizes = variant.sizes?.length
      ? variant.sizes
      : (product.variant_sizes?.length ? product.variant_sizes : product.sizes?.map((name) => ({ name })) ?? []);

    if (sizes.length === 0) {
      variants.push(makeVariant({
        id: variant.id || `${card.id}-${color || "default"}`,
        image,
        color,
        available: colorAvailable,
      }));
      return;
    }

    sizes.forEach((size) => {
      const sizeName = size.name || "Default";
      const available = colorAvailable && sizeAvailable(optionalStringField(size, "availability"), product.stock_status);
      variants.push(makeVariant({
        id: optionalStringField(size, "sku") || `${variant.id || card.id}-${color || "color"}-${sizeName}`,
        image,
        color,
        size: sizeName,
        sku: optionalStringField(size, "sku"),
        available,
      }));
    });
  });

  if (variants.length > 0) return variants;

  const sizes = product.variant_sizes?.length
    ? product.variant_sizes
    : product.sizes?.map((name) => ({ name })) ?? [];

  if (sizes.length > 0) {
    return sizes.map((size) => makeVariant({
      id: `${card.id}-${size.name || "size"}`,
      image: productImage,
      color: product.color || card.colorVariants[0]?.name,
      size: size.name || "Default",
      available: sizeAvailable(optionalStringField(size, "availability"), product.stock_status),
    }));
  }

  return [makeVariant({
    id: `${card.id}-default`,
    image: productImage,
    color: product.color || card.colorVariants[0]?.name,
    available: isStocked(product.stock_status),
  })];
}

export function mapDemoProductsToCustomerProducts({
  cards,
  rawProducts,
}: {
  cards: DemoProductCard[];
  rawProducts: DemoProductApi[];
}): {
  products: CustomerImportedProduct[];
  selectionState: Record<string, CustomerProductSelectionState>;
} {
  const rawById = new Map(rawProducts.map((product) => [product.product_id ?? product._id ?? "", product]));
  const selectionState: Record<string, CustomerProductSelectionState> = {};
  const products = cards.map((card) => {
    const raw = rawById.get(card.id) ?? {};
    const group = getDemoProductGroup(card);
    const image = card.generatedCover || card.image || raw.image_urls?.[0] || raw.gallery?.[0] || "";
    const variants = mapRawVariants(raw, card);
    const hasInventory = variants.some((variant) => variant.inventoryQuantity > 0);
    const isEnabled = card.vtoSupported && hasInventory;

    selectionState[card.id] = {
      currentCycle: isEnabled,
      currentStorefront: isEnabled,
    };

    return {
      id: card.id,
      handle: card.id,
      title: card.name,
      image,
      collection: GROUP_LABELS[group],
      type: card.subcategory || card.category || card.fitType,
      tags: Array.from(new Set([card.fitType, card.gender, ...card.tags].filter(Boolean))),
      variants,
    };
  });

  return { products, selectionState };
}
