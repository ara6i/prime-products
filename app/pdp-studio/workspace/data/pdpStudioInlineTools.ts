import type { PdpStudioToolId } from "../types";
import type { PdpStudioHomeAiToolId } from "../types/homeToolDialog";

export function isPdpStudioHomeAiToolId(
  toolId: PdpStudioToolId,
): toolId is PdpStudioHomeAiToolId {
  return (
    toolId !== "ai-fashion-models" &&
    toolId !== "background-remover" &&
    toolId !== "ai-backgrounds" &&
    toolId !== "ai-images"
  );
}

export function isPdpStudioInlineToolId(toolId: PdpStudioToolId): boolean {
  return ![
    "ai-fashion-models",
    "ai-backgrounds",
    "background-remover",
    "retouch",
  ].includes(toolId);
}
