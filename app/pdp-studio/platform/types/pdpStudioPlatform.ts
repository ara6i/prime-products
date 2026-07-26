import type { PdpStudioToolId } from "../../workspace/types";

export type PdpStudioJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface PdpStudioAsset {
  id: string;
  source: "upload" | "generated" | "shopify" | "profile" | "brand-kit";
  resourceType: "image" | "video";
  url: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  originalName: string | null;
  createdAt: string;
}

export interface PdpStudioJob {
  id: string;
  parentJobId: string | null;
  sequence: number | null;
  toolId: Exclude<PdpStudioToolId, "ai-images">;
  status: PdpStudioJobStatus;
  progress: { stage: string; percent: number };
  inputAssetIds: string[];
  referenceAssetIds: string[];
  outputs: PdpStudioAsset[];
  prompt: string | null;
  options: Record<string, unknown>;
  useBrandKit: boolean;
  provider: string;
  model: string | null;
  idempotencyId: string;
  error: { code: string; message: string; retryable: boolean } | null;
  attemptCount: number;
  cancelRequested: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreatePdpStudioJobInput {
  inputAssetIds: string[];
  referenceAssetIds: string[];
  prompt?: string;
  options: Record<string, unknown>;
  useBrandKit: boolean;
  idempotencyKey?: string;
}

export interface PdpStudioProfile {
  id: string;
  name: string;
  email: string;
  photo: PdpStudioAsset | null;
  workspace: { id: string; name: string };
}

export interface PdpStudioBrandKit {
  workspaceId: string;
  name: string;
  description: string;
  website: string;
  instagram: string;
  writtenDirection: string;
  colors: string[];
  fonts: string[];
  logos: PdpStudioAsset[];
  references: PdpStudioAsset[];
  updatedAt: string | null;
}

export interface PdpStudioBatch {
  id: string;
  name: string;
  toolId: string;
  status:
    | "queued"
    | "running"
    | "succeeded"
    | "partially_failed"
    | "failed"
    | "cancelled";
  progress: { completed: number; total: number; percent: number };
  succeededCount: number;
  failedCount: number;
  cancelledCount: number;
  items: PdpStudioJob[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PdpStudioShopifyConnection {
  connected: boolean;
  shopDomain: string | null;
  storeName: string | null;
  canPublish: boolean;
  publishAccessUrl: string | null;
}

export interface PdpStudioShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  featuredImage: string | null;
  media: Array<{
    id: string;
    type: string;
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  }>;
  variants: Array<{ id: string; title: string; price: string }>;
}
