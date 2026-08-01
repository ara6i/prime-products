import { pdpStudioApiRequest } from "../../platform/services/pdpStudioApiClient";
import { mapShopifyConnection, mapShopifyProductsPage } from "../mappers/shopifyProductsMapper";
import type {
  ShopifyConnection,
  ShopifyProductsPage,
} from "../types/shopifyProducts";

interface RawShopifyConnectionResponse {
  ok: true;
  connection: unknown;
}

interface RawShopifyProductsResponse {
  ok: true;
  products: unknown[];
  pageInfo: {
    hasNextPage?: boolean;
    endCursor?: string | null;
  };
}

export async function getShopifyConnection(): Promise<ShopifyConnection> {
  const response =
    await pdpStudioApiRequest<RawShopifyConnectionResponse>(
      "/shopify/connection",
    );
  return mapShopifyConnection(response.connection);
}

export async function createShopifyConnectionLink(
  shopDomain: string,
): Promise<string> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    link: { linkUrl?: string | null };
  }>("/shopify/link", {
    method: "POST",
    body: JSON.stringify({ shopDomain }),
  });
  if (!response.link.linkUrl) {
    throw new Error("The Shopify app URL is not configured.");
  }
  return response.link.linkUrl;
}

export async function disconnectShopifyConnection(): Promise<void> {
  await pdpStudioApiRequest<unknown>("/shopify/connection", {
    method: "DELETE",
  });
}

export async function listShopifyProducts(input: {
  limit?: number;
  after?: string;
  query?: string;
  currency?: string | null;
}): Promise<ShopifyProductsPage> {
  const search = new URLSearchParams();
  search.set("limit", String(input.limit ?? 30));
  if (input.after) search.set("after", input.after);
  if (input.query) search.set("query", input.query);
  const response = await pdpStudioApiRequest<RawShopifyProductsResponse>(
    `/shopify/products?${search.toString()}`,
  );
  return mapShopifyProductsPage(response, input.currency);
}

export async function importShopifyProductImages(
  productId: string,
): Promise<number> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    assets: unknown[];
  }>(`/shopify/products/${encodeURIComponent(productId)}/import`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return response.assets.length;
}
