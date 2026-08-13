import Image from "next/image";
import { toast } from "sonner";
import type { OutfitSuggestion } from "@/app/ai-stylist/types";
import { Button } from "@/app/shared/components/ui";
import {
  BookmarkIcon,
  BookmarkOutlineIcon,
  PeopleIcon,
  ArrowRightIcon,
  ShareIcon,
} from "@/app/shared/components/icons";

interface OutfitCardProps {
  outfit: OutfitSuggestion;
  onEditOutfit?: (outfit: OutfitSuggestion) => void;
  onToggleBookmark?: (outfitId: string) => void;
}

export function OutfitCard({ outfit, onEditOutfit, onToggleBookmark }: OutfitCardProps) {
  const BookmarkVariant = outfit.isBookmarked ? BookmarkIcon : BookmarkOutlineIcon;

  return (
    <div className="flex w-full shrink-0 flex-col gap-[0.417vw] rounded-[0.729vw] bg-outfit-card-bg p-[0.625vw]">
      {/* Image — fixed 4:5 aspect ratio */}
      <div className="relative w-full overflow-hidden rounded-[0.729vw]" style={{ aspectRatio: "4/5" }}>
        {outfit.imageUrl ? (
          <Image
            src={outfit.imageUrl}
            alt={outfit.title}
            fill
            className="object-cover object-top"
            sizes="25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-disabled">
            <span className="text-[0.729vw] text-text-muted">No preview</span>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-x-[0.625vw] bottom-[0.625vw] flex items-end justify-between">
          {/* Left — bookmark + people badge */}
          <div className="flex items-center gap-[0.208vw]">
            <Button
              variant="ghost"
              size="xs"
              className="h-auto rounded-full bg-white/80 p-[0.313vw] backdrop-blur-sm hover:bg-white/90"
              onClick={() => onToggleBookmark?.(outfit.id)}
            >
              <BookmarkVariant size={14} className="!w-[0.729vw] !h-[0.729vw]" color="var(--accent-purple-text)" />
            </Button>
            <div className="flex items-center gap-[0.208vw] rounded-full bg-warning-bg px-[0.313vw] py-[0.104vw]">
              <PeopleIcon size={12} className="!w-[0.625vw] !h-[0.625vw]" color="var(--warning-text)" />
              <span className="text-[0.521vw] font-medium leading-[0.521vw] text-warning-text">20</span>
            </div>
          </div>

          {/* Right — share button */}
          <Button
            variant="ghost"
            size="xs"
            className="h-auto rounded-full bg-brand-blue p-[0.313vw] hover:bg-brand-blue-dark"
          >
            <ShareIcon size={14} className="!w-[0.729vw] !h-[0.729vw]" color="white" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-[0.417vw] self-stretch">
        <p className="truncate text-[0.729vw] font-normal leading-[1.146vw] text-text-primary">
          {outfit.title}
        </p>
        <div className="flex gap-[0.208vw] self-stretch">
          <span className="text-[0.729vw] font-normal leading-[1.146vw] text-chat-placeholder">Budget:</span>
          <span className="text-[0.729vw] font-normal leading-[1.146vw] text-text-primary">{outfit.budget}</span>
        </div>
        <div className="flex gap-[0.417vw] self-stretch">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-center text-[0.625vw]"
            onClick={() => toast("View Items is under development")}
          >
            View Items ({outfit.itemCount})
            <ArrowRightIcon size={14} className="!w-[0.729vw] !h-[0.729vw]" color="var(--brand-blue)" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-center bg-accent-purple-light text-accent-purple-text hover:bg-accent-purple-light/80"
            onClick={() => onEditOutfit?.(outfit)}
          >
            <PeopleIcon size={14} className="!w-[0.729vw] !h-[0.729vw]" color="var(--accent-purple-text)" />
            Edit Outfit
          </Button>
        </div>
      </div>
    </div>
  );
}
