import type {
  ShopRunwayLook,
  ShopRunwayLookView,
} from "../types/shopRunway.types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function mapShopRunwayLook(look: ShopRunwayLook): ShopRunwayLookView {
  return {
    ...look,
    displayNumber: String(look.number).padStart(2, "0"),
    products: look.products.map((product) => ({
      ...product,
      formattedPrice: currency.format(product.priceCents / 100),
    })),
  };
}
