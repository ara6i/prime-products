"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { TryOnProductDetail } from "@/app/try-on/types";

const GENERATION_DURATION_SECONDS = 20;

interface GenerationOverlayProps {
  garments: TryOnProductDetail[];
}

const FLIGHT_PATHS = [
  { fromX: "-340%", fromY: "-120%", rotation: "-12deg" },
  { fromX: "320%", fromY: "-90%", rotation: "12deg" },
  { fromX: "-300%", fromY: "160%", rotation: "-8deg" },
  { fromX: "300%", fromY: "170%", rotation: "8deg" },
];

function getTargetPosition(category: string): number {
  if (category === "lower-body") return 66;
  if (category === "full-body") return 53;
  if (category === "accessories") return 30;
  return 42;
}

export function GenerationOverlay({ garments }: GenerationOverlayProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  const remainingSeconds = Math.max(
    GENERATION_DURATION_SECONDS -
      Math.floor(elapsedMs / 1000),
    0,
  );
  const progress = Math.min(
    (elapsedMs / (GENERATION_DURATION_SECONDS * 1000)) * 100,
    100,
  );
  const isFinishing = remainingSeconds === 0;
  const visibleGarments = garments.slice(0, FLIGHT_PATHS.length);

  return (
    <div
      className="absolute inset-0 z-20 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(20,42,85,0.28))",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">
        Generating your try-on. Estimated time: 20 seconds.
      </span>

      <div className="absolute left-1/2 top-[48%] h-[42%] w-[34%] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-[50%] border border-white/45 bg-white/10 shadow-[0_0_45px_rgba(255,255,255,0.28)] motion-reduce:animate-none" />

      {visibleGarments.map((garment, index) => {
        const path = FLIGHT_PATHS[index]!;
        const style = {
          left: "50%",
          top: `${getTargetPosition(garment.category)}%`,
          "--from-x": path.fromX,
          "--from-y": path.fromY,
          "--from-rotation": path.rotation,
          animationDelay: `${index * 700}ms`,
        } as CSSProperties;

        return (
          <div
            key={garment.id}
            className="garment-flight absolute -ml-[39px] -mt-[43px] h-[86px] w-[78px] motion-reduce:animate-none"
            style={style}
          >
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[16px] border border-white/80 bg-white p-1.5 shadow-[0_10px_30px_rgba(17,39,82,0.28)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={garment.imageUrl}
                alt=""
                aria-hidden
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-[#142a55]/75 via-[#142a55]/40 to-transparent px-6 pb-5 pt-14 text-white">
        <div className="flex w-full max-w-[320px] items-center justify-between gap-4">
          <span className="truncate text-[13px] font-medium">
            {isFinishing ? "Finishing your look" : "Fitting your selected pieces"}
          </span>
          <span
            className="shrink-0 font-mono text-[17px] font-semibold tabular-nums"
            aria-hidden
          >
            00:{String(remainingSeconds).padStart(2, "0")}
          </span>
        </div>
        <div className="mt-2 h-1 w-full max-w-[320px] overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <style jsx>{`
        .garment-flight {
          opacity: 0;
          animation: garment-to-person 4.4s ease-in-out infinite;
        }

        @keyframes garment-to-person {
          0%,
          8% {
            opacity: 0;
            transform: translate3d(var(--from-x), var(--from-y), 0)
              scale(0.85) rotate(var(--from-rotation));
          }
          18% {
            opacity: 1;
          }
          68% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(0.72) rotate(0deg);
          }
          82%,
          100% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.5) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
