import type { IntelligentOutfitItem } from "../../types";
import { isLocalMlOutfitImage } from "../../utils/imageProvenance";

interface LocalMlImageBadgeProps {
  item: IntelligentOutfitItem;
  className?: string;
}

export function LocalMlImageBadge({
  item,
  className = "",
}: LocalMlImageBadgeProps) {
  if (!isLocalMlOutfitImage(item)) return null;

  return (
    <span
      className={`pointer-events-none z-20 rounded-full border border-[#ffb3a7] bg-[#fff1ee]/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#a42d1f] shadow-sm ${className}`}
      title="This image came from the older Local ML garment extraction pipeline and requires visual review."
    >
      Local ML · Review
    </span>
  );
}
