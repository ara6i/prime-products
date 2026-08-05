import { pdpStudioApiRequest } from "../../platform/services/pdpStudioApiClient";
import { mapShopifyConnection, mapShopifyProduct, mapShopifyProductsPage } from "../mappers/shopifyProductsMapper";
import type { PdpStudioAsset } from "../../platform/types/pdpStudioPlatform";
import type {
	ShopifyConnection,
	ShopifyProductDetail,
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

export async function getShopifyProduct(
	productId: string,
	currency?: string | null,
): Promise<ShopifyProductDetail> {
	const response = await pdpStudioApiRequest<{ ok: true; product: unknown }>(
		`/shopify/products/${encodeURIComponent(productId)}`,
	);
	return mapShopifyProduct(response.product, currency);
}

export async function importShopifyProductMedia(
	productId: string,
	mediaIds?: string[],
): Promise<PdpStudioAsset[]> {
	const response = await pdpStudioApiRequest<{
		ok: true;
		assets: PdpStudioAsset[];
	}>(`/shopify/products/${encodeURIComponent(productId)}/import`, {
		method: "POST",
		body: JSON.stringify(mediaIds?.length ? { mediaIds } : {}),
	});
	return response.assets;
}

export async function importShopifyProductImages(
	productId: string,
): Promise<number> {
	return (await importShopifyProductMedia(productId)).length;
}
