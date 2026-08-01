import type { PdpStudioToolId } from "../../workspace/types";
import { mapPdpStudioJob } from "../mappers/pdpStudioPlatformMapper";
import type {
  CreatePdpStudioJobInput,
  PdpStudioJob,
} from "../types/pdpStudioPlatform";
import {
  pdpStudioApiRequest,
  pdpStudioPlatformUrl,
} from "./pdpStudioApiClient";

type ActionableToolId = Exclude<PdpStudioToolId, "ai-images">;

export interface ListPdpStudioJobsInput {
  status?: PdpStudioJob["status"];
  toolId?: ActionableToolId;
  limit?: number;
  before?: string;
}

export function listPdpStudioJobs(limit: number): Promise<PdpStudioJob[]>;
export function listPdpStudioJobs(
  input?: ListPdpStudioJobsInput,
): Promise<PdpStudioJob[]>;
export async function listPdpStudioJobs(
  input: ListPdpStudioJobsInput | number = {},
): Promise<PdpStudioJob[]> {
  const normalizedInput = typeof input === "number" ? { limit: input } : input;
  const search = new URLSearchParams();
  if (normalizedInput.status) search.set("status", normalizedInput.status);
  if (normalizedInput.toolId) search.set("toolId", normalizedInput.toolId);
  if (normalizedInput.limit) search.set("limit", String(normalizedInput.limit));
  if (normalizedInput.before) search.set("before", normalizedInput.before);
  const suffix = search.size ? `?${search.toString()}` : "";
  const response = await pdpStudioApiRequest<{
    ok: true;
    jobs: PdpStudioJob[];
  }>(`/jobs${suffix}`);
  return response.jobs.map(mapPdpStudioJob);
}

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

export async function cancelPdpStudioJob(
  jobId: string,
): Promise<PdpStudioJob> {
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
