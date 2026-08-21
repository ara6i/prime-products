import {
  brandEditorialAssets,
  editorialNewsStories,
  editorialPromoStories,
} from "../data/brandEditorial.data";
import type {
  BrandCatalog,
  BrandCategoryCard,
  BrandEditorialViewModel,
  BrandFilterOptions,
} from "../types/brandCatalog.types";

function unique(values: string[]) {
  return [...new Set(values)];
}

function mapFilterOptions(catalog: BrandCatalog): BrandFilterOptions {
  const categories = unique(
    catalog.products.map((product) => product.category),
  );

  return {
    categories,
    categoryCounts: Object.fromEntries(
      categories.map((category) => [
        category,
        catalog.products.filter((product) => product.category === category)
          .length,
      ]),
    ),
    seasons: unique(catalog.products.map((product) => product.season)),
    colors: unique(catalog.products.map((product) => product.color)),
    sizes: unique(catalog.products.flatMap((product) => product.sizes)),
  };
}

function mapCategoryCards(catalog: BrandCatalog): BrandCategoryCard[] {
  const categories = unique(
    catalog.products.map((product) => product.category),
  );
  const firstProduct = catalog.products[0];

  if (!firstProduct) return [];

  return [
    {
      label: "All styles",
      value: null,
      image: firstProduct.image,
      count: catalog.products.length,
    },
    ...categories.map((category) => {
      const products = catalog.products.filter(
        (product) => product.category === category,
      );

      return {
        label: category,
        value: category,
        image: products[0]?.image ?? firstProduct.image,
        count: products.length,
      };
    }),
  ];
}

export function mapBrandCatalogToEditorial(
  catalog: BrandCatalog,
): BrandEditorialViewModel {
  const droppedEyebrows = [
    "New season",
    "Most wanted",
    "Editor pick",
    "Just in",
  ];

  return {
    catalog,
    assets: brandEditorialAssets,
    droppedProducts: catalog.products.slice(0, 4).map((product, index) => ({
      product,
      eyebrow: droppedEyebrows[index],
    })),
    categoryCards: mapCategoryCards(catalog),
    promoStories: editorialPromoStories,
    newsStories: editorialNewsStories,
    filterOptions: mapFilterOptions(catalog),
    newCount: catalog.products.filter((product) => product.badge === "NEW")
      .length,
    saleCount: catalog.products.filter((product) => product.badge === "SALE")
      .length,
  };
}
