"use client";

import { CalendarIcon } from "@/app/shared/components/icons";
import { OutfitCard, Button } from "@/app/shared/components/ui";
import type { SavedOutfit } from "@/app/try-on/types";

interface SavedOutfitCardProps {
  outfit: SavedOutfit;
  onView: (outfit: SavedOutfit) => void;
}

export function SavedOutfitCard({ outfit, onView }: SavedOutfitCardProps) {
  return (
    <OutfitCard
      variant="saved"
      imageUrl={outfit.imageUrl}
      imageAlt={`Saved outfit from ${outfit.date}`}
    >
      <div className="flex flex-col gap-[0.313vw] self-stretch">
        <div className="flex flex-col gap-[0.208vw] self-stretch">
          <div className="flex items-center gap-[0.208vw] self-stretch">
            <CalendarIcon size={14} color="var(--product-card-border)" className="!w-[0.729vw] !h-[0.729vw]" />
            <span className="flex-1 text-[0.625vw] leading-[1.667] text-text-primary">
              {outfit.date}
            </span>
          </div>
          <div className="flex gap-[0.208vw]">
            {outfit.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-[0.625vw] bg-brand-blue-light px-[0.208vw] py-[0.104vw] text-[0.625vw] leading-[1.667] text-brand-blue"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end self-stretch">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => onView(outfit)}
          >
            View ({outfit.pieceCount})
          </Button>
        </div>
      </div>
    </OutfitCard>
  );
}
