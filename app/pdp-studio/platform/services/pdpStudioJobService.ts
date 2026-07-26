import { mapPdpStudioJob } from "../mappers/pdpStudioPlatformMapper";
import type {
  CreatePdpStudioJobInput,
  PdpStudioJob,
} from "../types/pdpStudioPlatform";
import {
  pdpStudioApiRequest,
  pdpStudioPlatformUrl,
} from "./pdpStudioApiClient";
import type { PdpStudioToolId } from "../../workspace/types";

type ActionableToolId = Exclude<PdpStudioToolId, "ai-images">;

export async function createPdpStudioToolJob(
  toolId: ActionableToolId,
  input: CreatePdpStudioJobInput,
): Promise<PdpStudioJob> {
  const response = await pdpStudioApiRequest<{ ok: true; job: PdpStudioJob }>(
    `/tools/${encodeURIComponent(toolId)}/jobs`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return mapPdpStudioJob(response.job);
}

export async function getPdpStudioJob(jobId: string): Promise<PdpStudioJob> {
  const response = await pdpStudioApiRequest<{ ok: true; job: PdpStudioJob }>(
    `/jobs/${encodeURIComponent(jobId)}`,
  );
  return mapPdpStudioJob(response.job);
}

export async function listPdpStudioJobs(limit = 20): Promise<PdpStudioJob[]> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    jobs: PdpStudioJob[];
  }>(`/jobs?limit=${encodeURIComponent(String(limit))}`);
  return response.jobs.map(mapPdpStudioJob);
}

export async function cancelPdpStudioJob(jobId: string): Promise<PdpStudioJob> {
  const response = await pdpStudioApiRequest<{ ok: true; job: PdpStudioJob }>(
    `/jobs/${encodeURIComponent(jobId)}/cancel`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return mapPdpStudioJob(response.job);
}

export async function retryPdpStudioJob(jobId: string): Promise<PdpStudioJob> {
  const response = await pdpStudioApiRequest<{ ok: true; job: PdpStudioJob }>(
    `/jobs/${encodeURIComponent(jobId)}/retry`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return mapPdpStudioJob(response.job);
}

export function subscribePdpStudioJob(
  jobId: string,
  onJob: (job: PdpStudioJob) => void,
  onUnavailable: () => void,
): () => void {
  const source = new EventSource(
    pdpStudioPlatformUrl(`/jobs/${encodeURIComponent(jobId)}/events`),
  );
  source.addEventListener("job", (event) => {
    const data = JSON.parse((event as MessageEvent<string>).data) as PdpStudioJob;
    onJob(mapPdpStudioJob(data));
  });
  source.onerror = () => {
    source.close();
    onUnavailable();
  };
  return () => source.close();
}
