"use client";

import { useRef } from "react";
import type { OutfitSuggestion } from "@/app/ai-stylist/types";
import { OutfitCard } from "./OutfitCard";
import { Button } from "@/app/shared/components/ui";
import { ArrowLeftIcon, ArrowRightIcon } from "@/app/shared/components/icons";

interface OutfitCarouselProps {
  title: string;
  outfits: OutfitSuggestion[];
  onEditOutfit?: (outfit: OutfitSuggestion) => void;
  onToggleBookmark?: (outfitId: string) => void;
}

export function OutfitCarousel({
  title,
  outfits,
  onEditOutfit,
  onToggleBookmark,
}: OutfitCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    // Scroll by ~25% of the container width (one card)
    const scrollAmount = scrollRef.current.clientWidth * 0.26;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-[0.625vw] self-stretch pt-[0.833vw]">
      {/* Title */}
      <p className="text-[0.833vw] font-normal leading-[1.354vw] text-text-subtitle">{title}</p>

      {/* Carousel — 4 visible, 5th peeks */}
      <div className="relative min-w-0 self-stretch">
        <div
          ref={scrollRef}
          className="flex gap-[2%] overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {outfits.map((outfit) => (
            <div key={outfit.id} className="w-[23.5%] shrink-0">
              <OutfitCard
                outfit={outfit}
                onEditOutfit={onEditOutfit}
                onToggleBookmark={onToggleBookmark}
              />
            </div>
          ))}
        </div>

        {/* Floating right arrow — on the right edge */}
        {outfits.length > 4 && (
          <Button
            variant="icon"
            size="icon-sm"
            className="absolute top-1/2 right-0 -translate-y-1/2 bg-arrow-button shadow-md hover:bg-arrow-button/90"
            onClick={() => scroll("right")}
          >
            <ArrowRightIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" />
          </Button>
        )}
      </div>

      {/* Bottom navigation arrows */}
      <div className="flex items-center justify-between self-stretch">
        <Button
          variant="icon"
          size="icon-sm"
          className="bg-surface-disabled hover:bg-surface-disabled/80"
          onClick={() => scroll("left")}
        >
          <ArrowLeftIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" />
        </Button>
        <Button
          variant="icon"
          size="icon-sm"
          className="bg-arrow-button hover:bg-arrow-button/90"
          onClick={() => scroll("right")}
        >
          <ArrowRightIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" />
        </Button>
      </div>
    </div>
  );
}
