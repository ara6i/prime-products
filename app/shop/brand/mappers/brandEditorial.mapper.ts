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

const bloomingdalesCategoryCards: BrandCategoryCard[] = [
  {
    label: "Women",
    value: null,
    href: "/shop/category/women",
    image: "/media/global-shop/brand-categories/bloomingdales-women.webp",
    meta: "Shop women",
    imageFit: "cover",
  },
  {
    label: "Men",
    value: null,
    href: "/shop/category/men",
    image: "/media/global-shop/brand-categories/bloomingdales-men.webp",
    meta: "Shop men",
    imageFit: "cover",
  },
  {
    label: "Dresses",
    value: "Dresses",
    image: "/media/global-shop/brand-categories/bloomingdales-dresses.webp",
    imageFit: "cover",
  },
  {
    label: "Gowns",
    value: "Gowns",
    image: "/media/global-shop/brand-categories/bloomingdales-gowns.webp",
    imageFit: "cover",
  },
  {
    label: "Tops",
    value: null,
    href: "/shop/category/women",
    image: "/media/global-shop/brand-categories/bloomingdales-tops.webp",
    meta: "New season",
    imageFit: "cover",
  },
  {
    label: "Denim",
    value: null,
    href: "/shop/category/denim",
    image: "/media/global-shop/brand-categories/bloomingdales-denim.webp",
    meta: "Shop denim",
    imageFit: "cover",
  },
  {
    label: "Shoes",
    value: null,
    href: "/shop/category/accessories",
    image: "/media/global-shop/brand-categories/bloomingdales-shoes.webp",
    meta: "Shop shoes",
    imageFit: "cover",
  },
  {
    label: "Handbags",
    value: null,
    href: "/shop/category/accessories",
    image: "/media/global-shop/brand-categories/bloomingdales-handbags.webp",
    meta: "Shop bags",
    imageFit: "cover",
  },
  {
    label: "Accessories",
    value: null,
    href: "/shop/category/accessories",
    image: "/media/global-shop/brand-categories/bloomingdales-accessories.webp",
    meta: "The finishing touch",
    imageFit: "cover",
  },
  {
    label: "Activewear",
    value: null,
    href: "/shop/category/women",
    image: "/media/global-shop/brand-categories/bloomingdales-activewear.webp",
    meta: "Move in style",
    imageFit: "cover",
  },
];

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
  if (catalog.id === "bloomingdales") {
    return bloomingdalesCategoryCards.map((category) => {
      if (!category.value) return category;

      return {
        ...category,
        count: catalog.products.filter(
          (product) => product.category === category.value,
        ).length,
      };
    });
  }

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
