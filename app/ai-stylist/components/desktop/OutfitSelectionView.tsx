"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  Check,
  ExternalLink,
  GripVertical,
  LoaderCircle,
  Move,
  RotateCcw,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";
import { CatalogPanel } from "@/app/try-on/components/desktop/CatalogPanel";
import { Button } from "@/app/shared/components/ui";
import type {
  OutfitItemSwap,
  StylistPreparationStatus,
} from "@/app/ai-stylist/hooks/useOutfitIntelligence";
import type {
  IntelligentOutfit,
  IntelligentOutfitItem,
  OutfitIntelligenceResponse,
} from "@/app/ai-stylist/types";
import type { CatalogProduct } from "@/app/try-on/types";

interface OutfitSelectionViewProps {
  result: OutfitIntelligenceResponse;
  isLoadingMore?: boolean;
  selectedIds: string[];
  onToggle: (outfitId: string) => void;
  onSwapItems: (swap: OutfitItemSwap) => boolean;
  onEditModel: () => void;
  onReset: () => void;
  onStartTryOns: () => void;
  modelImageUrl?: string | null;
  modelPreparationStatus?: StylistPreparationStatus;
  modelPreparationError?: string | null;
  tryOnPreparationStatus?: StylistPreparationStatus;
  tryOnError?: string | null;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function itemLabel(item: IntelligentOutfitItem): string {
  return item.slot === "shoe" ? "Shoes" : item.slot.charAt(0).toUpperCase() + item.slot.slice(1);
}

function catalogCategory(
  item: IntelligentOutfitItem,
): CatalogProduct["category"] {
  if (item.slot === "top" || item.slot === "outerwear") return "upper-body";
  if (item.slot === "bottom") return "lower-body";
  if (item.slot === "dress") return "full-body";
  return "accessories";
}

function catalogProductId(item: IntelligentOutfitItem): string {
  return item.id || item.styleRagId;
}

interface DraggedPiece {
  outfitId: string;
  styleRagId: string;
  slot: IntelligentOutfitItem["slot"];
}

function piecePosition(
  item: IntelligentOutfitItem,
  template: IntelligentOutfit["template"],
): string {
  if (template === "dress") {
    switch (item.slot) {
      case "dress":
        return "left-[3%] top-[3%] h-[91%] w-[45%] z-20";
      case "outerwear":
        return "left-[45%] top-[3%] h-[57%] w-[30%] z-10";
      case "shoe":
        return "right-[2%] bottom-[3%] h-[28%] w-[27%] z-30";
      case "bag":
        return "right-[2%] top-[34%] h-[24%] w-[22%] z-30";
      default:
        return "right-[3%] top-[3%] h-[22%] w-[20%] z-30";
    }
  }

  switch (item.slot) {
    case "outerwear":
      return "left-[31%] top-[3%] h-[52%] w-[29%] z-10";
    case "top":
      return "left-[2%] top-[3%] h-[52%] w-[29%] z-20";
    case "bottom":
      return "right-[2%] top-[3%] h-[71%] w-[36%] z-10";
    case "shoe":
      return "left-[2%] bottom-[3%] h-[27%] w-[28%] z-30";
    case "bag":
      return "left-[32%] bottom-[3%] h-[27%] w-[25%] z-30";
    default:
      return "right-[4%] bottom-[3%] h-[20%] w-[18%] z-30";
  }
}

function OutfitBoard({
  outfit,
  draggedPiece,
  onDragStart,
  onDragMove,
  onDragFinish,
}: {
  outfit: IntelligentOutfit;
  draggedPiece: DraggedPiece | null;
  onDragStart: (
    piece: DraggedPiece,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onDragFinish: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const compatibleBoardTarget =
    draggedPiece?.outfitId !== outfit.id
      ? outfit.items.find((item) => item.slot === draggedPiece?.slot)
      : undefined;

  return (
    <div
      data-outfit-drop-id={outfit.id}
      className={`relative isolate aspect-[5/4] overflow-hidden rounded-[0.625vw] bg-[#f7f7f8] transition ${
        compatibleBoardTarget
          ? "ring-2 ring-[#2154ef] ring-offset-2 ring-offset-[#efeff1]"
          : ""
      }`}
      aria-label={`${outfit.label}, ${outfit.items.length} draggable pieces`}
    >
      {outfit.items.slice(0, 6).map((item, index) => {
        const isDragged =
          draggedPiece?.outfitId === outfit.id &&
          draggedPiece.styleRagId === item.styleRagId;
        const isCompatibleTarget =
          Boolean(draggedPiece) &&
          draggedPiece?.outfitId !== outfit.id &&
          draggedPiece?.slot === item.slot;
        return (
          <button
            key={item.styleRagId}
            type="button"
            draggable={false}
            data-testid={`outfit-piece-${outfit.id}-${item.styleRagId}`}
            data-outfit-id={outfit.id}
            data-style-rag-id={item.styleRagId}
            data-slot={item.slot}
            data-cutout-ready={item.cutoutImageUrl ? "true" : "false"}
            aria-label={`${itemLabel(item)}: ${item.title}. Drag onto another ${itemLabel(item).toLowerCase()} to swap.`}
            aria-grabbed={isDragged}
            title={`Drag to swap this ${itemLabel(item).toLowerCase()}`}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;
              onDragStart(
                {
                  outfitId: outfit.id,
                  styleRagId: item.styleRagId,
                  slot: item.slot,
                },
                event,
              );
            }}
            onPointerMove={onDragMove}
            onPointerUp={onDragFinish}
            onPointerCancel={onDragFinish}
            className={`group absolute flex touch-none cursor-grab items-center justify-center rounded-lg outline-none transition duration-200 active:cursor-grabbing ${piecePosition(item, outfit.template)} ${
              isDragged ? "scale-95 opacity-35" : "hover:scale-[1.04]"
            } ${
              isCompatibleTarget
                ? "bg-[#dfe8ff] ring-2 ring-[#2154ef] ring-offset-2 ring-offset-[#efeff1]"
                : "focus-visible:ring-2 focus-visible:ring-[#7258fa]"
            }`}
          >
            <motion.span
              layoutId={`stylist-garment-${item.styleRagId}`}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className="pointer-events-none flex h-full w-full items-center justify-center"
            >
              {item.cutoutImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.cutoutImageUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-contain drop-shadow-[0_7px_8px_rgba(24,22,30,0.14)] transition duration-300"
                  loading={index < 4 ? "eager" : "lazy"}
                />
              ) : (
                // The source image already passed the independent product-only
                // image gate. Show it now while transparency is prepared.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-contain mix-blend-multiply drop-shadow-[0_7px_8px_rgba(24,22,30,0.12)]"
                  loading={index < 4 ? "eager" : "lazy"}
                />
              )}
            </motion.span>
            <span className="pointer-events-none absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[#77737f] opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <GripVertical className="h-3 w-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OutfitCard({
  outfit,
  selected,
  selectionFull,
  onToggle,
  onViewPieces,
  draggedPiece,
  onDragStart,
  onDragMove,
  onDragFinish,
}: {
  outfit: IntelligentOutfit;
  selected: boolean;
  selectionFull: boolean;
  onToggle: () => void;
  onViewPieces: () => void;
  draggedPiece: DraggedPiece | null;
  onDragStart: (
    piece: DraggedPiece,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onDragFinish: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <article
      data-testid={`outfit-card-${outfit.id}`}
      className={`flex min-w-0 flex-col gap-2 rounded-[0.938vw] border p-2 transition ${
        selected
          ? "border-[#7258fa] bg-[#f4f1ff]"
          : "border-transparent bg-transparent hover:border-[#d7d4de]"
      }`}
    >
      <OutfitBoard
        outfit={outfit}
        draggedPiece={draggedPiece}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragFinish={onDragFinish}
      />

      <div className="flex min-w-0 items-start justify-between gap-2 px-0.5">
        <h3 className="line-clamp-2 text-[0.677vw] font-semibold leading-[0.885vw] text-text-primary">
          {outfit.label}
        </h3>
        <span className="shrink-0 text-[0.625vw] font-semibold text-[#24212c]">
          {formatMoney(outfit.totalPrice, outfit.currency)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-0.5">
        <button
          type="button"
          onClick={onViewPieces}
          aria-label={`View pieces in ${outfit.label}`}
          title="View pieces"
          className="flex h-[1.667vw] w-[1.667vw] shrink-0 items-center justify-center rounded-full text-[#77737f] transition hover:bg-[#e4e1ee] hover:text-[#5945cb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7258fa] active:bg-[#d8d3e8]"
        >
          <Shirt className="h-[0.833vw] w-[0.833vw]" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={!selected && selectionFull}
          aria-pressed={selected}
          className={`flex h-[1.667vw] min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 text-[0.573vw] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7258fa] active:brightness-95 ${
            selected
              ? "bg-[#7258fa] text-white hover:bg-[#6348ef]"
              : selectionFull
                ? "cursor-not-allowed bg-[#e7e5ea] text-[#aaa6b0]"
                : "bg-[#dce9ff] text-[#2154ef] hover:bg-[#c9dcff]"
          }`}
        >
          {selected && <Check className="h-[0.729vw] w-[0.729vw]" />}
          {selected ? "Selected" : selectionFull ? "Max 5" : "Select outfit"}
        </button>
      </div>
    </article>
  );
}

function PiecesDialog({
  outfit,
  onClose,
}: {
  outfit: IntelligentOutfit;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#191720]/45 p-6 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outfit-pieces-heading"
        className="flex max-h-[90%] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#eceaf0] px-5 py-4">
          <div>
            <h2 id="outfit-pieces-heading" className="text-base font-semibold text-[#24212c]">
              {outfit.label}
            </h2>
            <p className="text-xs text-[#77737f]">
              {outfit.items.length} real catalog pieces ·{" "}
              {formatMoney(outfit.totalPrice, outfit.currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pieces"
            className="rounded-full p-2 text-[#77737f] hover:bg-[#f2f0f5] hover:text-[#24212c]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {outfit.items.map((item) => {
              return (
                <article
                  key={item.styleRagId}
                  className="flex gap-3 rounded-xl border border-[#e4e2e8] p-3"
                >
                  <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-[#f7f7f9]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.cutoutImageUrl ?? item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-contain p-1.5"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7258fa]">
                      {itemLabel(item)}
                    </span>
                    <h3 className="mt-1 line-clamp-2 text-xs font-semibold text-[#24212c]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-[#77737f]">
                      {item.brand || item.merchantName}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[#5945cb]">
                      {item.sizeStatus === "loading"
                        ? "Finding your size…"
                        : item.recommendedSize
                          ? `Your size: ${item.recommendedSize}`
                          : "Size recommendation unavailable"}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-xs font-semibold text-[#24212c]">
                        {formatMoney(item.price, item.currency)}
                      </span>
                      <a
                        href={`/shop/ai-stylist/product/${encodeURIComponent(catalogProductId(item))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium text-[#2154ef] hover:underline"
                      >
                        Details
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OutfitSelectionView({
  result,
  isLoadingMore = false,
  selectedIds,
  onToggle,
  onSwapItems,
  onEditModel,
  onReset,
  onStartTryOns,
  modelImageUrl,
  modelPreparationStatus = "idle",
  modelPreparationError,
  tryOnPreparationStatus = "idle",
  tryOnError,
}: OutfitSelectionViewProps) {
  const [piecesOutfit, setPiecesOutfit] = useState<IntelligentOutfit | null>(null);
  const [savedCatalogProductIds, setSavedCatalogProductIds] = useState<string[]>([]);
  const [draggedPiece, setDraggedPiece] = useState<DraggedPiece | null>(null);
  const draggedPieceRef = useRef<DraggedPiece | null>(null);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [swapMessage, setSwapMessage] = useState<string | null>(null);
  const selectionLimit = result.selectionLimit || 5;
  const selectionFull = selectedIds.length >= selectionLimit;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const savedCatalogProductSet = useMemo(
    () => new Set(savedCatalogProductIds),
    [savedCatalogProductIds],
  );

  useEffect(() => {
    if (!swapMessage) return;
    const timer = window.setTimeout(() => setSwapMessage(null), 1800);
    return () => window.clearTimeout(timer);
  }, [swapMessage]);

  const catalogProducts = useMemo(() => {
    const uniqueProducts = new Map<string, IntelligentOutfitItem>();
    for (const outfit of result.outfits) {
      for (const item of outfit.items) {
        const id = catalogProductId(item);
        if (!uniqueProducts.has(id)) uniqueProducts.set(id, item);
      }
    }

    return Array.from(uniqueProducts.entries()).map(
      ([id, item]): CatalogProduct => ({
        id,
        name: item.title,
        brand: item.brand || item.merchantName,
        price: item.price,
        imageUrl: item.cutoutImageUrl ?? item.imageUrl,
        category: catalogCategory(item),
        isSaved: savedCatalogProductSet.has(id),
        affiliateUrl: item.affiliateUrl ?? item.productUrl,
      }),
    );
  }, [result.outfits, savedCatalogProductSet]);

  const selectedProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          result.outfits
            .filter((outfit) => selectedSet.has(outfit.id))
            .flatMap((outfit) => outfit.items.map(catalogProductId)),
        ),
      ),
    [result.outfits, selectedSet],
  );
  const draggedItem = useMemo(() => {
    if (!draggedPiece) return null;
    return (
      result.outfits
        .find((outfit) => outfit.id === draggedPiece.outfitId)
        ?.items.find(
          (item) => item.styleRagId === draggedPiece.styleRagId,
        ) ?? null
    );
  }, [draggedPiece, result.outfits]);

  const handleCatalogProductToggle = (productId: string) => {
    const selectedOutfit = result.outfits.find(
      (outfit) =>
        selectedSet.has(outfit.id) &&
        outfit.items.some((item) => catalogProductId(item) === productId),
    );
    const matchingOutfit =
      selectedOutfit ??
      result.outfits.find((outfit) =>
        outfit.items.some((item) => catalogProductId(item) === productId),
      );

    if (matchingOutfit) onToggle(matchingOutfit.id);
  };

  const handleToggleCatalogSave = (productId: string) => {
    setSavedCatalogProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const handleDropPiece = (
    sourcePiece: DraggedPiece,
    targetOutfitId: string,
    targetItem: IntelligentOutfitItem,
  ) => {
    if (
      sourcePiece.outfitId === targetOutfitId ||
      sourcePiece.slot !== targetItem.slot
    ) {
      draggedPieceRef.current = null;
      setDragPosition(null);
      setDraggedPiece(null);
      return;
    }
    const didSwap = onSwapItems({
      sourceOutfitId: sourcePiece.outfitId,
      sourceStyleRagId: sourcePiece.styleRagId,
      targetOutfitId,
      targetStyleRagId: targetItem.styleRagId,
    });
    if (didSwap) {
      setSwapMessage(`${itemLabel(targetItem)} swapped between outfits`);
    }
    draggedPieceRef.current = null;
    setDragPosition(null);
    setDraggedPiece(null);
  };

  const clearDraggedPiece = () => {
    draggedPieceRef.current = null;
    setDragPosition(null);
    setDraggedPiece(null);
  };

  const handlePointerDragStart = (
    piece: DraggedPiece,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSwapMessage(null);
    draggedPieceRef.current = piece;
    setDraggedPiece(piece);
    setDragPosition({ x: event.clientX, y: event.clientY });
  };

  const handlePointerDragMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!draggedPieceRef.current) return;
    event.preventDefault();
    setDragPosition({ x: event.clientX, y: event.clientY });
  };

  const completeDraggedPieceAt = (clientX: number, clientY: number) => {
    const sourcePiece = draggedPieceRef.current;
    if (!sourcePiece) {
      clearDraggedPiece();
      return;
    }

    const dropElement = document.elementFromPoint(clientX, clientY);
    const targetOutfitId = dropElement
      ?.closest<HTMLElement>("[data-outfit-drop-id]")
      ?.getAttribute("data-outfit-drop-id");
    const targetOutfit = result.outfits.find(
      (outfit) => outfit.id === targetOutfitId,
    );
    const targetItem = targetOutfit?.items.find(
      (item) => item.slot === sourcePiece.slot,
    );
    if (!targetOutfitId || !targetItem) {
      clearDraggedPiece();
      return;
    }
    handleDropPiece(sourcePiece, targetOutfitId, targetItem);
  };

  const handlePointerDragFinish = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (event.type === "pointercancel") {
      clearDraggedPiece();
      return;
    }
    completeDraggedPieceAt(event.clientX, event.clientY);
  };

  const handleDragReleaseCapture = (
    event:
      | ReactPointerEvent<HTMLDivElement>
      | ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (!draggedPieceRef.current) return;
    event.preventDefault();
    completeDraggedPieceAt(event.clientX, event.clientY);
  };

  return (
    <CatalogPanel
      className="w-full"
      tryOnProductIds={selectedProductIds}
      onToggleTryOn={handleCatalogProductToggle}
      previewImageUrl={modelImageUrl ?? undefined}
      onGenerate={onStartTryOns}
      catalogProducts={catalogProducts}
      catalogDescription="Browse the real products selected by your AI Stylist"
      onToggleCatalogSave={handleToggleCatalogSave}
      productActionLabel="Select look"
      activeProductActionLabel="Selected"
      productImageFit="contain"
      headerActions={
        <>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="!h-[0.833vw] !w-[0.833vw]" />
            Reset Stylist
          </Button>
          <Button variant="outline" size="sm" onClick={onEditModel}>
            Edit Model
          </Button>
        </>
      }
      extraTab={{
        value: "select-outfits",
        label: `Select Outfits (${result.outfits.length})`,
        defaultActive: true,
        placement: "first",
        content: (
          <div
            className="relative flex min-h-0 flex-1 flex-col"
            data-testid="outfit-results"
            onPointerUpCapture={handleDragReleaseCapture}
            onMouseUpCapture={handleDragReleaseCapture}
            onPointerCancelCapture={clearDraggedPiece}
          >
            <div className="shrink-0 pb-[0.625vw]">
              <div className="flex items-center justify-between gap-[0.833vw]">
                <div className="min-w-0">
                  <h2 className="text-[0.833vw] font-semibold text-[#24212c]">
                    Select up to {selectionLimit} outfits
                  </h2>
                  <p className="mt-[0.208vw] flex items-center gap-[0.313vw] text-[0.573vw] text-[#77737f]">
                    <Move className="h-[0.729vw] w-[0.729vw]" />
                    Drag matching pieces between looks to swap them
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-[0.625vw] py-[0.313vw] text-[0.625vw] font-semibold ${
                    selectionFull
                      ? "bg-[#7258fa] text-white"
                      : "bg-[#efebff] text-[#5945cb]"
                  }`}
                  aria-live="polite"
                  aria-label={`${selectedIds.length} of ${selectionLimit} outfits selected`}
                >
                  {selectedIds.length} / {selectionLimit}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-[0.208vw] pb-[3.646vw]">
              <div className="grid grid-cols-3 gap-[0.625vw]">
                {result.outfits.map((outfit) => (
                  <OutfitCard
                    key={outfit.id}
                    outfit={outfit}
                    selected={selectedSet.has(outfit.id)}
                    selectionFull={selectionFull}
                    onToggle={() => {
                      onToggle(outfit.id);
                    }}
                    onViewPieces={() => setPiecesOutfit(outfit)}
                    draggedPiece={draggedPiece}
                    onDragStart={handlePointerDragStart}
                    onDragMove={handlePointerDragMove}
                    onDragFinish={handlePointerDragFinish}
                  />
                ))}
              </div>
              {isLoadingMore && (
                <div
                  className="flex items-center justify-center gap-2 py-5 text-xs font-medium text-[#77737f]"
                  aria-live="polite"
                >
                  <LoaderCircle className="h-4 w-4 animate-spin text-[#7258fa]" />
                  Adding more outfits…
                </div>
              )}
              {swapMessage && (
                <div
                  className="sticky bottom-[0.313vw] mx-auto mt-[0.625vw] w-fit rounded-full bg-[#24212c] px-[0.833vw] py-[0.417vw] text-[0.573vw] font-medium text-white shadow-lg"
                  role="status"
                  aria-live="polite"
                >
                  {swapMessage}
                </div>
              )}
            </div>

            {draggedItem &&
              dragPosition &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  className="pointer-events-none fixed z-[100] flex h-28 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-[#b8aaff] bg-white/95 p-2 shadow-[0_18px_45px_rgba(36,33,44,0.24)]"
                  style={{ left: dragPosition.x, top: dragPosition.y }}
                  aria-hidden="true"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draggedItem.cutoutImageUrl ?? draggedItem.imageUrl}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-contain drop-shadow-[0_6px_9px_rgba(24,22,30,0.18)]"
                  />
                </div>,
                document.body,
              )}

            <div className="absolute inset-x-0 bottom-0 border-t border-divider bg-catalog-bg/95 pt-[0.625vw] backdrop-blur">
              {tryOnPreparationStatus === "failed" && tryOnError && (
                <p
                  className="mb-[0.417vw] text-center text-[0.573vw] font-medium text-red-600"
                  role="alert"
                >
                  {tryOnError}
                </p>
              )}
              <button
                type="button"
                data-testid="confirm-outfit-selection"
                disabled={
                  selectedIds.length === 0 ||
                  !modelImageUrl ||
                  tryOnPreparationStatus === "working"
                }
                title={
                  !modelImageUrl && modelPreparationStatus === "failed"
                    ? modelPreparationError ?? "Edit the model photo to continue."
                    : undefined
                }
                onClick={onStartTryOns}
                className="flex w-full items-center justify-center gap-[0.417vw] rounded-full bg-[#2154ef] px-[0.833vw] py-[0.521vw] text-[0.625vw] font-semibold text-white hover:bg-[#1947d6] disabled:cursor-not-allowed disabled:bg-[#d8d6dd] disabled:text-[#9a96a0]"
              >
                {(!modelImageUrl && modelPreparationStatus === "working") ||
                tryOnPreparationStatus === "working" ? (
                  <LoaderCircle className="h-[0.833vw] w-[0.833vw] animate-spin" />
                ) : (
                  <Sparkles className="h-[0.833vw] w-[0.833vw]" />
                )}
                {!modelImageUrl && modelPreparationStatus === "failed"
                  ? "Model preparation failed · Edit model"
                  : !modelImageUrl
                    ? "Outfits are ready · Preparing model…"
                    : tryOnPreparationStatus === "working"
                      ? "Preparing selected garments…"
                      : tryOnPreparationStatus === "failed"
                        ? "Retry garment preparation"
                    : "Try on selected outfits · 20 tokens"}
              </button>
            </div>

            {piecesOutfit && (
              <PiecesDialog
                outfit={piecesOutfit}
                onClose={() => setPiecesOutfit(null)}
              />
            )}
          </div>
        ),
      }}
    />
  );
}
