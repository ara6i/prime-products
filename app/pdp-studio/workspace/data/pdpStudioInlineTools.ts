import type { PdpStudioToolId } from "../types";
import type { PdpStudioHomeAiToolId } from "../types/homeToolDialog";

export function isPdpStudioHomeAiToolId(
  toolId: PdpStudioToolId,
): toolId is PdpStudioHomeAiToolId {
  return Boolean(toolId);
}

export function isPdpStudioInlineToolId(toolId: PdpStudioToolId): boolean {
  return ![
    "ai-fashion-models",
    "ai-backgrounds",
    "background-remover",
    "retouch",
  ].includes(toolId);
}
