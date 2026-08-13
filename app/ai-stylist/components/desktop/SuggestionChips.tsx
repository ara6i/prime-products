"use client";

import type { SuggestionChip } from "@/app/ai-stylist/types";

interface SuggestionChipsProps {
  chips: SuggestionChip[];
  onChipClick: (label: string) => void;
}

export function SuggestionChips({ chips, onChipClick }: SuggestionChipsProps) {
  return (
    <div className="flex items-center gap-[0.625vw]">
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onChipClick(chip.label)}
          className="flex h-[1.25vw] items-center justify-center rounded-[0.573vw] bg-suggestion-chip-bg px-[0.208vw] py-[0.104vw] text-[0.729vw] font-normal leading-[1.146vw] text-suggestion-chip-text transition-opacity hover:opacity-80"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
