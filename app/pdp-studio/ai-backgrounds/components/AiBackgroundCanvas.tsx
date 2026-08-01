"use client";

import Image from "next/image";
import type { AiBackgroundsWorkspaceController } from "../hooks/useAiBackgroundsWorkspace";
import { PdpStudioButton } from "../../workspace/components/shared/PdpStudioButton";
import { PdpStudioGenerationProgressPanel } from "../../workspace/components/shared/PdpStudioGenerationProgress";

interface AiBackgroundCanvasProps {
  ui: AiBackgroundsWorkspaceController;
}

const RATIOS: Record<string, number> = {
  "1:1": 1,
  "2:3": 2 / 3,
  "3:4": 3 / 4,
  "4:3": 4 / 3,
  "3:2": 3 / 2,
  "9:16": 9 / 16,
  "16:9": 16 / 9,
};

export function AiBackgroundCanvas({ ui }: AiBackgroundCanvasProps) {
  const progress = ui.uploading
    ? { stage: "Uploading private image", percent: 10 }
    : ui.job?.progress;

  return (
    <div
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#eef3fb] p-5 lg:p-8"
      style={{ containerType: "size" }}
    >
      <div
        className="relative max-h-full max-w-full overflow-hidden rounded-[0.75rem] border border-[var(--color-pdp-rule)] bg-white shadow-[0_24px_80px_rgba(24,45,85,0.12)]"
        style={{
          aspectRatio: String(RATIOS[ui.aspectRatio]),
          width: `min(90cqw, 44rem, ${RATIOS[ui.aspectRatio] * 90}cqh)`,
        }}
      >
        {ui.currentImageUrl ? (
          <Image
            src={ui.currentImageUrl}
            alt="Product background canvas"
            fill
            unoptimized
            priority
            sizes="50rem"
            className="object-contain"
          />
        ) : null}

        {ui.imageLayers.map((layer) => (
          <span
            key={layer.id}
            className="absolute overflow-hidden rounded-[0.4rem] border border-white/70 shadow-lg"
            style={{
              left: `${layer.x * 100}%`,
              top: `${layer.y * 100}%`,
              width: `${layer.width * 100}%`,
              height: `${layer.height * 100}%`,
            }}
          >
            <Image
              src={layer.url}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </span>
        ))}

        {ui.textLayers.map((layer) => (
          <input
            key={layer.id}
            aria-label="Canvas text"
            value={layer.text}
            onChange={(event) =>
              ui.updateTextLayer(layer.id, event.target.value)
            }
            className="absolute min-w-32 border border-transparent bg-transparent px-1 font-semibold text-[var(--color-pdp-ink)] outline-none hover:border-white/70 focus:border-[var(--color-pdp-accent)] focus:bg-white/80"
            style={{
              left: `${layer.x * 100}%`,
              top: `${layer.y * 100}%`,
              fontSize: `clamp(0.75rem, ${layer.fontSize * 100}vw, 2rem)`,
              color: layer.color,
            }}
          />
        ))}

        {ui.busy ? (
          <div
            className="absolute inset-0 grid place-items-center bg-white/82 backdrop-blur-[2px]"
            aria-live="polite"
          >
            <div className="grid place-items-center">
              <PdpStudioGenerationProgressPanel
                stage={progress?.stage ?? "Creating your background"}
                percent={progress?.percent ?? 8}
                elapsedSeconds={ui.elapsedSeconds}
                status={
                  ui.uploading ? "uploading" : ui.job?.status ?? "running"
                }
              />
              <PdpStudioButton
                type="button"
                variant="ghost"
                onClick={() => void ui.cancel()}
                className="mt-3 min-h-8 text-[0.6875rem] text-[var(--color-pdp-muted)]"
              >
                Cancel
              </PdpStudioButton>
            </div>
          </div>
        ) : null}

        {ui.job?.status === "failed" || ui.job?.status === "cancelled" ? (
          <div className="absolute inset-x-4 bottom-4 rounded-[0.75rem] border border-red-100 bg-white p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 text-[0.75rem] text-red-700">
                {ui.job.error?.message ??
                  (ui.job.status === "cancelled"
                    ? "Generation cancelled."
                    : "Generation failed.")}
              </p>
              <PdpStudioButton
                type="button"
                variant="outline"
                onClick={() => void ui.retry()}
                className="min-h-8 text-[0.6875rem]"
              >
                Retry
              </PdpStudioButton>
            </div>
          </div>
        ) : null}
      </div>

      {ui.error ? (
        <div
          role="alert"
          className="absolute bottom-4 left-1/2 z-20 flex max-w-[34rem] -translate-x-1/2 items-center gap-3 rounded-[0.75rem] border border-red-100 bg-white px-4 py-3 text-[0.75rem] text-red-700 shadow-lg"
        >
          {ui.error}
        </div>
      ) : null}
    </div>
  );
}
