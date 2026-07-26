import type {
  PdpStudioAsset,
  PdpStudioJob,
} from "../types/pdpStudioPlatform";

export function mapPdpStudioAsset(value: PdpStudioAsset): PdpStudioAsset {
  return {
    ...value,
    originalName: value.originalName || "PDP Studio asset",
  };
}

export function mapPdpStudioJob(value: PdpStudioJob): PdpStudioJob {
  return {
    ...value,
    progress: {
      stage: value.progress?.stage || statusLabel(value.status),
      percent: Math.min(100, Math.max(0, value.progress?.percent ?? 0)),
    },
    outputs: (value.outputs ?? []).map(mapPdpStudioAsset),
  };
}

function statusLabel(status: PdpStudioJob["status"]): string {
  if (status === "succeeded") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  if (status === "running") return "Processing";
  return "Queued";
}
