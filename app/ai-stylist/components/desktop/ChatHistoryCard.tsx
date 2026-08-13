"use client";

import Image from "next/image";
import { DeleteIcon, ExternalLinkIcon } from "@/app/shared/components/icons";
import type { ChatHistoryItem } from "@/app/ai-stylist/types";

interface ChatHistoryCardProps {
  item: ChatHistoryItem;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}

export function ChatHistoryCard({ item, onDelete, onOpen }: ChatHistoryCardProps) {
  return (
    <div className="flex w-full flex-col gap-[0.417vw] rounded-[0.729vw] border border-border-separator bg-surface-light p-[0.417vw]">
      {/* Header row */}
      <div className="flex items-center gap-[0.521vw] self-stretch">
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="flex-1 truncate text-left text-[0.625vw] font-normal leading-[1.042vw] text-text-subtitle transition-opacity hover:opacity-70"
        >
          {item.title}
        </button>
        <div className="flex shrink-0 items-center gap-[0.417vw]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="shrink-0 transition-opacity hover:opacity-70"
          >
            <DeleteIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--rule-rejected)" />
          </button>
          <button
            onClick={() => onOpen(item.id)}
            className="shrink-0 transition-opacity hover:opacity-70"
          >
            <ExternalLinkIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--text-neutral)" />
          </button>
        </div>
      </div>

      {/* Preview images strip — show up to 5 outfits */}
      {item.previewImages.length > 0 && (
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="flex w-full gap-[0.417vw] overflow-hidden"
        >
          {item.previewImages.slice(0, 5).map((src, i) => (
            <div
              key={i}
              className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[0.417vw]"
              style={{ aspectRatio: "300/433" }}
            >
              <Image
                src={src}
                alt={`${item.title} outfit ${i + 1}`}
                fill
                className="object-cover"
                sizes="70px"
              />
            </div>
          ))}
        </button>
      )}
    </div>
  );
}
