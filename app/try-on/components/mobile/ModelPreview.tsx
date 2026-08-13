import {
  ApparelIcon,
  PersonAddIcon,
  PersonOutlineIcon,
  RefreshIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { GenerationOverlay } from "@/app/try-on/components/GenerationOverlay";
import type {
  TryOnProductDetail,
  TryOnStatus,
} from "@/app/try-on/types";

interface ModelPreviewProps {
  hasModel: boolean;
  modelImageUrl: string | undefined;
  selectedProducts: TryOnProductDetail[];
  tryOnStatus: TryOnStatus;
  resultImageUrl: string | null;
  tryOnError: string | null;
  onRefresh: () => void;
  onViewPieces?: () => void;
  onChooseModel?: () => void;
  className?: string;
}

export function ModelPreview({
  hasModel,
  modelImageUrl,
  selectedProducts,
  tryOnStatus,
  resultImageUrl,
  tryOnError,
  onRefresh,
  onViewPieces,
  onChooseModel,
  className,
}: ModelPreviewProps) {
  const isGenerating = tryOnStatus === "generating";
  const hasResult = tryOnStatus === "completed" && !!resultImageUrl;
  const hasError = tryOnStatus === "error";

  const displayImageUrl = hasResult ? resultImageUrl : modelImageUrl;

  return (
    <div
      className={`relative flex min-h-0 overflow-hidden rounded-[12px] ${
        className ?? "flex-1"
      }`}
      style={{ border: "0.609px solid #e7e7e7" }}
    >
      {hasModel && displayImageUrl ? (
        <div className="relative flex h-full w-full items-center justify-center bg-[#cbcacf]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImageUrl}
            alt={hasResult ? "Try-on result" : "Selected model"}
            className="h-full w-full object-cover"
          />

          {isGenerating && <GenerationOverlay garments={selectedProducts} />}

          {hasModel && !isGenerating && !hasError && (
            <>
              <div className="absolute left-3 top-3 z-20 rounded-full bg-white/65 p-2 shadow-[0_6px_22px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                <Button
                  type="button"
                  variant="icon"
                  onClick={onRefresh}
                  aria-label="Start over"
                  className="h-10 w-10 bg-[#2154ef] hover:bg-[#193edc]"
                >
                  <RefreshIcon size={20} color="white" />
                </Button>
              </div>

              {(onViewPieces || onChooseModel) && (
                <div className="absolute right-3 top-3 z-20 flex flex-col gap-2 rounded-full bg-white/65 p-2 shadow-[0_6px_22px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                  {onViewPieces && (
                    <Button
                      type="button"
                      variant="icon"
                      onClick={onViewPieces}
                      aria-label="View selected pieces"
                      className="h-10 w-10 bg-[#bed6ff] hover:bg-[#a8c9ff]"
                    >
                      <ApparelIcon size={18} color="#2154ef" />
                    </Button>
                  )}
                  {onChooseModel && (
                    <Button
                      type="button"
                      variant="icon"
                      onClick={onChooseModel}
                      aria-label="Choose another model"
                      className="h-10 w-10 bg-[#bed6ff] hover:bg-[#a8c9ff]"
                    >
                      <PersonOutlineIcon size={18} color="#2154ef" />
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white">
          <div className="flex max-w-[200px] flex-col items-center gap-4">
            <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-3">
              <PersonAddIcon size={120} color="#e6e6e6" />
            </div>
            <div className="flex flex-col items-center gap-1 self-stretch">
              <span className="text-[14px] leading-[1.57] text-text-body">
                No model selected yet
              </span>
              <span className="text-center text-[10px] leading-[1.6] text-text-hint">
                Choose one of our ready-made models or upload your own photo
                to start the try-on experience.
              </span>
            </div>
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex max-w-[260px] flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-lg">
            <span className="text-[14px] font-medium text-text-error">
              {tryOnError || "Something went wrong"}
            </span>
            <Button variant="primary" size="sm" onClick={onRefresh}>
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
