"use client";

import type { PdpStudioToolDefinition } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";

interface ToolOptionGroupsProps {
  options: NonNullable<PdpStudioToolDefinition["options"]>;
  selectedOptions: Record<string, string>;
  onSelect: (group: string, optionId: string) => void;
}

export function ToolOptionGroups({
  options,
  selectedOptions,
  onSelect,
}: ToolOptionGroupsProps) {
  return (
    <div className="grid min-w-0 gap-[var(--space-pdp-md)]">
      {options.map((group) => (
        <fieldset key={group.label} className="min-w-0">
          <legend className="text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-ink-soft)]">
            {group.label}
          </legend>
          <div className="mt-[var(--space-pdp-xs)] flex min-w-0 flex-wrap gap-[var(--space-pdp-xs)]">
            {group.values.map((option) => (
              <PdpStudioButton
                key={option.id}
                type="button"
                variant="ghost"
                data-active={selectedOptions[group.label] === option.id}
                aria-pressed={selectedOptions[group.label] === option.id}
                onClick={() => onSelect(group.label, option.id)}
                className="min-h-[2.25rem] max-w-full whitespace-normal break-words border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-[var(--space-pdp-sm)] text-center text-[var(--text-pdp-xs)] leading-tight text-[var(--color-pdp-ink-soft)] data-[active=true]:border-[var(--color-pdp-accent)] data-[active=true]:bg-[var(--color-pdp-accent-soft)] data-[active=true]:text-[var(--color-pdp-accent)]"
              >
                {option.swatch ? (
                  <span className="size-[1rem] rounded-[var(--radius-pdp-pill)] border border-[var(--color-pdp-rule)]" style={{ backgroundColor: option.swatch }} />
                ) : null}
                {option.label}
              </PdpStudioButton>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
