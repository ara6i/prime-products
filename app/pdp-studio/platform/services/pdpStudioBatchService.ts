import type { PdpStudioBatch } from "../types/pdpStudioPlatform";
import { pdpStudioApiRequest, pdpStudioPlatformUrl } from "./pdpStudioApiClient";

export async function createPdpStudioBatch(input: {
  name: string;
  toolId: string;
  inputAssetIds: string[];
  prompt?: string;
  options: Record<string, unknown>;
  useBrandKit: boolean;
}): Promise<PdpStudioBatch> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    batch: PdpStudioBatch;
  }>("/batch", { method: "POST", body: JSON.stringify(input) });
  return response.batch;
}

export async function getPdpStudioBatch(
  batchId: string,
): Promise<PdpStudioBatch> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    batch: PdpStudioBatch;
  }>(`/batch/${encodeURIComponent(batchId)}`);
  return response.batch;
}
export async function listPdpStudioBatches(): Promise<PdpStudioBatch[]> {
  const response = await pdpStudioApiRequest<{ ok: true; batches: PdpStudioBatch[] }>("/batch");
  return response.batches;
}

export async function cancelPdpStudioBatch(
  batchId: string,
): Promise<PdpStudioBatch> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    batch: PdpStudioBatch;
  }>(`/batch/${encodeURIComponent(batchId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return response.batch;
}

export async function retryFailedPdpStudioBatch(
  batchId: string,
): Promise<PdpStudioBatch> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    batch: PdpStudioBatch;
  }>(`/batch/${encodeURIComponent(batchId)}/retry-failed`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return response.batch;
}

export function pdpStudioBatchDownloadUrl(batchId: string): string {
  return pdpStudioPlatformUrl(
    `/batch/${encodeURIComponent(batchId)}/download`,
  );
}
