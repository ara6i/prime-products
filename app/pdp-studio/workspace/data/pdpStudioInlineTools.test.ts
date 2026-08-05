import { describe, expect, it } from "vitest";
import { PDP_STUDIO_AUDIT_CATALOG } from "./pdpStudioAuditData";
import { PDP_STUDIO_HOME_TOOL_DIALOGS } from "./pdpStudioHomeDialogData";
import { isPdpStudioHomeAiToolId } from "./pdpStudioInlineTools";

describe("PDP Studio inline tools", () => {
  it("registers every visible AI tool for the shared modal", () => {
    const toolIds = PDP_STUDIO_AUDIT_CATALOG.tools.map((tool) => tool.id);

    expect(toolIds.every(isPdpStudioHomeAiToolId)).toBe(true);
    expect(Object.keys(PDP_STUDIO_HOME_TOOL_DIALOGS).sort()).toEqual(
      [...toolIds].sort(),
    );
  });
});
