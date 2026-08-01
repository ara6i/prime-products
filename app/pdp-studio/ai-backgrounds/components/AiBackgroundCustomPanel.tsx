"use client";

import Image from "next/image";
import {
  AI_BACKGROUND_ENVIRONMENT_SUGGESTIONS,
  AI_BACKGROUND_SURFACE_SUGGESTIONS,
} from "../data/aiBackgroundPresets";
import type { AiBackgroundsWorkspaceController } from "../hooks/useAiBackgroundsWorkspace";
import type { AiBackgroundCustomTab } from "../types/aiBackgrounds";
import { PdpStudioButton } from "../../workspace/components/shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../../workspace/components/shared/PdpStudioUiIcon";

const TABS: readonly { id: AiBackgroundCustomTab; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "assisted", label: "Assisted" },
  { id: "manual", label: "Manual" },
];

interface AiBackgroundCustomPanelProps {
  ui: AiBackgroundsWorkspaceController;
}

export function AiBackgroundCustomPanel({
  ui,
}: AiBackgroundCustomPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <PdpStudioButton
          type="button"
          variant="ghost"
          aria-label="Back to background presets"
          onClick={() => ui.setCustomOpen(false)}
          className="min-h-8 min-w-8 rounded-full p-0"
        >
          <PdpStudioUiIcon name="arrow" size={16} className="rotate-180" />
        </PdpStudioButton>
        <h2 className="text-[1rem] font-semibold">Custom Background</h2>
      </div>

      <div className="grid grid-cols-3 border-b border-[var(--color-pdp-rule)] px-4">
        {TABS.map((tab) => (
          <PdpStudioButton
            key={tab.id}
            type="button"
            variant="ghost"
            onClick={() => ui.setCustomTab(tab.id)}
            className={[
              "min-h-10 rounded-none border-b-2 px-2 text-[0.75rem] font-medium",
              ui.customTab === tab.id
                ? "border-[var(--color-pdp-accent)] text-[var(--color-pdp-accent)]"
                : "border-transparent text-[var(--color-pdp-muted)]",
            ].join(" ")}
          >
            {tab.label}
          </PdpStudioButton>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {ui.customTab === "image" ? (
          <ImageReferenceMode ui={ui} />
        ) : ui.customTab === "assisted" ? (
          <AssistedMode ui={ui} />
        ) : (
          <ManualMode ui={ui} />
        )}
      </div>

      <div className="border-t border-[var(--color-pdp-rule)] p-4">
        <PdpStudioButton
          type="button"
          disabled={!ui.canGenerateCustom() || ui.busy}
          onClick={() => void ui.generateCustom()}
          className="w-full gap-2"
        >
          <PdpStudioUiIcon name="sparkles" size={16} />
          {ui.busy ? "Generating…" : "Generate images"}
        </PdpStudioButton>
      </div>
    </div>
  );
}

function ImageReferenceMode({
  ui,
}: {
  ui: AiBackgroundsWorkspaceController;
}) {
  return (
    <div>
      <p className="text-[0.75rem] leading-5 text-[var(--color-pdp-muted)]">
        Use one of your images as visual inspiration for the new background.
      </p>
      <label className="mt-4 grid gap-2">
        <span className="text-[0.75rem] font-medium">
          Describe what to keep{" "}
          <span className="font-normal text-[var(--color-pdp-muted)]">
            (optional)
          </span>
        </span>
        <textarea
          value={ui.imageDescription}
          onChange={(event) => ui.setImageDescription(event.target.value)}
          placeholder="For example: use the warm window light and stone surface"
          className="min-h-24 resize-none rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-white p-3 text-[0.75rem] outline-none placeholder:text-[var(--color-pdp-muted)] focus:border-[var(--color-pdp-accent)]"
        />
      </label>
      <PdpStudioButton
        type="button"
        variant="outline"
        onClick={() => ui.openAssetPicker("reference")}
        className="mt-4 min-h-24 w-full gap-3 border-dashed"
      >
        {ui.reference ? (
          <>
            <span className="relative size-16 overflow-hidden rounded-[0.5rem] border border-[var(--color-pdp-rule)]">
              <Image
                src={ui.reference.previewUrl}
                alt={ui.reference.name}
                fill
                unoptimized
                className="object-cover"
              />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-[0.75rem] font-medium">
                {ui.reference.name}
              </span>
              <span className="mt-1 block text-[0.6875rem] text-[var(--color-pdp-muted)]">
                Choose another image
              </span>
            </span>
          </>
        ) : (
          <>
            <PdpStudioUiIcon
              name="upload"
              size={18}
              className="text-[var(--color-pdp-accent)]"
            />
            <span className="text-[0.75rem]">Choose an inspiration image</span>
          </>
        )}
      </PdpStudioButton>
    </div>
  );
}

function AssistedMode({
  ui,
}: {
  ui: AiBackgroundsWorkspaceController;
}) {
  return (
    <div className="grid gap-6">
      <SuggestionField
        label="Your subject on"
        placeholder="a surface"
        value={ui.surface}
        suggestions={AI_BACKGROUND_SURFACE_SUGGESTIONS}
        onChange={ui.setSurface}
        required
      />
      <SuggestionField
        label="with"
        placeholder="background details"
        value={ui.environment}
        suggestions={AI_BACKGROUND_ENVIRONMENT_SUGGESTIONS}
        onChange={ui.setEnvironment}
      />
    </div>
  );
}

function SuggestionField({
  label,
  placeholder,
  value,
  suggestions,
  onChange,
  required = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  suggestions: readonly string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[0.75rem] font-medium">
        {label}
        {required ? <span className="text-[var(--color-pdp-accent)]"> *</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-white px-3 text-[0.75rem] outline-none placeholder:text-[var(--color-pdp-muted)] focus:border-[var(--color-pdp-accent)]"
      />
      <span className="mt-1 flex flex-wrap gap-1.5">
        {suggestions.map((suggestion) => (
          <PdpStudioButton
            key={suggestion}
            type="button"
            variant="ghost"
            onClick={() => onChange(suggestion)}
            className={[
              "min-h-7 rounded-full border px-2.5 text-[0.625rem] font-normal",
              value === suggestion
                ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]"
                : "border-[var(--color-pdp-rule)] bg-white text-[var(--color-pdp-muted)]",
            ].join(" ")}
          >
            {suggestion}
          </PdpStudioButton>
        ))}
      </span>
    </label>
  );
}

function ManualMode({
  ui,
}: {
  ui: AiBackgroundsWorkspaceController;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[0.75rem] font-medium">
        Describe your background
      </span>
      <textarea
        value={ui.manualPrompt}
        onChange={(event) => ui.setManualPrompt(event.target.value)}
        placeholder="A quiet limestone gallery with soft morning window light and a low neutral plinth"
        className="min-h-44 resize-none rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-white p-3 text-[0.75rem] leading-5 outline-none placeholder:text-[var(--color-pdp-muted)] focus:border-[var(--color-pdp-accent)]"
      />
    </label>
  );
}
