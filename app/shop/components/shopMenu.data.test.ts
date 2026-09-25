// @vitest-environment node

import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MERCHANT_DASHBOARD_ROUTE_SECTIONS } from "../../partner-landing/merchant-dashboard/types";
import { SHOP_CATEGORY_IDS } from "../category/types/categoryCatalog.types";
import { getStaticProductIds } from "../product/services/productDetail.service";
import { shopMenuSections } from "./shopMenu.data";

const productIds = new Set(getStaticProductIds());

function hasPage(href: string) {
  const pathname = href.split(/[?#]/)[0];
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "shop" && parts.length === 3) {
    if (parts[1] === "product") return productIds.has(parts[2]);
    if (parts[1] === "category") return SHOP_CATEGORY_IDS.some((id) => id === parts[2]);
  }
  if (parts[0] === "merchants" && parts[1] === "dashboard" && parts.length === 3) {
    return MERCHANT_DASHBOARD_ROUTE_SECTIONS.some((id) => id === parts[2]);
  }
  return existsSync(path.join(process.cwd(), "app", ...parts, "page.tsx"));
}

describe("Platform menu destinations", () => {
  it("shows the active Shop categories without a standalone Denim route", () => {
    const shop = shopMenuSections.find((section) => section.id === "shop");
    expect(shop?.groups.find((group) => group.label === "Categories")?.links).toEqual([
      { label: "Women", href: "/shop/category/women" },
      { label: "Men", href: "/shop/category/men" },
      { label: "Accessories", href: "/shop/category/accessories" },
    ]);
    expect(JSON.stringify(shop)).not.toContain("/shop/category/denim");
  });

  it("uses only existing Women’s and Men’s products in the featured product group", () => {
    const shop = shopMenuSections.find((section) => section.id === "shop");
    const productLinks = shop?.groups.find(
      (group) => group.label === "Featured products",
    )?.links;
    expect(productLinks).toHaveLength(4);
    expect(
      productLinks?.every((link) =>
        link.href.startsWith("/shop/product/") &&
        productIds.has(link.href.split("/").at(-1) ?? ""),
      ),
    ).toBe(true);
    expect(JSON.stringify(shop)).not.toContain("/shop/ai-stylist");
    expect(JSON.stringify(shop)).not.toContain("/shop/dressing-room");
  });

  it.each(shopMenuSections)("uses existing pages and original image assets for $label", (section) => {
    const links = section.groups.flatMap((group) => group.links);
    const destinations = new Set(links.map((link) => link.href));
    expect(destinations.size).toBe(links.length);
    for (const link of links) {
      expect(link.href.startsWith("/")).toBe(true);
      expect(hasPage(link.href), `${section.label}: ${link.href}`).toBe(true);
    }
    for (const feature of section.features) {
      expect(destinations.has(feature.href), feature.href).toBe(true);
      expect(existsSync(path.join(process.cwd(), "public", feature.image)), feature.image).toBe(true);
    }
  });
});
