"use client";

import Image from "next/image";
import {
  Sheet,
  SheetContent,
  Button,
} from "@/app/shared/components/ui";
import { CloseIcon } from "@/app/shared/components/icons";
import type { TryOnProductDetail } from "@/app/try-on/types";

interface ViewPiecesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pieces: TryOnProductDetail[];
  onRemovePiece: (id: string) => void;
}

export function ViewPiecesSheet({
  isOpen,
  onClose,
  pieces,
  onRemovePiece,
}: ViewPiecesSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex max-h-[60vh] flex-col gap-3 rounded-t-[20px] border-none bg-[#fafafa] px-4 py-5"
      >
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-bold leading-[26px] text-brand-blue">
            Selected Pieces ({pieces.length})
          </span>
          <Button variant="link" size="sm" onClick={onClose}>
            <CloseIcon size={16} color="var(--brand-blue)" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {pieces.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-hint">
              No pieces selected yet. Tap a category to browse products.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pieces.map((piece) => (
                <div
                  key={piece.id}
                  className="flex items-center gap-3 rounded-[20px] border-[0.5px] border-product-card-border bg-white p-2"
                >
                  <div className="flex size-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white p-1">
                    <div className="relative size-[48px]">
                      <Image
                        src={piece.imageUrl}
                        alt={piece.name}
                        fill
                        sizes="48px"
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="line-clamp-1 text-xs leading-[1.667em] text-text-primary">
                      {piece.name}
                    </span>
                    <span className="text-xs leading-[1.667em] text-catalog-category-text">
                      {piece.category}
                    </span>
                  </div>
                  <Button
                    variant="icon"
                    size="icon-sm"
                    onClick={() => onRemovePiece(piece.id)}
                    className="size-7 rounded-full bg-surface-segment hover:bg-surface-segment/80"
                  >
                    <CloseIcon size={12} color="var(--text-muted)" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
