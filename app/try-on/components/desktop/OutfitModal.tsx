"use client";

import {
  CalendarIcon,
  CloseIcon,
  GenerateIcon,
  WidgetsIcon,
} from "@/app/shared/components/icons";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  Button,
} from "@/app/shared/components/ui";
import { OutfitPieceCard } from "./OutfitPieceCard";
import { GlassActionPanel } from "./GlassActionPanel";
import type { OutfitProduct } from "@/app/try-on/types";

interface OutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: OutfitProduct[];
  selectedIds: string[];
  previewImageUrl?: string;
  onToggleSelect: (id: string) => void;
  onTryOn: (id: string) => void;
  onGenerate?: () => void;
  onChooseModel?: () => void;
}

export function OutfitModal({
  isOpen,
  onClose,
  products,
  selectedIds,
  previewImageUrl,
  onToggleSelect,
  onTryOn,
  onGenerate,
  onChooseModel,
}: OutfitModalProps) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const selectedCount = selectedIds.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[90vw] max-w-[49.479vw] flex-col items-end gap-[1.25vw] rounded-[1.042vw] border-none bg-white p-[0.833vw] sm:max-w-[49.479vw]"
      >
        <div className="flex items-center justify-between gap-[0.521vw] self-stretch">
          <DialogTitle className="text-[1.042vw] font-normal leading-[1.7] text-tab-active">
            Outfit Details
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="link" size="icon">
              <CloseIcon size={16} color="var(--brand-blue)" className="!w-[0.833vw] !h-[0.833vw]" />
            </Button>
          </DialogClose>
        </div>

        <div className="flex max-h-[70vh] gap-[1.042vw] self-stretch">
          {previewImageUrl && (
            <div className="relative w-[40%] shrink-0">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.042vw] bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImageUrl}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover blur-[100px]"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImageUrl}
                  alt="Model preview"
                  className="relative z-10 h-full w-auto object-contain"
                />
              </div>
              <GlassActionPanel />
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-[0.521vw]">
            <span className="shrink-0 text-[0.729vw] font-normal leading-[1.57] text-text-primary">
              Pieces in this outfit:
            </span>

            <div className="flex shrink-0 items-center justify-center gap-[0.208vw] self-stretch">
              <CalendarIcon size={14} color="var(--text-hint)" className="!w-[0.729vw] !h-[0.729vw]" />
              <span className="text-[0.625vw] leading-[1.667] text-text-hint">
                Created in
              </span>
              <span className="text-[0.625vw] leading-[1.667] text-text-primary">
                {today}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-[0.417vw] overflow-y-auto self-stretch">
              {products.map((product) => (
                <OutfitPieceCard
                  key={product.id}
                  product={product}
                  isSelected={selectedIds.includes(product.id)}
                  onToggleSelect={onToggleSelect}
                  onTryOn={onTryOn}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[0.417vw]">
          <DialogClose asChild>
            <Button variant="outline" size="default">
              <CloseIcon size={20} color="var(--brand-blue)" className="!w-[1.042vw] !h-[1.042vw]" />
              Close
            </Button>
          </DialogClose>
          {previewImageUrl ? (
            <Button
              variant="primary"
              size="default"
              onClick={() => {
                onGenerate?.();
                onClose();
              }}
            >
              <GenerateIcon size={20} color="white" className="!w-[1.042vw] !h-[1.042vw]" />
              Try on ({selectedCount})
            </Button>
          ) : (
            <Button
              variant="primary"
              size="default"
              onClick={() => {
                onChooseModel?.();
                onClose();
              }}
            >
              <WidgetsIcon size={20} color="white" className="!w-[1.042vw] !h-[1.042vw]" />
              Choose Model
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
