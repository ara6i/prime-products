import type { PdpStudioAsset } from "../types/pdpStudioPlatform";
import { pdpStudioApiRequest } from "./pdpStudioApiClient";

interface UploadSignatureResponse {
  ok: true;
  upload: {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    publicId: string;
    resourceType: "image" | "video";
    type: "authenticated";
    uploadUrl: string;
  };
}

interface CloudinaryUploadResponse {
  public_id?: string;
  error?: { message?: string };
}

export async function uploadPdpStudioAsset(
  file: File,
  source: "upload" | "profile" | "brand-kit" = "upload",
): Promise<PdpStudioAsset> {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const signature = await pdpStudioApiRequest<UploadSignatureResponse>(
    "/assets/upload-signature",
    {
      method: "POST",
      body: JSON.stringify({ resourceType }),
    },
  );
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", signature.upload.apiKey);
  form.set("timestamp", String(signature.upload.timestamp));
  form.set("signature", signature.upload.signature);
  form.set("public_id", signature.upload.publicId);
  form.set("type", signature.upload.type);
  const uploadResponse = await fetch(signature.upload.uploadUrl, {
    method: "POST",
    body: form,
  });
  const uploaded = (await uploadResponse.json().catch(() => ({}))) as CloudinaryUploadResponse;
  if (!uploadResponse.ok || !uploaded.public_id) {
    throw new Error(
      uploaded.error?.message ||
        `Private asset upload failed (${uploadResponse.status}).`,
    );
  }
  const finalized = await pdpStudioApiRequest<{ ok: true; asset: PdpStudioAsset }>(
    "/assets/finalize",
    {
      method: "POST",
      body: JSON.stringify({
        publicId: uploaded.public_id,
        resourceType,
        originalName: file.name,
        source,
      }),
    },
  );
  return finalized.asset;
}

export async function listPdpStudioAssets(
  source?: PdpStudioAsset["source"],
): Promise<PdpStudioAsset[]> {
  const query = source ? `?source=${encodeURIComponent(source)}` : "";
  const response = await pdpStudioApiRequest<{
    ok: true;
    assets: PdpStudioAsset[];
  }>(`/assets${query}`);
  return response.assets;
}

export async function deletePdpStudioAsset(assetId: string): Promise<void> {
  await fetch(`/api/pdp-studio/platform/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  }).then((response) => {
    if (!response.ok) throw new Error("Unable to delete this PDP Studio asset.");
  });
}
