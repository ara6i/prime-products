import type { DemoProductApi, DemoProductListApi } from "@/app/demo/products/types";
import { DEFAULT_SIZE_CHARTS, type ProductSetupState } from "./sizingUtils";
import type { TryOnProductCategory } from "./types";

const DEMO_PRODUCTS_PATH = "/api/catalog/demo/products";

export interface DemoLabProductOption {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
}

export interface DemoLabProductApplyData {
  product: Partial<ProductSetupState>;
  imageUrl: string;
  imageName: string;
  hasSizeGuide: boolean;
}

export async function fetchDemoProductOptions(baseUrl: string): Promise<DemoLabProductOption[]> {
  const limit = 100;
  const firstPage = await fetchJson<DemoProductListApi>(
    apiUrl(baseUrl, `${DEMO_PRODUCTS_PATH}?page=1&limit=${limit}`),
  );
  const totalPages = Math.max(1, Number(firstPage.totalPages) || 1);
  const restPages =
    totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            fetchJson<DemoProductListApi>(
              apiUrl(baseUrl, `${DEMO_PRODUCTS_PATH}?page=${index + 2}&limit=${limit}`),
            ),
          ),
        )
      : [];

  const seen = new Set<string>();
  return [firstPage, ...restPages]
    .flatMap((page) => page.items ?? [])
    .map((product) => ({
      id: product.product_id ?? product._id ?? "",
      name: cleanProductName(product.brand ?? "", product.name ?? "Untitled"),
      brand: product.brand ?? "",
      category: product.category ?? "",
      imageUrl: pickProductImage(product),
    }))
    .filter((product) => {
      if (!product.id || seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
}

export async function fetchDemoProductForLab(baseUrl: string, productId: string): Promise<DemoLabProductApplyData> {
  const product = await fetchJson<DemoProductApi>(apiUrl(baseUrl, `${DEMO_PRODUCTS_PATH}/${encodeURIComponent(productId)}`));
  const category = mapDemoCategory(product);
  const imageUrl = pickProductImage(product);
  const name = cleanProductName(product.brand ?? "", product.name ?? "Untitled");
  const hasSizeGuide = !!product.size_guide;

  return {
    product: {
      productId: product.product_id ?? product._id,
      category,
      subcategory: product.subcategory,
      title: name,
      description: product.short_description || product.description || "",
      material: product.material ?? "",
      productImage: imageUrl || undefined,
      sizeChartText: hasSizeGuide ? JSON.stringify(product.size_guide, null, 2) : DEFAULT_SIZE_CHARTS[category],
    },
    imageUrl,
    imageName: `${name || "demo-product"}.jpg`,
    hasSizeGuide,
  };
}

function apiUrl(baseUrl: string, path: string): string {
  if (typeof window !== "undefined") return path;
  const base = baseUrl.replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Demo product request failed (${response.status})`);
  return (await response.json()) as T;
}

function cleanProductName(brand: string, name: string): string {
  const trimmed = name.trim();
  if (!brand) return trimmed;
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return trimmed.replace(new RegExp(`^${escaped}\\s*`, "i"), "").trim() || trimmed;
}

function pickProductImage(product: DemoProductApi): string {
  return (
    product.variant_image_urls?.find(Boolean) ||
    product.image_urls?.find(Boolean) ||
    product.gallery?.find(Boolean) ||
    product.variants?.flatMap((variant) => variant.images ?? []).find(Boolean) ||
    ""
  );
}

function mapDemoCategory(product: DemoProductApi): TryOnProductCategory {
  const text = `${product.category ?? ""} ${product.subcategory ?? ""} ${product.name ?? ""} ${(product.tags ?? []).join(" ")}`.toLowerCase();

  if (/\b(shoe|shoes|sneaker|sneakers|boot|boots|sandal|sandals|loafer|loafers|footwear)\b/.test(text)) return "shoe";
  if (/\b(sunglass|sunglasses|eyewear|glasses|frames?)\b/.test(text)) return "sunglasses";
  if (/\b(hat|hats|cap|caps|beanie|panama)\b/.test(text)) return "hat";
  if (/\b(backpack|bag|bags|purse|tote|clutch|satchel)\b/.test(text)) return "bag";
  if (/\b(bracelet|bangle)\b/.test(text)) return "bracelet";
  if (/\b(necklace|pendant|chain)\b/.test(text)) return "necklace";
  if (/\b(ring)\b/.test(text)) return "ring";
  if (/\b(belt)\b/.test(text)) return "belt";
  if (/\b(watch)\b/.test(text)) return "watch";
  if (/\b(earring|earrings|jewelry|jewellery|accessory|accessories)\b/.test(text)) return "accessory";

  return "apparel";
}
