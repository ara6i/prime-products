import type {
  BrandCatalog,
  BrandProduct,
  ShopBrandId,
} from "../types/brandCatalog.types";
import { rakutenPartnerProducts } from "./rakutenPartnerProducts.data";

const productTemplates: Omit<BrandProduct, "name" | "styleCode">[] = [
  {
    id: "signal-shell",
    price: 198,
    badge: "NEW",
    image: "/media/global-shop/runway-generated/look-15-shell-v2.png",
    category: "Outerwear",
    season: "Spring",
    color: "Coral",
    sizes: ["XS", "S", "M", "L"],
    description:
      "A light technical shell cut for movement, layering, and an easy transition from city streets to weekend travel.",
    popularity: 98,
  },
  {
    id: "arc-mini-bag",
    price: 96,
    originalPrice: 118,
    badge: "SALE",
    image: "/media/global-shop/runway-generated/look-15-bag-v4.png",
    category: "Bags",
    season: "Spring",
    color: "Coral",
    sizes: ["One size"],
    description:
      "A compact curved carry with a structured body and enough room for the daily essentials.",
    popularity: 92,
  },
  {
    id: "cloud-runner-02",
    price: 124,
    image: "/media/global-shop/runway-generated/look-15-sneaker-v2.png",
    category: "Footwear",
    season: "Summer",
    color: "White",
    sizes: ["6", "7", "8", "9", "10"],
    description:
      "A cushioned everyday runner with a sculpted sole and lightweight mesh upper for all-day comfort.",
    popularity: 96,
  },
  {
    id: "column-coat",
    price: 224,
    image: "/media/global-shop/runway-generated/look-16-coat-v2.png",
    category: "Outerwear",
    season: "Autumn",
    color: "Camel",
    sizes: ["XS", "S", "M", "L", "XL"],
    description:
      "A long clean-lined coat with a relaxed shoulder and warm structure designed for precise layering.",
    popularity: 87,
  },
  {
    id: "nocturne-dress",
    price: 142,
    image: "/media/global-shop/runway-generated/look-16-dress-v2.png",
    category: "Dresses",
    season: "Autumn",
    color: "Black",
    sizes: ["XS", "S", "M", "L"],
    description:
      "A minimal black mini with a sharp neckline and close silhouette, made for day-to-night styling.",
    popularity: 90,
  },
  {
    id: "ankle-boots",
    price: 169,
    badge: "NEW",
    image: "/media/global-shop/runway-generated/look-16-black-boots.png",
    category: "Footwear",
    season: "Autumn",
    color: "Black",
    sizes: ["6", "7", "8", "9", "10"],
    description:
      "A streamlined leather ankle boot with a stable heel, fitted shaft, and softly squared toe.",
    popularity: 89,
  },
  {
    id: "volume-jacket",
    price: 188,
    image: "/media/global-shop/runway-generated/look-17-jacket-v2.png",
    category: "Outerwear",
    season: "Spring",
    color: "Lilac",
    sizes: ["XS", "S", "M", "L"],
    description:
      "A statement jacket balancing soft volume with a precise cropped shape and comfortable light insulation.",
    popularity: 95,
  },
  {
    id: "cobalt-midi",
    price: 136,
    image: "/media/global-shop/runway-generated/look-17-skirt-v2.png",
    category: "Bottoms",
    season: "Spring",
    color: "Cobalt",
    sizes: ["XS", "S", "M", "L"],
    description:
      "A clean cobalt midi with soft structure, subtle movement, and a high waist made for tucked layers.",
    popularity: 84,
  },
  {
    id: "form-02-bag",
    price: 119,
    image: "/media/global-shop/runway-generated/look-17-bag-v2.png",
    category: "Bags",
    season: "Summer",
    color: "Cobalt",
    sizes: ["One size"],
    description:
      "A compact cobalt handbag with a refined geometric profile and a convertible shoulder strap.",
    popularity: 91,
  },
  {
    id: "mist-track-set",
    price: 172,
    originalPrice: 205,
    badge: "SALE",
    image: "/media/global-shop/runway-generated/look-18-track-set-v2.png",
    category: "Sets",
    season: "Summer",
    color: "Ice blue",
    sizes: ["XS", "S", "M", "L", "XL"],
    description:
      "A fluid matching set with a relaxed technical hand, articulated seams, and a soft ice-blue finish.",
    popularity: 82,
  },
  {
    id: "cloud-runner-03",
    price: 132,
    image: "/media/global-shop/runway-generated/look-18-sneaker-v2.png",
    category: "Footwear",
    season: "Summer",
    color: "White",
    sizes: ["6", "7", "8", "9", "10"],
    description:
      "An airy low-profile runner built around a flexible sole, breathable upper, and quiet tonal detailing.",
    popularity: 86,
  },
  {
    id: "half-moon-bag",
    price: 128,
    image: "/media/global-shop/runway-generated/look-18-bag-v2.png",
    category: "Bags",
    season: "Summer",
    color: "Cobalt",
    sizes: ["One size"],
    description:
      "A soft half-moon shoulder bag with a slim strap, magnetic closure, and polished tonal hardware.",
    popularity: 80,
  },
];

const brands: Array<{
  id: ShopBrandId;
  name: string;
  shortName: string;
  logo?: string;
  descriptor: string;
}> = [
  {
    id: "bloomingdales",
    name: "Bloomingdale's",
    shortName: "BLOOMINGDALE'S",
    logo: "/images/landing/brand-bloomingdales.svg",
    descriptor: "The luxury department-store edit, curated for now.",
  },
  {
    id: "ymi-jeans",
    name: "YMI Jeans",
    shortName: "YMI",
    logo: "https://ymijeans.com/cdn/shop/files/black-logo_100x@2x.png?v=1701906525",
    descriptor: "Los Angeles denim made around confidence and fit.",
  },
  {
    id: "shop-simon",
    name: "ShopSimon",
    shortName: "SHOPSIMON",
    logo: "/images/landing/brand-shopsimon.svg",
    descriptor: "Designer finds and outlet discoveries in one edit.",
  },
  {
    id: "davids-bridal",
    name: "David's Bridal",
    shortName: "DAVID'S BRIDAL",
    logo: "/images/landing/brand-davids-bridal.svg",
    descriptor: "Celebration dressing for every aisle and invitation.",
  },
  {
    id: "mens-wearhouse",
    name: "Men's Wearhouse",
    shortName: "MEN'S WEARHOUSE",
    logo: "/images/landing/brand-mens-wearhouse.svg",
    descriptor: "Modern tailoring and occasion-ready menswear.",
  },
  {
    id: "patbo",
    name: "PatBO",
    shortName: "PATBO",
    logo: "/images/landing/brand-patbo.svg",
    descriptor: "Brazilian craft, vibrant color, and statement silhouettes.",
  },
  {
    id: "nike",
    name: "Nike",
    shortName: "NIKE",
    logo: "/media/global-shop/brand-logos/nike.svg",
    descriptor: "Performance essentials selected for everyday movement.",
  },
  {
    id: "adidas",
    name: "adidas",
    shortName: "adidas",
    logo: "/media/global-shop/brand-logos/adidas.svg",
    descriptor: "Sport codes with a modern point of view.",
  },
  {
    id: "ganni",
    name: "GANNI",
    shortName: "GANNI",
    logo: "/media/global-shop/brand-logos/ganni.svg",
    descriptor: "Playful proportion and expressive color.",
  },
  {
    id: "new-balance",
    name: "New Balance",
    shortName: "NB",
    logo: "/media/global-shop/brand-logos/new-balance.svg",
    descriptor: "Everyday icons, shaped around comfort.",
  },
  {
    id: "reiss",
    name: "Reiss",
    shortName: "REISS",
    logo: "/media/global-shop/brand-logos/reiss.svg",
    descriptor: "Quiet tailoring with confident structure.",
  },
  {
    id: "aritzia",
    name: "Aritzia",
    shortName: "ARITZIA",
    logo: "/media/global-shop/brand-logos/aritzia.svg",
    descriptor: "Elevated essentials made to work together.",
  },
  {
    id: "assembly-01",
    name: "Assembly 01",
    shortName: "A/01",
    descriptor: "The essential, rebuilt.",
  },
  {
    id: "northline",
    name: "Northline",
    shortName: "NORTHLINE",
    descriptor: "A new language of denim and utility.",
  },
];

export const brandCatalogData: BrandCatalog[] = brands.map(
  (brand, brandIndex) => {
    const partnerProducts = rakutenPartnerProducts[brand.id];

    return {
      ...brand,
      products: partnerProducts
        ? partnerProducts.map((product, productIndex) => ({
            ...product,
            id: `${brand.id}-${product.id}`,
            badge: productIndex < 2 ? ("NEW" as const) : undefined,
            season: "Current",
            sizes: ["See merchant"],
            description: `${product.name} from ${brand.name}, sourced from the retailer's approved Rakuten catalog snapshot.`,
            popularity: 100 - productIndex,
            styleCode: `RKT-${String(brandIndex + 1).padStart(2, "0")}-${String(productIndex + 1).padStart(2, "0")}`,
          }))
        : productTemplates.map((product, productIndex) => ({
            ...product,
            id: `${brand.id}-${product.id}`,
            name: `${brand.name} ${
              [
                "Signal Shell",
                "Arc Mini",
                "Cloud Runner 02",
                "Column Coat",
                "Nocturne Mini",
                "Form Ankle Boot",
                "Volume Jacket",
                "Cobalt Midi",
                "Form 02 Handbag",
                "Mist Track Set",
                "Cloud Runner 03",
                "Half-Moon Bag",
              ][productIndex]
            }`,
            styleCode: `${brand.id.slice(0, 3).toUpperCase()}-${String(brandIndex + 1).padStart(2, "0")}${String(productIndex + 1).padStart(2, "0")}`,
          })),
    };
  },
);
