"use client";

import { Cpu } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import { TRY_ON_MODELS, type TryOnModelEntry, type TryOnModelId } from "../lib/models";

export interface ModelSelectorProps {
  value: TryOnModelId;
  onChange: (next: TryOnModelId) => void;
  disabled: boolean;
  entry: TryOnModelEntry;
}

export function ModelSelector({ value, onChange, disabled, entry }: ModelSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-brand-blue-pale p-2 text-brand-blue">
          <Cpu className="size-4" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary">Model</h3>
      </div>

      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as TryOnModelId)}
          className={cn(
            "w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-text-hint",
          )}
        >
          {TRY_ON_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              [{m.family === "vertex" ? "Vertex" : "Gemini"}] {m.label} — {m.status}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-hint"
        >
          <path fill="currentColor" d="M5.25 7.75 10 12.5l4.75-4.75H5.25Z" />
        </svg>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-text-secondary">
        <span>{entry.description}</span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
            entry.family === "vertex"
              ? "bg-purple-100 text-purple-700"
              : "bg-brand-blue-pale text-brand-blue-dark",
          )}
        >
          {entry.family.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
