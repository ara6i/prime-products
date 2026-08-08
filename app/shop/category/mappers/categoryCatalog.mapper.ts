import type {
  CategoryCatalog,
  RawCategoryCatalog,
  ShopCategoryId,
} from "../types/categoryCatalog.types";

const labelToId: Record<string, ShopCategoryId> = {
  women: "women",
  men: "men",
  denim: "denim",
  accessories: "accessories",
};

export function mapCategoryCatalog(raw: RawCategoryCatalog): CategoryCatalog {
  return {
    ...raw,
    filters: raw.filters.map((filter) => ({
      ...filter,
      count: raw.products.filter((product) =>
        product.facets.some((facet) => facet.groupId === filter.id),
      ).length,
    })),
    products: raw.products.map((product) => ({
      ...product,
      priceLabel: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(product.priceCents / 100),
    })),
  };
}

export function mapCategoryLabelToId(label: string): ShopCategoryId {
  return labelToId[label.trim().toLowerCase()] ?? "women";
}

export function getCategoryHref(labelOrId: string): string {
  return `/shop/category/${mapCategoryLabelToId(labelOrId)}`;
}
