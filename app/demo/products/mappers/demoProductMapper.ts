import type {
  DemoProductApi,
  DemoProductListApi,
  DemoProductCard,
  DemoProductListView,
  DemoProductView,
  DemoColorVariant,
  DemoSizeOption,
  DemoSizeGuide,
} from "../types";

const DEMO_BRAND = "PrimeStyleAI";

/**
 * Proxy slow third-party image CDNs through our nginx cache.
 * Farfetch CDN (cdn-images.farfetch-contents.com) returns in ~10s from our droplet,
 * so we route through /ext-img/* which nginx caches for 30 days on disk.
 */
const SLOW_CDN_HOSTS = new Set([
  "cdn-images.farfetch-contents.com",
]);

function proxyImage(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return url || "";
  try {
    const u = new URL(url);
    if (SLOW_CDN_HOSTS.has(u.hostname)) {
      return `/ext-img/${u.hostname}${u.pathname}${u.search}`;
    }
  } catch {}
  return url;
}

function proxyImages(urls?: string[]): string[] {
  if (!urls) return [];
  return urls.map(proxyImage);
}

/** Strip the real brand name from a product name, return a clean generic name */
function cleanProductName(brand: string, name: string): string {
  if (!name) return "Untitled";
  const trimmed = name.trim();
  if (!brand) return trimmed;
  // Escape special regex chars in brand, then strip from start of name (case-insensitive)
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cleaned = trimmed.replace(new RegExp(`^${escaped}\\s*`, "i"), "").trim();
  return cleaned || trimmed;
}

const COVER_SKIP = "SKIP";

/** Products that should always show the model image, never the AI-generated cover */
function shouldUseModelImage(p: DemoProductApi): boolean {
  const name = (p.name ?? "").toLowerCase();
  return name.includes("tuxedo");
}

/** Map a raw API product to a listing card */
function toCard(p: DemoProductApi): DemoProductCard {
  const rawBrand = p.brand ?? "";
  const rawName  = p.name ?? "Untitled";
  const gc = p.generated_cover;
  const modelImage = shouldUseModelImage(p);
  return {
    id: p.product_id ?? p._id ?? "",
    name: cleanProductName(rawBrand, rawName),
    brand: DEMO_BRAND,
    category: p.category ?? "",
    image: proxyImage(p.image_urls?.[0] ?? p.gallery?.[0] ?? p.variant_image_urls?.[0] ?? ""),
    // Tuxedo: always show model image — skip the AI-generated (model-free) cover
    generatedCover: proxyImage((!modelImage && gc && gc !== COVER_SKIP) ? gc : undefined) || undefined,
    // Mark checked so the frontend won't call the cover API again
    coverChecked: !!gc || modelImage,
    vtoSupported: p.is_virtual_tryon_supported ?? false,
  };
}

/** Map the list response to a UI-ready view */
export function mapProductList(raw: DemoProductListApi): DemoProductListView {
  return {
    products: (raw.items ?? []).map(toCard),
    page: raw.page,
    total: raw.total,
    totalPages: raw.totalPages,
  };
}

/** Map a single raw product to the detail view */
export function mapProductDetail(p: DemoProductApi): DemoProductView {
  const images = buildImages(p);
  const colorVariants = buildColorVariants(p);
  const sizes = buildSizes(p);
  const rawBrand = p.brand ?? "";
  const rawName  = p.name ?? "Untitled";

  return {
    id: p.product_id ?? p._id ?? "",
    name: cleanProductName(rawBrand, rawName),
    brand: DEMO_BRAND,
    category: p.category ?? "",
    subcategory: p.subcategory ?? "",
    description: p.short_description || p.description || "",
    material: p.material ?? "",
    images,
    primaryImage: images[0] ?? "",
    sizes,
    sizeSystem: p.size_system ?? "US",
    colorVariants,
    selectedColor: p.selected_color?.name ?? p.color ?? colorVariants[0]?.name ?? "",
    sizeGuideData: p.size_guide ?? null,
    sizeGuide: parseSizeGuide(p.size_guide),
  };
}

/* ── helpers ────────────────────────────────── */

function buildImages(p: DemoProductApi): string[] {
  // Collect ALL unique images from every source, proxied through our cache for slow CDNs
  const all: string[] = [];
  const add = (urls?: string[]) => proxyImages(urls).forEach((u) => { if (u && !all.includes(u)) all.push(u); });

  add(p.gallery);
  add(p.image_urls);
  add(p.variant_image_urls);

  // Also collect from every variant
  p.variants?.forEach((v) => add(v.images));

  return all;
}

function buildColorVariants(p: DemoProductApi): DemoColorVariant[] {
  if (!p.variants?.length) {
    return (p.color_variants ?? []).map((cv) => ({
      name: cv.name ?? "",
      hex: cv.hex ?? "#666",
      available: cv.available ?? true,
      images: [],
      sizes: [],
    }));
  }

  return p.variants.map((v) => ({
    name: v.name ?? "",
    hex: v.hex ?? "#666",
    available: v.available ?? true,
    images: proxyImages(v.images),
    sizes: (v.sizes ?? []).map((s) => ({
      name: s.name ?? "",
      available: isAvailable(s.availability),
    })),
  }));
}

function buildSizes(p: DemoProductApi): DemoSizeOption[] {
  // Priority 0: if flat size guide has a "Standard" column, use those rows as size options
  const raw = p.size_guide as Record<string, unknown> | null | undefined;
  if (raw && Array.isArray(raw.headers) && Array.isArray(raw.rows) && !Array.isArray(raw.sections)) {
    const headers = raw.headers as string[];
    const rows = raw.rows as Array<Record<string, string>>;
    const stdKey = headers.find((h) => h.toLowerCase() === "standard");
    if (stdKey) {
      // Deduplicate — multiple rows can share the same Standard label (e.g. XXS=54cm & XXS=55cm)
      const names = [...new Set(rows.map((r) => r[stdKey]).filter(Boolean))];
      if (names.length > 0) {
        return names.map((name) => ({ name, available: true }));
      }
    }
  }
  if (p.variant_sizes?.length) {
    return p.variant_sizes.map((s) => ({
      name: s.name ?? "",
      available: isAvailable(s.availability),
    }));
  }
  if (p.sizes?.length) {
    return p.sizes.map((name) => ({ name, available: true }));
  }
  const first = p.variants?.[0];
  if (first?.sizes?.length) {
    return first.sizes.map((s) => ({
      name: s.name ?? "",
      available: isAvailable(s.availability),
    }));
  }
  return [];
}

function isAvailable(_status?: string): boolean {
  return true; // Demo: always show all sizes as available
}

function parseSizeGuide(raw: unknown): DemoSizeGuide | null {
  if (!raw || typeof raw !== "object") return null;
  const sg = raw as Record<string, unknown>;
  if (!sg.title) return null;

  // Common fields that apply to both shapes
  const common = {
    subtitle: sg.subtitle as string | undefined,
    howToMeasure: sg.howToMeasure as string[] | undefined,
    fitTerms: sg.fitTerms as DemoSizeGuide["fitTerms"],
    regions: sg.regions as DemoSizeGuide["regions"],
    noUnitToggle: sg.noUnitToggle as boolean | undefined,
    unit: (sg.unit as string) ?? "",
    guideImages: sg.guideImages as DemoSizeGuide["guideImages"],
  };

  // Multi-section format: { title, sections: [{ name, headers, rows }, ...] }
  if (Array.isArray(sg.sections) && sg.sections.length > 0) {
    return {
      title: sg.title as string,
      sections: sg.sections as DemoSizeGuide["sections"],
      ...common,
    };
  }

  // Flat format: { title, headers, rows }
  if (!sg.headers || !sg.rows) return null;
  return {
    title: sg.title as string,
    headers: sg.headers as string[],
    rows: sg.rows as Array<Record<string, string>>,
    ...common,
  };
}
