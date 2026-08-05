import assert from "node:assert/strict";
import test from "node:test";
import { mapShopifyProduct } from "./shopifyProductsMapper";

test("maps the selected Shopify product into a product-workspace DTO", () => {
  const product = mapShopifyProduct(
    {
      id: "gid://shopify/Product/123",
      title: "Merino blazer",
      handle: "merino-blazer",
      status: "ACTIVE",
      storefrontUrl: "https://store.example/products/merino-blazer",
      featuredImage: "https://cdn.shopify.com/blazer.jpg",
      media: [
        {
          id: "gid://shopify/MediaImage/1",
          type: "IMAGE",
          url: "https://cdn.shopify.com/blazer.jpg",
          altText: "Merino blazer front",
          width: 1200,
          height: 1200,
        },
      ],
      variants: [
        { id: "gid://shopify/ProductVariant/1", title: "S", price: "129" },
      ],
    },
    "USD",
  );

  assert.equal(product.storefrontUrl, "https://store.example/products/merino-blazer");
  assert.equal(product.media[0]?.id, "gid://shopify/MediaImage/1");
  assert.equal(product.priceLabel, "$129");
});
