import type { BrandProduct } from "../../brand/types/brandCatalog.types";
import type { RawCategoryProduct } from "../../category/types/categoryCatalog.types";
import type {
  ProductDetailViewModel,
  ProductGalleryItem,
  ProductInformationSection,
  ProductRelatedItem,
  RawProductDetailSource,
} from "../types/productDetail.types";
import {
  formatProductPrice,
  getDiscountLabel,
} from "../utils/productDetail.utils";

const categoryComposition: Record<string, string> = {
  Bags: "Structured textile body with tonal hardware",
  Bottoms: "Woven main fabric with reinforced seams",
  Dresses: "Soft-touch woven main fabric",
  Footwear: "Textile and synthetic upper with rubber outsole",
  Jackets: "Technical woven outer with smooth lining",
  Outerwear: "Lightweight technical weave",
  Sets: "Soft technical weave with stretch",
  Tops: "Breathable cotton-blend weave",
};

const productColorValues: Record<string, string> = {
  Black: "#111210",
  Camel: "#B3926F",
  Cobalt: "#2453D4",
  Coral: "#E9543F",
  "Ice blue": "#C9DCE9",
  Indigo: "#294361",
  Ivory: "#EDE9DE",
  "Light blue": "#AFCBDD",
  Lilac: "#C8AFE8",
  White: "#F3F2ED",
};

const lumenWideLegGallery: ProductGalleryItem[] = [
  {
    id: "denim-light-wide-leg-view-1",
    src: "/media/global-shop/denim-pdp/lumen-wide-leg-hero.png",
    alt: "Model wearing the Lumen light-wash wide-leg jeans from the front",
  },
  {
    id: "denim-light-wide-leg-view-2",
    src: "/media/global-shop/denim-pdp/lumen-wide-leg-back.png",
    alt: "Back view of the Lumen wide-leg jeans showing the rear pockets",
  },
  {
    id: "denim-light-wide-leg-view-3",
    src: "/media/global-shop/denim-pdp/lumen-wide-leg-side.png",
    alt: "Side profile of the Lumen wide-leg jeans",
  },
  {
    id: "denim-light-wide-leg-view-4",
    src: "/media/global-shop/denim-pdp/lumen-wide-leg-flat.png",
    alt: "Lumen wide-leg jeans laid flat from waistband to hem",
  },
  {
    id: "denim-light-wide-leg-view-5",
    src: "/media/global-shop/denim-pdp/lumen-wide-leg-detail.png",
    alt: "Close view of the Lumen waistband, button, pocket, and stitching",
  },
];

const lumenWideLegInformation: ProductInformationSection[] = [
  {
    id: "details",
    title: "Details",
    summary:
      "A high-rise wide-leg jean with a close waist, relaxed hip, and clean full-length drape. The pale indigo wash is softly faded for an authentic worn-in look without rips or heavy distressing.",
    items: [
      "High rise: 12.25 in / 31 cm",
      "Inseam: 32.5 in / 82.5 cm",
      "Leg opening: 25 in / 63.5 cm",
      "Five-pocket construction with zip fly",
    ],
  },
  {
    id: "materials",
    title: "Materials & Care",
    summary:
      "Made from 12.5 oz non-stretch cotton denim with a structured hand that softens naturally with wear. Copper-tone topstitching and a matte silver shank button finish the construction.",
    items: [
      "100% cotton denim",
      "Machine wash cold, inside out, with similar colors",
      "Do not bleach; line dry to preserve the wash",
      "Designed without a leather back patch",
    ],
  },
  {
    id: "fit",
    title: "Size & Fit",
    summary:
      "Designed to sit at the natural waist with an easy fit through the hip before opening into a full wide leg. The denim is rigid at first and relaxes slightly after several wears.",
    items: [
      "Model is 5 ft 10 in / 178 cm and wears size 26",
      "True to size at the waist",
      "Choose the larger size if you are between sizes",
      "PrimeStyleAI fit profile and virtual try-on available",
    ],
  },
  {
    id: "shipping",
    title: "Shipping & Returns",
    summary:
      "Showcase delivery estimates and return eligibility are confirmed before checkout. Unworn items with original tags may be returned through the connected merchant flow.",
    items: [
      "Estimated standard delivery: 2–5 business days",
      "Free showcase returns within 30 days",
      "Tracked delivery updates",
      "Duties shown before payment where applicable",
    ],
  },
];

function getColorValue(color: string): string {
  return productColorValues[color] ?? "#777B73";
}

function getInformation(
  category: string,
  color: string,
  description: string,
  material?: string,
): ProductInformationSection[] {
  return [
    {
      id: "details",
      title: "Details",
      summary: description,
      items: [`Designed in ${color}`, "PrimeStyleAI fit profile available"],
    },
    {
      id: "materials",
      title: "Materials",
      summary:
        material ??
        categoryComposition[category] ??
        "Merchant-supplied material",
      items: ["Care instructions are included with the product"],
    },
    {
      id: "fit",
      title: "Size & Fit",
      summary:
        category === "Bags"
          ? "One-size accessory. Dimensions are confirmed at checkout."
          : "Fits true to size. Choose your usual size or use AI sizing for a personal match.",
      items: ["AI sizing available", "Virtual try-on ready"],
    },
    {
      id: "shipping",
      title: "Shipping & Returns",
      summary:
        "Delivery timing, duties, and return eligibility are confirmed before checkout.",
      items: ["Secure network checkout", "Order tracking included"],
    },
  ];
}

function getBrandGallery(
  product: BrandProduct,
  productIndex: number,
): ProductGalleryItem[] {
  const lookNumber = 15 + Math.floor(productIndex / 3);
  const gallery = [
    product.image,
    `/media/global-shop/runway-generated/look-${lookNumber}-model.png`,
    `/media/global-shop/runway-generated/look-${lookNumber}-model-tight.png`,
  ];

  return gallery.map((src, index) => ({
    id: `${product.id}-view-${index + 1}`,
    src,
    alt:
      index === 0
        ? `${product.name} product view`
        : `${product.name} styled runway view ${index}`,
  }));
}

function mapBrandRelated(
  products: BrandProduct[],
  currentId: string,
  brandName: string,
): ProductRelatedItem[] {
  return products
    .filter((product) => product.id !== currentId)
    .slice(0, 4)
    .map((product) => ({
      id: product.id,
      href: `/shop/product/${product.id}`,
      brandName,
      name: product.name,
      image: product.image,
      priceLabel: formatProductPrice(product.price * 100),
      badge: product.badge,
    }));
}

function mapCategoryRelated(
  products: RawCategoryProduct[],
  currentId: string,
): ProductRelatedItem[] {
  return products
    .filter((product) => product.id !== currentId)
    .slice(0, 4)
    .map((product) => ({
      id: product.id,
      href: `/shop/product/${product.id}`,
      brandName: product.brand,
      name: product.name,
      image: product.image,
      priceLabel: formatProductPrice(product.priceCents),
      badge: product.note,
    }));
}

function mapBrandProduct(
  source: Extract<RawProductDetailSource, { kind: "brand" }>,
): ProductDetailViewModel {
  const product = source.catalog.products[source.productIndex];
  const gallery = getBrandGallery(product, source.productIndex);
  const compareAtPriceCents = product.originalPrice
    ? product.originalPrice * 100
    : undefined;

  return {
    id: product.id,
    name: product.name,
    brandName: source.catalog.name,
    brandLogo: source.catalog.logo,
    badge: product.badge === "SALE" ? "Limited offer" : product.badge,
    category: product.category,
    color: product.color,
    colorHex: getColorValue(product.color),
    styleCode: product.styleCode,
    description: product.description,
    priceLabel: formatProductPrice(product.price * 100),
    compareAtPriceLabel: compareAtPriceCents
      ? formatProductPrice(compareAtPriceCents)
      : undefined,
    discountLabel: getDiscountLabel(product.price * 100, compareAtPriceCents),
    ratingLabel: (4.4 + product.popularity / 250).toFixed(1),
    reviewLabel: `${Math.max(18, product.popularity + source.productIndex * 7)} reviews`,
    sizes: product.sizes,
    gallery,
    featureImage: gallery.at(-1)?.src ?? product.image,
    sourceHref: `/shop/brand/${source.catalog.id}`,
    sourceLabel: `${source.catalog.name} edit`,
    note: `${product.color} · ${product.season} ${product.category}`,
    information: getInformation(
      product.category,
      product.color,
      product.description,
    ),
    related: mapBrandRelated(
      source.catalog.products,
      product.id,
      source.catalog.name,
    ),
  };
}

function getFacet(product: RawCategoryProduct, groupId: string): string {
  return product.facets.find((facet) => facet.groupId === groupId)?.value ?? "";
}

function mapCategoryProduct(
  source: Extract<RawProductDetailSource, { kind: "category" }>,
): ProductDetailViewModel {
  const product = source.catalog.products[source.productIndex];
  const category = getFacet(product, "category") || source.catalog.label;
  const color = getFacet(product, "color") || "Signature color";
  const material = getFacet(product, "material") || undefined;
  const sizeFacet = getFacet(product, "size");

  if (product.id === "denim-light-wide-leg") {
    return {
      id: product.id,
      name: product.name,
      brandName: product.brand,
      badge: "Showcase edition",
      category: "Women's jeans",
      color: "Washed light blue",
      colorHex: "#BCD4E3",
      styleCode: "NL-LW26-101",
      description:
        "A polished everyday jean with a defined high rise and an easy wide-leg silhouette. Cut in pale non-stretch denim, it balances a clean fitted waist with a fluid full-length shape.",
      priceLabel: formatProductPrice(product.priceCents),
      ratingLabel: "4.8",
      reviewLabel: "124 reviews",
      sizes: ["24", "25", "26", "27", "28", "29", "30", "31", "32", "33"],
      gallery: lumenWideLegGallery,
      featureImage: "/media/global-shop/denim-pdp/lumen-wide-leg-detail.png",
      sourceHref: `/shop/category/${source.catalog.id}`,
      sourceLabel: `${source.catalog.label} edit`,
      note: "Washed light blue · High rise · Non-stretch denim",
      information: lumenWideLegInformation,
      related: mapCategoryRelated(source.catalog.products, product.id),
    };
  }

  return {
    id: product.id,
    name: product.name,
    brandName: product.brand,
    badge: product.note,
    category,
    color,
    colorHex: getColorValue(color),
    styleCode: `${source.catalog.id.slice(0, 3).toUpperCase()}-${String(product.position).padStart(3, "0")}`,
    description: `${product.name} is selected for the ${source.catalog.label.toLowerCase()} edit and connected to PrimeStyleAI sizing and styling tools.`,
    priceLabel: formatProductPrice(product.priceCents),
    ratingLabel: (4.5 + (product.position % 4) / 10).toFixed(1),
    reviewLabel: `${36 + product.position * 11} reviews`,
    sizes:
      category === "Bags"
        ? ["One size"]
        : sizeFacet
          ? [sizeFacet]
          : ["XS", "S", "M", "L", "XL"],
    gallery: [
      {
        id: `${product.id}-view-1`,
        src: product.image,
        alt: `${product.name} product view`,
      },
    ],
    featureImage: source.catalog.heroImage,
    sourceHref: `/shop/category/${source.catalog.id}`,
    sourceLabel: `${source.catalog.label} edit`,
    note: `${color} · ${category}`,
    information: getInformation(
      category,
      color,
      `${product.name} is curated for easy outfitting across the connected store network.`,
      material,
    ),
    related: mapCategoryRelated(source.catalog.products, product.id),
  };
}

export function mapProductDetail(
  source: RawProductDetailSource,
): ProductDetailViewModel {
  return source.kind === "brand"
    ? mapBrandProduct(source)
    : mapCategoryProduct(source);
}
