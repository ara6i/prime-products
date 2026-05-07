/**
 * Allowlist of models the test page can target. Mirrors the backend zod
 * enum at `developer/public-vto.validation.ts` — keep them in sync.
 *
 * Two families:
 *  - Gemini (`@google/genai` generateContent) → take a prompt + 2 images.
 *  - Vertex (`virtual-try-on-*`) → purpose-built try-on, no prompt needed.
 */
export type TryOnModelId =
  | "gemini-3-pro-image-preview"
  | "gemini-3.1-flash-image-preview"
  | "gemini-2.5-flash-image"
  | "virtual-try-on-001"
  | "virtual-try-on-preview-08-04";

export type ModelFamily = "gemini" | "vertex";

export interface TryOnModelEntry {
  id: TryOnModelId;
  family: ModelFamily;
  label: string;
  status: "GA" | "Preview";
  description: string;
  /** Whether the prompt textarea is sent to this model. Vertex try-on ignores it. */
  acceptsPrompt: boolean;
}

export const TRY_ON_MODELS: readonly TryOnModelEntry[] = [
  {
    id: "gemini-3-pro-image-preview",
    family: "gemini",
    label: "Nano Banana Pro (Gemini 3 Pro Image)",
    status: "Preview",
    description: "Highest quality, slowest, premium pricing. Production default.",
    acceptsPrompt: true,
  },
  {
    id: "gemini-3.1-flash-image-preview",
    family: "gemini",
    label: "Nano Banana 2 (Gemini 3.1 Flash Image)",
    status: "Preview",
    description: "Mid-tier. Faster than 3-pro, better reasoning than 2.5.",
    acceptsPrompt: true,
  },
  {
    id: "gemini-2.5-flash-image",
    family: "gemini",
    label: "Nano Banana (Gemini 2.5 Flash Image)",
    status: "GA",
    description: "Fastest + cheapest Gemini image model. Fixed 1290 tokens.",
    acceptsPrompt: true,
  },
  {
    id: "virtual-try-on-001",
    family: "vertex",
    label: "Vertex Virtual Try-On (v1)",
    status: "GA",
    description: "Vertex AI purpose-built try-on. Person + product images only — no prompt.",
    acceptsPrompt: false,
  },
  {
    id: "virtual-try-on-preview-08-04",
    family: "vertex",
    label: "Vertex Virtual Try-On (preview 08-04)",
    status: "Preview",
    description: "Older preview snapshot of the Vertex try-on model. No prompt.",
    acceptsPrompt: false,
  },
] as const;

export const DEFAULT_TRY_ON_MODEL: TryOnModelId = "gemini-3-pro-image-preview";

export function getModelEntry(id: TryOnModelId): TryOnModelEntry {
  const entry = TRY_ON_MODELS.find((m) => m.id === id);
  if (!entry) throw new Error(`Unknown try-on model: ${id}`);
  return entry;
}
