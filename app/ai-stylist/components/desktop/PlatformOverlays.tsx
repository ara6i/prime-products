"use client";

import { Button } from "@/app/shared/components/ui";
import {
  RotateLeftIcon,
  RotateRightIcon,
  BookmarkOutlineIcon,
  ApparelIcon,
  RefreshIcon,
} from "@/app/shared/components/icons";

/* ─── Glass Reset Button ─── */

export function GlassResetButton({ onReset }: { onReset: () => void }) {
  return (
    <div className="absolute top-[1.042vw] left-[1.042vw]">
      <div className="relative flex h-[3.75vw] w-[3.75vw] items-center justify-center rounded-full">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "rgba(245, 245, 245, 0.6)",
            backdropFilter: "blur(20px)",
          }}
        />
        <Button
          variant="icon"
          size="sm"
          className="relative z-10 flex h-[1.979vw] w-[1.979vw] items-center justify-center rounded-full bg-brand-blue"
          onClick={onReset}
        >
          <RefreshIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Navigation Controls ─── */

interface NavigationControlsProps {
  currentIndex: number;
  totalOutfits: number;
  onNavigate: (direction: "prev" | "next") => void;
}

export function NavigationControls({
  currentIndex,
  totalOutfits,
  onNavigate,
}: NavigationControlsProps) {
  return (
    <div className="absolute left-1/2 z-[50] flex -translate-x-1/2 items-center gap-[0.417vw]" style={{ top: "calc(83% - 4px)" }}>
      <Button
        variant="icon"
        size="sm"
        className="flex h-[1.875vw] w-[1.875vw] items-center justify-center rounded-full bg-brand-blue"
        style={{ boxShadow: "2px 2px 8px rgba(0,0,0,0.25)" }}
        onClick={() => onNavigate("prev")}
      >
        <RotateLeftIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" />
      </Button>
      <span className="text-[0.729vw] font-semibold leading-[1.146vw] text-brand-blue">
        {currentIndex + 1}
      </span>
      <span className="text-[0.729vw] font-normal leading-[1.146vw] text-text-muted">
        of {totalOutfits}
      </span>
      <Button
        variant="icon"
        size="sm"
        className="flex h-[1.875vw] w-[1.875vw] items-center justify-center rounded-full bg-brand-blue"
        style={{ boxShadow: "2px 2px 8px rgba(0,0,0,0.25)" }}
        onClick={() => onNavigate("next")}
      >
        <RotateRightIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" />
      </Button>
    </div>
  );
}

/* ─── Bottom Action Bar ─── */

export function BottomActionBar({ outfitItemCount }: { outfitItemCount: number }) {
  return (
    <div
      className="absolute bottom-[2.5%] left-1/2 z-[50] flex -translate-x-1/2 items-center gap-[0.417vw] rounded-full bg-brand-blue-pale px-[0.833vw] py-[0.625vw]"
      style={{ boxShadow: "2px 2px 8px rgba(0,0,0,0.25)" }}
    >
      <Button variant="primary" size="sm" className="gap-[0.313vw]">
        <BookmarkOutlineIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" />
        Save Outfit
        <div className="flex h-[1.25vw] items-center gap-[0.208vw] rounded-[0.573vw] bg-warning-bg px-[0.208vw]">
          <ApparelIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--warning-text)" />
          <span className="text-[0.625vw] font-normal leading-[1.042vw] text-warning-text">
            20
          </span>
        </div>
      </Button>
      <Button variant="outline" size="sm">
        <ApparelIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--brand-blue)" />
        View Items ({outfitItemCount})
      </Button>
    </div>
  );
}
