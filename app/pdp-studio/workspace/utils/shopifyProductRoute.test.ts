import assert from "node:assert/strict";
import test from "node:test";
import { decodeShopifyProductRouteId } from "./shopifyProductRoute";

test("decodes an encoded Shopify GraphQL product ID exactly once", () => {
  assert.equal(
    decodeShopifyProductRouteId("gid%3A%2F%2Fshopify%2FProduct%2F123"),
    "gid://shopify/Product/123",
  );
});

test("leaves an already-decoded Shopify GraphQL product ID unchanged", () => {
  assert.equal(
    decodeShopifyProductRouteId("gid://shopify/Product/123"),
    "gid://shopify/Product/123",
  );
});
