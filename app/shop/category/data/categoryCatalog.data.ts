import { brandCatalogData } from "../../brand/data/brandCatalog.data";
import type { BrandProduct } from "../../brand/types/brandCatalog.types";
import type {
  ActiveRawCategoryCatalog,
  RawCategoryCatalog,
  RawCategoryFilter,
  RawCategoryProduct,
} from "../types/categoryCatalog.types";
import {
  getShowcaseProductSpecification,
  getShowcaseProductsByGender,
  showcaseAsset,
  type ShowcaseGender,
  type ShowcaseProduct,
} from "../../data/showcaseCatalog.data";

const sharedFilters = [
  {
    id: "category",
    label: "Category",
    options: ["Jackets", "Tops", "Bottoms", "Sets", "Bags"],
  },
  {
    id: "price",
    label: "Price",
    options: ["Under $100", "$100–$175", "$175+"],
  },
  { id: "size", label: "Size", options: ["XS", "S", "M", "L", "XL"] },
  {
    id: "brand",
    label: "Brands",
    options: ["Northline", "Assembly 01", "Mara & Form", "Onda Studio"],
  },
  {
    id: "color",
    label: "Color",
    options: ["Indigo", "Light blue", "Black", "Ivory", "Cobalt", "Coral"],
  },
  {
    id: "material",
    label: "Material",
    options: ["Denim", "Cotton", "Technical", "Leather"],
  },
];

export const legacyCategoryCatalogData: RawCategoryCatalog[] = [
  {
    id: "denim",
    label: "Denim",
    seasonTitle: "SEASON DROP 2026",
    intro:
      "Fresh structure. Personal fit. Denim selected across the network and ready for AI sizing.",
    heroImage: "/media/global-shop/denim-category-shoe-two-models-banner.png",
    mobileHeroImage:
      "/media/global-shop/denim-category-shoe-two-models-mobile.png",
    heroAlt:
      "Two women in denim posed with an enormous denim-covered high-heel shoe",
    heroObjectPosition: "center",
    announcementItems: [
      "Fresh arrivals",
      "Step into ’26",
      "Limited release",
      "New season drop",
    ],
    filters: sharedFilters,
    products: [
      {
        id: "denim-light-wide-leg",
        name: "Lumen Wide Leg",
        brand: "Northline",
        priceCents: 13800,
        image: "/media/global-shop/denim-pdp/lumen-wide-leg-hero.png",
        note: "AI fit ready",
        position: 1,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "size", value: "M" },
          { groupId: "brand", value: "Northline" },
          { groupId: "color", value: "Light blue" },
          { groupId: "material", value: "Denim" },
        ],
      },
      {
        id: "denim-indigo-straight",
        name: "Indigo Line Straight",
        brand: "Assembly 01",
        priceCents: 12800,
        image:
          "/media/global-shop/denim-products/denim-jeans-02-indigo-straight-v2.png",
        note: "Virtual try-on",
        position: 2,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "size", value: "S" },
          { groupId: "brand", value: "Assembly 01" },
          { groupId: "color", value: "Indigo" },
          { groupId: "material", value: "Denim" },
        ],
      },
      {
        id: "denim-barrel-vintage",
        name: "Arc Barrel Jean",
        brand: "Onda Studio",
        priceCents: 14200,
        image:
          "/media/global-shop/denim-products/denim-jeans-03-barrel-vintage-v2.png",
        note: "Fit verified",
        position: 3,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "size", value: "L" },
          { groupId: "brand", value: "Onda Studio" },
          { groupId: "color", value: "Light blue" },
          { groupId: "material", value: "Denim" },
        ],
      },
      {
        id: "denim-raw-bootcut",
        name: "Noir Raw Bootcut",
        brand: "Mara & Form",
        priceCents: 16800,
        image:
          "/media/global-shop/denim-products/denim-jeans-04-raw-bootcut-v2.png",
        note: "Limited drop",
        position: 4,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "size", value: "M" },
          { groupId: "brand", value: "Mara & Form" },
          { groupId: "color", value: "Indigo" },
          { groupId: "material", value: "Denim" },
        ],
      },
      {
        id: "denim-carpenter",
        name: "Utility Carpenter Jean",
        brand: "Northline",
        priceCents: 14800,
        image:
          "/media/global-shop/denim-products/denim-jeans-05-carpenter-v2.png",
        note: "Creator favorite",
        position: 5,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "size", value: "L" },
          { groupId: "brand", value: "Northline" },
          { groupId: "color", value: "Light blue" },
          { groupId: "material", value: "Denim" },
        ],
      },
      {
        id: "denim-low-rise-baggy",
        name: "Low Rise Volume Jean",
        brand: "Onda Studio",
        priceCents: 15600,
        image:
          "/media/global-shop/denim-products/denim-jeans-06-low-rise-baggy-v2.png",
        note: "New season",
        position: 6,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "size", value: "S" },
          { groupId: "brand", value: "Onda Studio" },
          { groupId: "color", value: "Light blue" },
          { groupId: "material", value: "Denim" },
        ],
      },
      {
        id: "denim-dark-flare",
        name: "Afterdark Flare",
        brand: "Assembly 01",
        priceCents: 17200,
        image:
          "/media/global-shop/denim-products/denim-jeans-07-dark-flare-v2.png",
        note: "AI fit ready",
        position: 7,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "size", value: "M" },
          { groupId: "brand", value: "Assembly 01" },
          { groupId: "color", value: "Indigo" },
          { groupId: "material", value: "Denim" },
        ],
      },
      {
        id: "denim-cropped-cigarette",
        name: "Cropped Line Jean",
        brand: "Mara & Form",
        priceCents: 11800,
        image:
          "/media/global-shop/denim-products/denim-jeans-08-cropped-cigarette-v2.png",
        note: "Virtual try-on",
        position: 8,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "size", value: "XS" },
          { groupId: "brand", value: "Mara & Form" },
          { groupId: "color", value: "Light blue" },
          { groupId: "material", value: "Denim" },
        ],
      },
      {
        id: "denim-patchwork-wide",
        name: "Mosaic Wide Leg",
        brand: "Northline",
        priceCents: 18800,
        image:
          "/media/global-shop/denim-products/denim-jeans-09-patchwork-wide-v2.png",
        note: "Limited drop",
        position: 9,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$175+" },
          { groupId: "size", value: "L" },
          { groupId: "brand", value: "Northline" },
          { groupId: "color", value: "Indigo" },
          { groupId: "material", value: "Denim" },
        ],
      },
      {
        id: "denim-tailored-cargo",
        name: "Studio Cargo Jean",
        brand: "Onda Studio",
        priceCents: 16200,
        image:
          "/media/global-shop/denim-products/denim-jeans-10-tailored-cargo-v2.png",
        note: "Fit verified",
        position: 10,
        facets: [
          { groupId: "category", value: "Bottoms" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "size", value: "XL" },
          { groupId: "brand", value: "Onda Studio" },
          { groupId: "color", value: "Light blue" },
          { groupId: "material", value: "Denim" },
        ],
      },
    ],
  },
  {
    id: "women",
    label: "Women",
    seasonTitle: "WOMEN’S EDIT 2026",
    intro:
      "Expressive color, sculpted tailoring, and connected looks sized around you.",
    heroImage: "/media/global-shop/outfit-editorial-orange-source.png",
    heroAlt:
      "Editorial cream outfit styled with a vivid orange quilted handbag",
    heroObjectPosition: "center",
    announcementItems: [
      "New silhouettes",
      "Try the look",
      "Style with AI",
      "Connected brands",
    ],
    filters: sharedFilters,
    products: [
      {
        id: "orange-shell",
        name: "Signal Sport Shell",
        brand: "Onda Studio",
        priceCents: 19800,
        image: "/media/global-shop/product-coral-redhead-3d.webp",
        note: "Virtual try-on",
        position: 1,
        facets: [
          { groupId: "category", value: "Jackets" },
          { groupId: "price", value: "$175+" },
          { groupId: "brand", value: "Onda Studio" },
          { groupId: "color", value: "Coral" },
          { groupId: "material", value: "Technical" },
        ],
      },
      {
        id: "noir-halo",
        name: "Noir Halo Blazer",
        brand: "Onda Studio",
        priceCents: 16400,
        image: "/media/global-shop/product-coral-black-3d.webp",
        note: "Trending now",
        position: 2,
        facets: [
          { groupId: "category", value: "Jackets" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "brand", value: "Onda Studio" },
          { groupId: "color", value: "Black" },
          { groupId: "material", value: "Cotton" },
        ],
      },
      {
        id: "lilac-volume",
        name: "Lilac Volume Jacket",
        brand: "Mara & Form",
        priceCents: 18800,
        image: "/media/global-shop/product-lilac-lime-3d.webp",
        note: "Styled by AI",
        position: 3,
        facets: [
          { groupId: "category", value: "Jackets" },
          { groupId: "price", value: "$175+" },
          { groupId: "brand", value: "Mara & Form" },
          { groupId: "material", value: "Technical" },
        ],
      },
      {
        id: "cloudline-layer",
        name: "Cloudline Layer Set",
        brand: "Afterglow",
        priceCents: 13200,
        image: "/media/global-shop/product-camel-3d.webp",
        note: "Creator favorite",
        position: 4,
        facets: [
          { groupId: "category", value: "Sets" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "color", value: "Ivory" },
          { groupId: "material", value: "Cotton" },
        ],
      },
    ],
  },
  {
    id: "men",
    label: "Men",
    seasonTitle: "MEN’S DROP 2026",
    intro:
      "Technical layers and clean proportions selected from connected menswear brands.",
    heroImage: "/media/global-shop/product-cobalt-3d.webp",
    heroAlt: "Cobalt technical menswear look",
    heroObjectPosition: "center 38%",
    announcementItems: [
      "Modern layers",
      "AI fit ready",
      "Fresh arrivals",
      "Limited release",
    ],
    filters: sharedFilters,
    products: [
      {
        id: "cobalt-track",
        name: "Cobalt Track Set",
        brand: "Assembly 01",
        priceCents: 17200,
        image: "/media/global-shop/product-cobalt-3d.webp",
        note: "AI fit ready",
        position: 1,
        facets: [
          { groupId: "category", value: "Sets" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "brand", value: "Assembly 01" },
          { groupId: "color", value: "Cobalt" },
          { groupId: "material", value: "Technical" },
        ],
      },
      {
        id: "cloudline-men",
        name: "Cloudline Overshirt",
        brand: "Afterglow",
        priceCents: 11800,
        image: "/media/global-shop/product-camel-3d.webp",
        note: "New arrival",
        position: 2,
        facets: [
          { groupId: "category", value: "Tops" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "color", value: "Ivory" },
          { groupId: "material", value: "Cotton" },
        ],
      },
    ],
  },
  {
    id: "accessories",
    label: "Accessories",
    seasonTitle: "ACCESSORY EDIT 2026",
    intro:
      "Finish the look with bags selected to work across your connected wardrobe.",
    heroImage: "/media/global-shop/stylist-cobalt-3d.webp",
    heroAlt: "Cobalt handbag in a dimensional fashion campaign",
    heroObjectPosition: "center",
    announcementItems: [
      "Finish the look",
      "Creator picks",
      "New bags",
      "Style with AI",
    ],
    filters: sharedFilters,
    products: [
      {
        id: "form-02",
        name: "Form 02 Handbag",
        brand: "Mara & Form",
        priceCents: 11900,
        image: "/media/global-shop/stylist-cobalt-3d.webp",
        note: "3 outfit matches",
        position: 1,
        facets: [
          { groupId: "category", value: "Bags" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "brand", value: "Mara & Form" },
          { groupId: "color", value: "Cobalt" },
          { groupId: "material", value: "Leather" },
        ],
      },
      {
        id: "arc-mini",
        name: "Arc Mini Bag",
        brand: "Mara & Form",
        priceCents: 9600,
        image: "/media/global-shop/stylist-coral-3d.webp",
        note: "New arrival",
        position: 2,
        facets: [
          { groupId: "category", value: "Bags" },
          { groupId: "price", value: "Under $100" },
          { groupId: "brand", value: "Mara & Form" },
          { groupId: "color", value: "Coral" },
          { groupId: "material", value: "Leather" },
        ],
      },
      {
        id: "colossus-bag",
        name: "Colossus Carryall",
        brand: "Mara & Form",
        priceCents: 13200,
        image: "/media/global-shop/denim-colossus-3d.webp",
        note: "Creator favorite",
        position: 3,
        facets: [
          { groupId: "category", value: "Bags" },
          { groupId: "price", value: "$100–$175" },
          { groupId: "brand", value: "Mara & Form" },
          { groupId: "color", value: "Light blue" },
          { groupId: "material", value: "Denim" },
        ],
      },
    ],
  },
];

const showcaseFilterLabels = [
  { id: "category", label: "Category" },
  { id: "price", label: "Price" },
  { id: "size", label: "Size" },
  { id: "brand", label: "Brands" },
  { id: "color", label: "Color" },
  { id: "material", label: "Material" },
] as const;

const slotLabel = {
  top: "Tops",
  bottom: "Bottoms",
  shoe: "Shoes",
  bag: "Bags",
  accessory: "Accessories",
} as const;

function priceFacet(priceCents: number) {
  if (priceCents < 10000) return "Under $100";
  if (priceCents <= 17500) return "$100–$175";
  return "$175+";
}

function colorFacet(color: string) {
  if (/blue|slate/i.test(color)) return "Blue";
  if (/grey|charcoal/i.test(color)) return "Grey";
  if (/burgundy|oxblood/i.test(color)) return "Burgundy";
  if (/ivory/i.test(color)) return "Ivory";
  if (/stone|sand|limestone/i.test(color)) return "Stone";
  if (/olive|sage/i.test(color)) return "Olive";
  return "Brown";
}

function materialFacet(material: string) {
  if (/wool/i.test(material)) return "Wool";
  if (/cotton|canvas/i.test(material)) return "Cotton";
  if (/suede/i.test(material)) return "Suede";
  if (/leather|calf/i.test(material)) return "Leather";
  if (/silk/i.test(material)) return "Silk";
  return "Technical";
}

function filtersFromProducts(
  products: RawCategoryProduct[],
): RawCategoryFilter[] {
  return showcaseFilterLabels.flatMap(({ id, label }) => {
    const options = Array.from(
      new Set(
        products.flatMap((product) =>
          product.facets
            .filter((facet) => facet.groupId === id)
            .map((facet) => facet.value),
        ),
      ),
    );
    return options.length > 0 ? [{ id, label, options }] : [];
  });
}

function showcaseEditorialAsset(product: ShowcaseProduct, file: string) {
  return `/media/global-shop/showcase-v5/${product.gender}/${product.id}/${file}.png`;
}

function showcaseGallery(product: ShowcaseProduct) {
  const views = [
    [
      "03-model-front",
      `Editorial model wearing or carrying ${product.name} from the front`,
      "Editorial front",
      true,
    ],
    [
      "04-model-three-quarter",
      `Closer editorial model view of ${product.name}`,
      "Editorial close view",
      true,
    ],
    [
      "05-model-back",
      `Editorial rear model view of ${product.name}`,
      "Editorial rear",
      true,
    ],
    [
      "06-model-movement",
      `Editorial movement view of ${product.name}`,
      "Editorial in movement",
      true,
    ],
    [
      "07-model-crop",
      `Closer worn detail of ${product.name}`,
      "Worn detail",
      true,
    ],
    [
      "09-model-alternate",
      `Alternate editorial model view of ${product.name}`,
      "Alternate editorial",
      true,
    ],
    [
      "01-product-front",
      `${product.name} isolated front view`,
      "Product front",
      false,
    ],
    [
      "02-product-back",
      `${product.name} isolated alternate view`,
      "Product back",
      false,
    ],
    [
      "08-detail",
      `Material and construction detail of ${product.name}`,
      "Material detail",
      false,
    ],
  ] as const;
  return views.map(([file, alt, caption, editorial]) => ({
    src: editorial
      ? showcaseEditorialAsset(product, file)
      : showcaseAsset(product, file),
    alt,
    caption,
  }));
}

function mapShowcaseProduct(product: ShowcaseProduct, position: number) {
  const specification = getShowcaseProductSpecification(product.id);
  if (!specification) {
    throw new Error(
      `Missing generated showcase specification for ${product.id}`,
    );
  }

  return {
    id: product.id,
    name: product.name,
    brand: "PrimeStyleAI Atelier",
    priceCents: product.priceCents,
    image: showcaseAsset(product, "01-product-front"),
    hoverImage: showcaseAsset(product, "02-product-back"),
    note: "Generated showcase",
    position: position + 1,
    gender: product.gender,
    slot: product.slot,
    fitType: product.fitType,
    sizes: product.sizes,
    measurements: product.measurements,
    description: product.description,
    material: product.material,
    details: specification.details,
    materialDetails: specification.materialDetails,
    careInstructions: specification.careInstructions,
    fitDescription: specification.fitDescription,
    fitNotes: specification.fitNotes,
    sizeGuide: specification.sizeGuide,
    showcaseNotes: [
      "Original AI-generated product and model photography",
      "Structured illustrative size chart is passed to the PrimeStyleAI SDK",
      "No supplier-verified composition, stock, review, fulfillment, or production-fit claim",
      "Created for showcase, AI Stylist, virtual try-on, and sizing workflow testing",
    ],
    colorHex: product.colorHex,
    displayColor: product.color,
    gallery: showcaseGallery(product),
    garmentReferenceImage: showcaseAsset(product, "01-product-front"),
    garmentDetailImage: showcaseAsset(product, "08-detail"),
    facets: [
      { groupId: "category", value: slotLabel[product.slot] },
      { groupId: "price", value: priceFacet(product.priceCents) },
      ...product.sizes.map((size) => ({ groupId: "size", value: size })),
      { groupId: "brand", value: "PrimeStyleAI Atelier" },
      { groupId: "color", value: colorFacet(product.color) },
      { groupId: "material", value: materialFacet(product.material) },
    ],
  };
}

function mapBrandProduct(
  brandName: string,
  product: BrandProduct,
  position: number,
): RawCategoryProduct {
  return {
    id: product.id,
    name: product.name,
    brand: brandName,
    priceCents: Math.round(product.price * 100),
    image: product.image,
    hoverImage: product.gallery?.[1]?.src,
    note: product.badge === "SALE" ? "Limited offer" : "Imported collection",
    position,
    sizes: product.sizes,
    description: product.description,
    displayColor: product.color,
    facets: [
      { groupId: "category", value: product.category },
      { groupId: "price", value: priceFacet(product.price * 100) },
      ...product.sizes.map((size) => ({ groupId: "size", value: size })),
      { groupId: "brand", value: brandName },
      { groupId: "color", value: product.color },
    ],
  };
}

function makeShowcaseCatalog(gender: ShowcaseGender): ActiveRawCategoryCatalog {
  const existingCatalog = legacyCategoryCatalogData.find(
    (catalog) => catalog.id === gender,
  );
  if (!existingCatalog || existingCatalog.id === "denim") {
    throw new Error(`Missing existing ${gender} category presentation`);
  }

  const showcaseProducts =
    getShowcaseProductsByGender(gender).map(mapShowcaseProduct);
  const denimProducts =
    gender === "women"
      ? (
          legacyCategoryCatalogData.find((catalog) => catalog.id === "denim")
            ?.products ?? []
        ).map((product, index) => ({
          ...product,
          position: showcaseProducts.length + index + 1,
        }))
      : [];
  const brandProducts =
    gender === "women"
      ? brandCatalogData
          .flatMap((brand) =>
            brand.products.map((product) => ({
              brandName: brand.name,
              product,
            })),
          )
          .map(({ brandName, product }, index) =>
            mapBrandProduct(
              brandName,
              product,
              showcaseProducts.length + denimProducts.length + index + 1,
            ),
          )
      : [];
  const products = [...showcaseProducts, ...denimProducts, ...brandProducts];

  return {
    ...existingCatalog,
    id: gender,
    heroImage: `/media/global-shop/showcase-v4/category-banners/${gender}-category-desktop.webp`,
    mobileHeroImage: `/media/global-shop/showcase-v4/category-banners/${gender}-category-mobile.webp`,
    heroAlt:
      gender === "women"
        ? "Women’s tailored garments and accessories arranged in a warm neutral studio"
        : "Men’s tailored garments and accessories arranged in a warm neutral studio",
    heroObjectPosition: "center",
    filters: filtersFromProducts(products),
    products,
  };
}

const accessoriesCatalog = legacyCategoryCatalogData.find(
  (catalog): catalog is ActiveRawCategoryCatalog =>
    catalog.id === "accessories",
);

if (!accessoriesCatalog) {
  throw new Error("Missing existing accessories category presentation");
}

export const categoryCatalogData: ActiveRawCategoryCatalog[] = [
  accessoriesCatalog,
  makeShowcaseCatalog("women"),
  makeShowcaseCatalog("men"),
];
