// @vitest-environment node

import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MERCHANT_DASHBOARD_ROUTE_SECTIONS } from "../../partner-landing/merchant-dashboard/types";
import { shopBrandProfiles } from "../brand/data/brandProfiles.data";
import { SHOP_CATEGORY_IDS } from "../category/types/categoryCatalog.types";
import { getStaticProductIds } from "../product/services/productDetail.service";
import { shopMenuSections } from "./shopMenu.data";

const productIds = new Set(getStaticProductIds());
const brandIds = new Set<string>(shopBrandProfiles.map((brand) => brand.id));

function hasPage(href: string) {
  const pathname = href.split(/[?#]/)[0];
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "shop" && parts.length === 3) {
    if (parts[1] === "product") return productIds.has(parts[2]);
    if (parts[1] === "brand") return brandIds.has(parts[2]);
    if (parts[1] === "category") return SHOP_CATEGORY_IDS.some((id) => id === parts[2]);
  }
  if (parts[0] === "merchants" && parts[1] === "dashboard" && parts.length === 3) {
    return MERCHANT_DASHBOARD_ROUTE_SECTIONS.some((id) => id === parts[2]);
  }
  return existsSync(path.join(process.cwd(), "app", ...parts, "page.tsx"));
}

describe("Platform menu destinations", () => {
  it("shows only Denim in the Shop category links", () => {
    const shop = shopMenuSections.find((section) => section.id === "shop");
    expect(shop?.groups.find((group) => group.label === "Categories")?.links).toEqual([
      { label: "Denim", href: "/shop/category/denim" },
    ]);
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
