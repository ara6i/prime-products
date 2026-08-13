"use client";

import { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TURNTABLE } from "@/app/ai-stylist/utils/turntable-config";

/* ─── Helpers ─── */

// Images are already transparent from the backend (processed during VTO generation)
const TWO_PI = 2 * Math.PI;
const FIGMA_SLOT_ARC = Math.PI / 5;
const FIGMA_MIN_SCALE = 0.65;
const FIGMA_SCALE_RANGE = 0.35;
const OUTER_SLOT = 2;

function wrapSlotPhase(phase: number, count: number): number {
  const half = count / 2;
  return ((phase + half) % count + count) % count - half;
}

interface SlotLayout {
  activeLight: number;
  bottomPercent: number;
  brightness: number;
  frontness: number;
  heightPercent: number;
  leftPercent: number;
  shadowOpacity: number;
  shadowWidth: number;
  wrapFade: number;
  zIndex: number;
}

function getSlotLayout(
  phase: number,
  count: number,
  modelBottom: number,
  modelSpread: number,
  modelSize: number,
  modelDepth: number,
  modelOffsetX: number,
  activeBrightness: number,
): SlotLayout {
  const absolutePhase = Math.abs(phase);
  const slotAngle = Math.min(absolutePhase, count / 2) * FIGMA_SLOT_ARC;
  const frontness = Math.max(0, Math.cos(slotAngle));
  const outerFrontness = Math.cos(FIGMA_SLOT_ARC * OUTER_SLOT);
  const depthProgress = Math.min(
    1,
    (1 - frontness) / (1 - outerFrontness),
  );
  const seamStart = Math.max(0, count / 2 - 0.5);
  const wrapFade =
    absolutePhase <= seamStart
      ? 1
      : Math.max(0, 1 - (absolutePhase - seamStart) * 2);
  const scale = FIGMA_MIN_SCALE + FIGMA_SCALE_RANGE * frontness;
  const brightness =
    TURNTABLE.unselectedBrightness +
    (activeBrightness - TURNTABLE.unselectedBrightness) * frontness;
  const horizontalOffset = Math.sin(slotAngle) * modelSpread;

  return {
    activeLight: Math.pow(frontness, 8) * wrapFade,
    bottomPercent: modelBottom + depthProgress * modelDepth,
    brightness,
    frontness,
    heightPercent: modelSize * scale,
    leftPercent: 50 + modelOffsetX + Math.sign(phase) * horizontalOffset,
    shadowOpacity: (0.12 + 0.14 * frontness) * wrapFade,
    shadowWidth: 8 + 4 * frontness,
    wrapFade,
    zIndex: Math.round((count / 2 - absolutePhase) * 10) + 4,
  };
}

function percent(value: number): string {
  return `${value.toFixed(4)}%`;
}

function modelFilter(layout: SlotLayout): string {
  return `brightness(${layout.brightness.toFixed(4)}) drop-shadow(0 0 ${(layout.activeLight * 1.15).toFixed(4)}vw rgba(255,255,255,${(layout.activeLight * 0.72).toFixed(4)}))`;
}

/* ─── Types ─── */

interface ModelCarouselProps {
  images: string[];
  rotationRef: React.RefObject<number>;
  selectedIndex?: number;
  modelBottom: number;
  modelSpread: number;
  modelSize: number;
  modelDepth?: number;
  modelOffsetX?: number;
  activeBrightness?: number;
}

/* ─── Component ─── */

export function ModelCarousel({
  images,
  rotationRef,
  selectedIndex = 0,
  modelBottom,
  modelSpread,
  modelSize,
  modelDepth = 3,
  modelOffsetX = 0,
  activeBrightness = 1,
}: ModelCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const count = images.length;
  const initialLayouts = images.map((_, index) =>
    getSlotLayout(
      wrapSlotPhase(index - selectedIndex, count),
      count,
      modelBottom,
      modelSpread,
      modelSize,
      modelDepth,
      modelOffsetX,
      activeBrightness,
    ),
  );

  // rAF loop — reads rotationRef and updates DOM directly, zero re-renders.
  useEffect(() => {
    let rafId: number;

    const update = () => {
      const rotation = rotationRef.current ?? 0;
      const container = containerRef.current;
      const shadowContainer = shadowRef.current;
      const spotlightContainer = spotlightRef.current;
      if (!container) { rafId = requestAnimationFrame(update); return; }
      if (count === 0) { rafId = requestAnimationFrame(update); return; }

      const children = container.children as HTMLCollectionOf<HTMLElement>;
      const shadows = shadowContainer?.children as HTMLCollectionOf<HTMLElement> | undefined;
      const spotlights = spotlightContainer?.children as
        | HTMLCollectionOf<HTMLElement>
        | undefined;
      const turntableStep = TWO_PI / count;
      const rotationInSlots = rotation / turntableStep;

      for (let i = 0; i < count && i < children.length; i++) {
        const hasImage = Boolean(images[i]);
        const phase = wrapSlotPhase(i + rotationInSlots, count);
        const layout = getSlotLayout(
          phase,
          count,
          modelBottom,
          modelSpread,
          modelSize,
          modelDepth,
          modelOffsetX,
          activeBrightness,
        );

        const el = children[i];
        el.style.opacity         = hasImage ? `${layout.wrapFade}` : "0";
        el.style.filter          = modelFilter(layout);
        el.style.left            = `${layout.leftPercent}%`;
        el.style.bottom          = `${layout.bottomPercent}%`;
        el.style.height          = `${layout.heightPercent}%`;
        el.style.transform       = "translateX(-50%)";
        el.style.zIndex          = `${layout.zIndex}`;

        // Contact shadow at model feet
        if (shadows && i < shadows.length) {
          const sh = shadows[i];
          sh.style.left       = `${layout.leftPercent}%`;
          sh.style.bottom     = `${layout.bottomPercent - 0.8}%`;
          sh.style.width      = `${layout.shadowWidth}%`;
          sh.style.height     = `${layout.shadowWidth * 0.25}%`;
          sh.style.opacity    = hasImage ? `${layout.shadowOpacity}` : "0";
          sh.style.transform  = "translateX(-50%)";
          sh.style.zIndex     = "3";
        }

        if (spotlights && i < spotlights.length) {
          const spotlight = spotlights[i];
          spotlight.style.left = `${layout.leftPercent}%`;
          spotlight.style.bottom = `${layout.bottomPercent - 2}%`;
          spotlight.style.width = `${layout.heightPercent * 0.82}%`;
          spotlight.style.height = `${layout.heightPercent * 1.2}%`;
          spotlight.style.opacity = hasImage ? `${layout.activeLight * 0.9}` : "0";
          spotlight.style.transform = "translateX(-50%)";
        }
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [
    rotationRef,
    count,
    images,
    modelBottom,
    modelSpread,
    modelSize,
    modelDepth,
    modelOffsetX,
    activeBrightness,
  ]);

  return (
    <>
      {/* A focused light follows the model moving into the center slot. */}
      <div ref={spotlightRef} className="pointer-events-none">
        {images.map((src, i) => {
          const layout = initialLayouts[i];
          return (
            <div
              key={`spotlight-${i}`}
              className="absolute z-[4] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_78%,rgba(255,255,255,0.95)_0%,rgba(241,237,255,0.48)_38%,transparent_72%)] blur-[0.24vw]"
              style={{
                bottom: percent(layout.bottomPercent - 2),
                height: percent(layout.heightPercent * 1.2),
                left: percent(layout.leftPercent),
                mixBlendMode: "screen",
                opacity: src ? (layout.activeLight * 0.9).toFixed(4) : "0",
                transform: "translateX(-50%)",
                transformOrigin: "bottom center",
                width: percent(layout.heightPercent * 0.82),
                willChange: "transform, left, bottom, width, height, opacity",
              }}
            />
          );
        })}
      </div>

      {/* Contact shadows layer */}
      <div ref={shadowRef} className="pointer-events-none">
        {images.map((src, i) => {
          const layout = initialLayouts[i];
          return (
            <div
              key={`shadow-${i}`}
              className="absolute rounded-[50%]"
              style={{
                background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)",
                bottom: percent(layout.bottomPercent - 0.8),
                height: percent(layout.shadowWidth * 0.25),
                left: percent(layout.leftPercent),
                opacity: src ? layout.shadowOpacity.toFixed(4) : "0",
                transform: "translateX(-50%)",
                width: percent(layout.shadowWidth),
                willChange: "transform, left, bottom, opacity",
                zIndex: 3,
              }}
            />
          );
        })}
      </div>

      {/* Model images */}
      <div ref={containerRef}>
        {images.map((src, i) => {
          const layout = initialLayouts[i];

          return (
            <div
              key={i}
              className="absolute"
              style={{
                aspectRatio: "1497 / 2160",
                bottom: percent(layout.bottomPercent),
                filter: modelFilter(layout),
                height: percent(layout.heightPercent),
                left: percent(layout.leftPercent),
                opacity: src ? layout.wrapFade.toFixed(4) : "0",
                transform: "translateX(-50%)",
                transformOrigin: "bottom center",
                willChange: "transform, filter, left, bottom",
                zIndex: layout.zIndex,
              }}
            >
              <AnimatePresence initial={false}>
                {src && (
                  <motion.img
                    key={src}
                    src={src}
                    alt={`Style model ${i + 1}`}
                    className="absolute inset-0 h-full w-full max-w-none object-contain"
                    decoding="async"
                    draggable={false}
                    fetchPriority={i === selectedIndex ? "high" : "auto"}
                    loading="eager"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </>
  );
}
