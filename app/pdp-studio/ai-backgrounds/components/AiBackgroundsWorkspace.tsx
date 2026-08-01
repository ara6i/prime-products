"use client";

import { useAiBackgroundsWorkspace } from "../hooks/useAiBackgroundsWorkspace";
import { AiBackgroundAssetPicker } from "./AiBackgroundAssetPicker";
import { AiBackgroundEditor } from "./AiBackgroundEditor";

export function AiBackgroundsWorkspace() {
  const ui = useAiBackgroundsWorkspace();

  return (
    <>
      {ui.restoringJob ? (
        <div className="grid h-screen place-items-center bg-[#eef3fb]">
          <div className="text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-[var(--color-pdp-rule-strong)] border-t-[var(--color-pdp-accent)]" />
            <p className="mt-3 text-[0.8125rem] text-[var(--color-pdp-muted)]">
              Restoring your editor…
            </p>
          </div>
        </div>
      ) : ui.editorOpen ? (
        <AiBackgroundEditor ui={ui} />
      ) : (
        <div className="grid h-screen place-items-center bg-[#eef3fb]">
          <div className="text-center">
            <h1 className="text-[1.25rem] font-semibold text-[var(--color-pdp-ink)]">
              Create product-ready backgrounds
            </h1>
            <p className="mt-2 text-[0.8125rem] text-[var(--color-pdp-muted)]">
              Choose a product image to enter the AI Backgrounds editor.
            </p>
          </div>
        </div>
      )}
      <AiBackgroundAssetPicker ui={ui} />
    </>
  );
}
