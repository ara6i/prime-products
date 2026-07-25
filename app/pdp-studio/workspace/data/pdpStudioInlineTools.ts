import type { PdpStudioToolId } from "../types";
import type { PdpStudioHomeAiToolId } from "../types/homeToolDialog";

export function isPdpStudioHomeAiToolId(
  toolId: PdpStudioToolId,
): toolId is PdpStudioHomeAiToolId {
  return toolId !== "ai-fashion-models" && toolId !== "background-remover";
}

export function isPdpStudioInlineToolId(toolId: PdpStudioToolId): boolean {
  return toolId !== "ai-fashion-models";
}
