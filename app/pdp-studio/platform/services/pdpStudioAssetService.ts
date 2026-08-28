import type { PdpStudioAsset } from "../types/pdpStudioPlatform";
import { pdpStudioApiRequest } from "./pdpStudioApiClient";

interface UploadSignatureResponse {
  ok: true;
  upload: ({
    provider: "s3";
    method: "PUT";
    publicId: string;
    resourceType: "image" | "video";
    uploadUrl: string;
    headers: Record<string, string>;
  } | {
    provider: "cloudinary";
    method: "POST";
    apiKey: string;
    timestamp: number;
    signature: string;
    publicId: string;
    resourceType: "image" | "video";
    type: "authenticated";
    uploadUrl: string;
  });
}

interface CloudinaryUploadResponse {
  public_id?: string;
  error?: { message?: string };
}

export interface ListPdpStudioAssetsInput {
  source?: PdpStudioAsset["source"];
  resourceType?: PdpStudioAsset["resourceType"];
  limit?: number;
  before?: string;
  query?: string;
}

export interface PdpStudioAssetPage {
  assets: PdpStudioAsset[];
  nextBefore: string | null;
  hasMore: boolean;
}

export function listPdpStudioAssets(
  source: PdpStudioAsset["source"],
): Promise<PdpStudioAsset[]>;
export function listPdpStudioAssets(
  input?: ListPdpStudioAssetsInput,
): Promise<PdpStudioAssetPage>;
export async function listPdpStudioAssets(
  input: ListPdpStudioAssetsInput | PdpStudioAsset["source"] = {},
): Promise<PdpStudioAssetPage | PdpStudioAsset[]> {
  const normalizedInput = typeof input === "string" ? { source: input } : input;
  const search = new URLSearchParams();
  if (normalizedInput.source) search.set("source", normalizedInput.source);
  if (normalizedInput.resourceType) search.set("resourceType", normalizedInput.resourceType);
  if (normalizedInput.limit) search.set("limit", String(normalizedInput.limit));
  if (normalizedInput.before) search.set("before", normalizedInput.before);
  if (normalizedInput.query?.trim()) search.set("query", normalizedInput.query.trim());
  const suffix = search.size ? `?${search.toString()}` : "";
  const result = await pdpStudioApiRequest<{
    ok: true;
    assets: PdpStudioAsset[];
    pagination?: {
      nextBefore?: string | null;
      hasMore?: boolean;
    };
  }>(`/assets${suffix}`);
  if (typeof input === "string") return result.assets;
  return {
    assets: result.assets,
    nextBefore: result.pagination?.nextBefore ?? null,
    hasMore: result.pagination?.hasMore ?? false,
  };
}

export async function uploadPdpStudioAsset(
  file: File,
  source: PdpStudioAsset["source"] = "upload",
): Promise<PdpStudioAsset> {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const signature = await pdpStudioApiRequest<UploadSignatureResponse>(
    "/assets/upload-signature",
    {
      method: "POST",
      body: JSON.stringify({ resourceType, contentType: file.type, originalName: file.name, bytes: file.size }),
    },
  );
  let uploadedPublicId = signature.upload.publicId;
  if (signature.upload.provider === "s3") {
    const uploadResponse = await fetch(signature.upload.uploadUrl, {
      method: signature.upload.method,
      headers: signature.upload.headers,
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error(`Private asset upload failed (${uploadResponse.status}).`);
    }
  } else {
    const form = new FormData();
    form.set("file", file);
    form.set("api_key", signature.upload.apiKey);
    form.set("timestamp", String(signature.upload.timestamp));
    form.set("signature", signature.upload.signature);
    form.set("public_id", signature.upload.publicId);
    form.set("type", signature.upload.type);
    const uploadResponse = await fetch(signature.upload.uploadUrl, {
      method: signature.upload.method,
      body: form,
    });
    const uploaded = (await uploadResponse
      .json()
      .catch(() => ({}))) as CloudinaryUploadResponse;
    if (!uploadResponse.ok || !uploaded.public_id) {
      throw new Error(
        uploaded.error?.message ||
          `Private asset upload failed (${uploadResponse.status}).`,
      );
    }
    uploadedPublicId = uploaded.public_id;
  }

  const finalized = await pdpStudioApiRequest<{
    ok: true;
    asset: PdpStudioAsset;
  }>("/assets/finalize", {
    method: "POST",
    body: JSON.stringify({
      publicId: uploadedPublicId,
      resourceType,
      originalName: file.name,
      source,
    }),
  });
  return finalized.asset;
}

export async function getPdpStudioAsset(assetId: string): Promise<PdpStudioAsset> {
	const response = await pdpStudioApiRequest<{
		ok: true;
		asset: PdpStudioAsset;
	}>(`/assets/${encodeURIComponent(assetId)}`);
	return response.asset;
}

export async function deletePdpStudioAsset(assetId: string): Promise<void> {
  await fetch(`/api/pdp-studio/platform/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  }).then((response) => {
    if (!response.ok) throw new Error("Unable to delete this PDP Studio asset.");
  });
}
