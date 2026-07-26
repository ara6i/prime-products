import type {
  PdpStudioAsset,
  PdpStudioShopifyConnection,
  PdpStudioShopifyProduct,
} from "../types/pdpStudioPlatform";
import { pdpStudioApiRequest } from "./pdpStudioApiClient";

export async function getPdpStudioShopifyConnection(): Promise<PdpStudioShopifyConnection> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    connection: PdpStudioShopifyConnection;
  }>("/shopify/connection");
  return response.connection;
}

export async function createPdpStudioShopifyLink(
  shopDomain: string,
): Promise<{ shopDomain: string; linkUrl: string | null; expiresAt: string }> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    link: { shopDomain: string; linkUrl: string | null; expiresAt: string };
  }>("/shopify/link", {
    method: "POST",
    body: JSON.stringify({ shopDomain }),
  });
  return response.link;
}

export async function listPdpStudioShopifyProducts(): Promise<
  PdpStudioShopifyProduct[]
> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    products: PdpStudioShopifyProduct[];
  }>("/shopify/products?limit=50");
  return response.products;
}

export async function importPdpStudioShopifyProduct(
  productId: string,
): Promise<PdpStudioAsset[]> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    assets: PdpStudioAsset[];
  }>(`/shopify/products/${encodeURIComponent(productId)}/import`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return response.assets;
}

export async function publishPdpStudioAsset(input: {
  productId: string;
  assetId: string;
  altText?: string;
}): Promise<{ id: string; title: string } | null> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    product: { id: string; title: string } | null;
  }>("/shopify/publish", { method: "POST", body: JSON.stringify(input) });
  return response.product;
}
