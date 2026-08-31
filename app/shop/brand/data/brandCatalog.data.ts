import type { BrandCatalog, BrandProduct } from "../types/brandCatalog.types";
import { importedBrandProducts } from "./importedBrandProducts.data";
import { shopBrandProfiles } from "./brandProfiles.data";
import { generatedBrandProductIds } from "./generatedBrandProducts.data";

function withProductPhotography(importedProduct: BrandProduct): BrandProduct {
  // Correct only the display metadata that conflicts with the supplied photo
  // or the product's own title. Keep the imported snapshot unchanged.
  const product = { ...importedProduct };
  if (product.id === "zenana-08") {
    product.name = "Zenana Flutter Sleeve Top";
    product.description =
      "A relaxed black top with dropped shoulders, soft flutter sleeves and a round neckline, as shown in the supplier photo.";
  }
  if (product.id === "davi-dani-06") product.category = "Tops";
  if (product.id === "bombom-04") {
    product.name = "BOMBOM Printed Short Sleeve T-Shirt";
    product.description =
      "A relaxed black short-sleeve tee with a colorful tropical leaf print, curved hem and shallow V neckline, as shown in the supplier photo.";
  }

  if (!generatedBrandProductIds.has(product.id)) return product;

  const image = `/media/global-shop/brand-products-v1/${product.id}-front.png`;
  return {
    ...product,
    image,
    imageNotice:
      "AI-generated catalog preview based on the supplier photo. Details may vary; the original photo is included in the gallery.",
    gallery: [
      {
        src: image,
        alt: `${product.name} — AI-generated front catalog preview in ${product.color}`,
        caption: "AI-generated catalog preview",
      },
      {
        src: `/media/global-shop/brand-products-v1/references/${product.id}.webp`,
        alt: `${product.name} — original supplier photo in ${product.color}`,
        caption: "Original supplier photo",
      },
    ],
  };
}

export const brandCatalogData: BrandCatalog[] = shopBrandProfiles.map(
  (brand) => ({
    ...brand,
    products: importedBrandProducts[brand.id].map(withProductPhotography),
  }),
);
