import type { PdpStudioJob } from "../../platform/types/pdpStudioPlatform";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import { createPdpStudioToolJob } from "../../platform/services/pdpStudioJobService";

interface PhotoEditorSourceInput {
  sourceFile: File | null;
  sourceAssetId?: string | null;
}

interface RetouchJobInput extends PhotoEditorSourceInput {
  maskFile?: File;
  prompt?: string;
}

export async function createBackgroundRemovalJob(
  input: PhotoEditorSourceInput,
): Promise<PdpStudioJob> {
  const sourceAssetId = await resolveSourceAssetId(input);
  return createPdpStudioToolJob("background-remover", {
    inputAssetIds: [sourceAssetId],
    referenceAssetIds: [],
    options: {},
    useBrandKit: false,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function createRetouchJob(
  input: RetouchJobInput,
): Promise<PdpStudioJob> {
  const [sourceAssetId, maskAsset] = await Promise.all([
    resolveSourceAssetId(input),
    input.maskFile
      ? uploadPdpStudioAsset(input.maskFile)
      : Promise.resolve(null),
  ]);
  const prompt = input.prompt?.trim();

  return createPdpStudioToolJob("retouch", {
    inputAssetIds: [sourceAssetId],
    referenceAssetIds: maskAsset ? [maskAsset.id] : [],
    ...(prompt ? { prompt } : {}),
    options: {
      imageSize: "1K",
      aspectRatio: "1:1",
      maskMode: maskAsset ? "brush" : "full-image",
    },
    useBrandKit: false,
    idempotencyKey: crypto.randomUUID(),
  });
}

async function resolveSourceAssetId(
  input: PhotoEditorSourceInput,
): Promise<string> {
  if (input.sourceAssetId) return input.sourceAssetId;
  if (!input.sourceFile) {
    throw new Error("Upload a source image before processing.");
  }
  return (await uploadPdpStudioAsset(input.sourceFile)).id;
}
