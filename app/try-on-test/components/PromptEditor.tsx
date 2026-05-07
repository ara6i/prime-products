"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import { Button } from "@/app/shared/components/ui/button";
import { DEFAULT_APPAREL_PROMPT } from "../lib/defaultPrompts";

export interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  useDefault: boolean;
  onToggleUseDefault: (useDefault: boolean) => void;
  disabled: boolean;
  /** When false (e.g. Vertex try-on selected), the editor is locked and a
   *  banner explains that the chosen model ignores the prompt. */
  acceptsPrompt: boolean;
}

export function PromptEditor({ value, onChange, useDefault, onToggleUseDefault, disabled, acceptsPrompt }: PromptEditorProps) {
  const lockedByModel = !acceptsPrompt;
  const isDisabled = disabled || lockedByModel;
  const charCount = value.length;
  const isCustomEmpty = !useDefault && value.trim().length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-brand-blue-pale p-2 text-brand-blue">
            <Sparkles className="size-4" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">Prompt sent to Gemini</h3>
        </div>

        <div className="flex items-center gap-3">
          <label
            className={cn(
              "inline-flex items-center gap-2 text-xs text-text-secondary select-none",
              isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
          >
            <input
              type="checkbox"
              checked={useDefault}
              onChange={(e) => onToggleUseDefault(e.target.checked)}
              disabled={isDisabled}
              className="size-4 accent-brand-blue cursor-pointer disabled:cursor-not-allowed"
            />
            Use default backend prompt
          </label>
          {!useDefault && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(DEFAULT_APPAREL_PROMPT)}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              <RotateCcw className="size-3" /> Reset to default
            </Button>
          )}
        </div>
      </div>

      {lockedByModel && (
        <div className="rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-700">
          The selected Vertex try-on model is purpose-built and accepts only the person + product images — the prompt
          below is ignored.
        </div>
      )}

      <textarea
        value={useDefault || lockedByModel ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled || useDefault}
        placeholder={
          lockedByModel
            ? "Vertex try-on uses no prompt."
            : useDefault
              ? "Backend will use the production apparel prompt verbatim."
              : "Type your custom prompt — sent to Gemini exactly as written."
        }
        spellCheck={false}
        rows={12}
        className={cn(
          "w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm font-mono leading-relaxed",
          "border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent",
          "disabled:bg-gray-50 disabled:text-text-hint disabled:cursor-not-allowed",
          isCustomEmpty && !lockedByModel && "ring-1 ring-warning-dot/50",
        )}
      />

      <div className="flex items-center justify-between text-xs text-text-hint">
        <span>
          {lockedByModel
            ? "Prompt disabled for this model"
            : useDefault
              ? `Will use the default ${DEFAULT_APPAREL_PROMPT.length}-char production apparel prompt`
              : `${charCount} chars`}
        </span>
        {isCustomEmpty && !lockedByModel && (
          <span className="text-warning-text">Custom prompt is empty — backend will reject it.</span>
        )}
      </div>
    </div>
  );
}
