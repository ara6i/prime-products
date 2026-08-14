"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowsLeftRight,
  HandGrabbing,
} from "@phosphor-icons/react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import styles from "./influencerLanding.module.css";
import { useCreatorLanguage } from "../../i18n/CreatorLanguageProvider";

const TWO_PI = Math.PI * 2;
const MODEL_COUNT = 5;
const TURNTABLE = {
  friction: 0.93,
  snapThreshold: 0.002,
  snapStiffness: 0.12,
  dragSensitivity: 0.01,
  unselectedBrightness: 0.55,
} as const;

const MODEL_IMAGES = [
  "/media/partner-landing/optimized/turntable/creator-longhair-outfit-1.webp",
  "/media/partner-landing/optimized/turntable/creator-longhair-outfit-2.webp",
  "/media/partner-landing/optimized/turntable/creator-longhair-outfit-3.webp",
  "/media/partner-landing/optimized/turntable/creator-longhair-outfit-4.webp",
  "/media/partner-landing/optimized/turntable/creator-longhair-outfit-5.webp",
] as const;

interface PlatformTuning {
  discBottom: number;
  discPerspective: number;
  discScale: number;
  discTilt: number;
  centerBrightness: number;
  modelOffsetX: number;
  modelOffsetY: number;
  modelScale: number;
  modelSpacing: number;
}

const PLATFORM_TUNING: PlatformTuning = {
  discBottom: -0.5,
  discPerspective: 90,
  discScale: 106,
  discTilt: 18,
  centerBrightness: 97,
  modelOffsetX: 0,
  modelOffsetY: -5,
  modelScale: 115,
  modelSpacing: 103,
};

function getAngleForIndex(index: number): number {
  return -index * (TWO_PI / MODEL_COUNT);
}

function getNearestIndex(rotation: number): number {
  const step = TWO_PI / MODEL_COUNT;
  const normalized = (((-rotation) % TWO_PI) + TWO_PI) % TWO_PI;
  return Math.round(normalized / step) % MODEL_COUNT;
}

function shortestPath(current: number, target: number): number {
  let difference = target - current;
  difference = ((difference + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
  return current + difference;
}

function useTurntableRotation(selectedIndex: number, onIndexChange: (index: number) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const rotationRef = useRef(getAngleForIndex(selectedIndex));
  const velocityRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const animationFrameRef = useRef(0);
  const lastReportedIndexRef = useRef(selectedIndex);
  const onIndexChangeRef = useRef(onIndexChange);

  useEffect(() => {
    onIndexChangeRef.current = onIndexChange;
  }, [onIndexChange]);

  const cancelAnimation = useCallback(() => {
    if (!animationFrameRef.current) return;
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = 0;
  }, []);

  const snapToAngle = useCallback((targetAngle: number, targetIndex: number) => {
    cancelAnimation();

    const animate = () => {
      const current = rotationRef.current;
      const difference = targetAngle - current;

      if (Math.abs(difference) < 0.001) {
        rotationRef.current = targetAngle;
        lastReportedIndexRef.current = targetIndex;
        queueMicrotask(() => onIndexChangeRef.current(targetIndex));
        return;
      }

      rotationRef.current = current + difference * TURNTABLE.snapStiffness;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [cancelAnimation]);

  const startInertia = useCallback(() => {
    cancelAnimation();

    const animate = () => {
      velocityRef.current *= TURNTABLE.friction;
      rotationRef.current += velocityRef.current;

      if (Math.abs(velocityRef.current) < TURNTABLE.snapThreshold) {
        const nearestIndex = getNearestIndex(rotationRef.current);
        const target = shortestPath(rotationRef.current, getAngleForIndex(nearestIndex));
        snapToAngle(target, nearestIndex);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [cancelAnimation, snapToAngle]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    cancelAnimation();
    isDraggingRef.current = true;
    setIsDragging(true);
    lastPointerXRef.current = event.clientX;
    velocityRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [cancelAnimation]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = event.clientX - lastPointerXRef.current;
    lastPointerXRef.current = event.clientX;
    const deltaRotation = deltaX * TURNTABLE.dragSensitivity;
    velocityRef.current = 0.7 * velocityRef.current + 0.3 * deltaRotation;
    rotationRef.current += deltaRotation;
  }, []);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    startInertia();
  }, [startInertia]);

  useEffect(() => {
    if (selectedIndex !== lastReportedIndexRef.current && !isDraggingRef.current) {
      const target = shortestPath(rotationRef.current, getAngleForIndex(selectedIndex));
      snapToAngle(target, selectedIndex);
    }
    lastReportedIndexRef.current = selectedIndex;
  }, [selectedIndex, snapToAngle]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  return {
    rotationRef,
    isDragging,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}

const SCREW_MARKERS = Array.from({ length: 12 }, (_, index) => {
  const angle = (index / 12) * TWO_PI;
  return {
    left: `${(50 + Math.cos(angle) * 45).toFixed(4)}%`,
    top: `${(50 + Math.sin(angle) * 43).toFixed(4)}%`,
  };
});

/** Exact AI Stylist disc shell and rotating brushed-metal surface. */
function StylistDisc({
  rotationRef,
  tuning,
}: {
  rotationRef: RefObject<number>;
  tuning: PlatformTuning;
}) {
  const rotatingTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrame = 0;

    const update = () => {
      if (rotatingTopRef.current) {
        const degrees = (rotationRef.current * 180) / Math.PI;
        rotatingTopRef.current.style.transform =
          `translate(-50%, -50%) scaleY(0.27) rotate(${degrees}deg)`;
      }
      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [rotationRef]);

  return (
    <div
      className={styles.turntableDisc}
      aria-hidden
      style={{
        bottom: `${22.8 + tuning.discBottom}%`,
        transform: `translateX(-50%) perspective(900px) rotateX(${tuning.discTilt}deg) scale(${tuning.discScale / 100}) scaleY(${tuning.discPerspective / 100})`,
      }}
    >
      <Image
        src="/media/partner-landing/optimized/turntable/platform-disc-tight.webp"
        alt=""
        width={832}
        height={299}
        className={styles.turntableDiscShell}
        draggable={false}
      />

      <div ref={rotatingTopRef} className={styles.turntableDiscTop}>
        <Image
          src="/media/partner-landing/optimized/turntable/disc-top-texture.webp"
          alt=""
          width={413}
          height={604}
          className={styles.turntableDiscTexture}
          draggable={false}
        />
        {SCREW_MARKERS.map((marker, index) => (
          <span
            key={index}
            className={styles.turntableDiscMarker}
            style={{ left: marker.left, top: marker.top }}
          />
        ))}
      </div>

      <div className={styles.turntableDiscFrontRim}>
        <Image
          src="/media/partner-landing/optimized/turntable/platform-disc-tight.webp"
          alt=""
          width={832}
          height={299}
          draggable={false}
        />
      </div>
    </div>
  );
}

const FIGMA_SLOT_ARC = Math.PI / 5;
const FIGMA_MIN_SCALE = 0.65;
const FIGMA_SCALE_RANGE = 0.35;
const BASE_MODEL_BOTTOM = 35;
const BASE_MODEL_SIZE = 53;
const BASE_MODEL_SPREAD = 30;
const MODEL_DEPTH = 4.5;

function wrapSlotPhase(phase: number): number {
  const half = MODEL_COUNT / 2;
  return ((phase + half) % MODEL_COUNT + MODEL_COUNT) % MODEL_COUNT - half;
}

function ModelCarousel({
  rotationRef,
  tuning,
}: {
  rotationRef: RefObject<number>;
  tuning: PlatformTuning;
}) {
  const { t } = useCreatorLanguage();
  const modelContainerRef = useRef<HTMLDivElement>(null);
  const shadowContainerRef = useRef<HTMLDivElement>(null);
  const spotlightContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrame = 0;

    const update = () => {
      const modelContainer = modelContainerRef.current;
      if (!modelContainer) {
        animationFrame = requestAnimationFrame(update);
        return;
      }

      const models = modelContainer.children as HTMLCollectionOf<HTMLElement>;
      const shadows = shadowContainerRef.current?.children as HTMLCollectionOf<HTMLElement> | undefined;
      const spotlights = spotlightContainerRef.current?.children as HTMLCollectionOf<HTMLElement> | undefined;
      const rotationInSlots = rotationRef.current / (TWO_PI / MODEL_COUNT);
      const outerFrontness = Math.cos(FIGMA_SLOT_ARC * 2);
      const modelBottom = BASE_MODEL_BOTTOM + tuning.modelOffsetY;
      const modelSize = BASE_MODEL_SIZE * (tuning.modelScale / 100);
      const modelSpread = BASE_MODEL_SPREAD * (tuning.modelSpacing / 100);
      const activeBrightness = tuning.centerBrightness / 100;

      for (let index = 0; index < MODEL_COUNT; index += 1) {
        const phase = wrapSlotPhase(index + rotationInSlots);
        const absolutePhase = Math.abs(phase);
        const slotAngle = Math.min(absolutePhase, MODEL_COUNT / 2) * FIGMA_SLOT_ARC;
        const frontness = Math.max(0, Math.cos(slotAngle));
        const depthProgress = Math.min(1, (1 - frontness) / (1 - outerFrontness));
        const seamStart = Math.max(0, MODEL_COUNT / 2 - 0.5);
        const wrapFade = absolutePhase <= seamStart
          ? 1
          : Math.max(0, 1 - (absolutePhase - seamStart) * 2);
        const scale = FIGMA_MIN_SCALE + FIGMA_SCALE_RANGE * frontness;
        const brightness = TURNTABLE.unselectedBrightness + (activeBrightness - TURNTABLE.unselectedBrightness) * frontness;
        const activeLight = Math.pow(frontness, 8) * wrapFade;
        const horizontalOffset = Math.sin(slotAngle) * modelSpread;
        const leftPercent = 50 + tuning.modelOffsetX + Math.sign(phase) * horizontalOffset;
        const bottomPercent = modelBottom + depthProgress * MODEL_DEPTH;
        const heightPercent = modelSize * scale;
        const zIndex = Math.round((MODEL_COUNT / 2 - absolutePhase) * 10) + 4;

        const model = models[index];
        model.style.opacity = `${wrapFade}`;
        model.style.filter = `brightness(${brightness}) drop-shadow(0 0 ${activeLight * 1.15}vw rgba(255,255,255,${activeLight * 0.72}))`;
        model.style.left = `${leftPercent}%`;
        model.style.bottom = `${bottomPercent}%`;
        model.style.height = `${heightPercent}%`;
        model.style.transform = "translateX(-50%)";
        model.style.zIndex = `${zIndex}`;

        if (shadows?.[index]) {
          const shadow = shadows[index];
          const shadowWidth = 8 + 4 * frontness;
          shadow.style.left = `${leftPercent}%`;
          shadow.style.bottom = `${bottomPercent - 0.8}%`;
          shadow.style.width = `${shadowWidth}%`;
          shadow.style.height = `${shadowWidth * 0.25}%`;
          shadow.style.opacity = `${(0.12 + 0.14 * frontness) * wrapFade}`;
          shadow.style.transform = "translateX(-50%)";
        }

        if (spotlights?.[index]) {
          const spotlight = spotlights[index];
          spotlight.style.left = `${leftPercent}%`;
          spotlight.style.bottom = `${bottomPercent - 2}%`;
          spotlight.style.width = `${heightPercent * 0.82}%`;
          spotlight.style.height = `${heightPercent * 1.2}%`;
          spotlight.style.opacity = `${activeLight * 0.9}`;
          spotlight.style.transform = "translateX(-50%)";
        }
      }

      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [rotationRef, tuning]);

  return (
    <>
      <div ref={spotlightContainerRef} className={styles.turntableSpotlights} aria-hidden>
        {MODEL_IMAGES.map((source) => <span key={`${source}-spotlight`} />)}
      </div>
      <div ref={shadowContainerRef} className={styles.turntableShadows} aria-hidden>
        {MODEL_IMAGES.map((source) => <span key={`${source}-shadow`} />)}
      </div>
      <div ref={modelContainerRef} className={styles.turntableModels}>
        {MODEL_IMAGES.map((source, index) => (
          <span key={source}>
            <Image
              src={source}
              alt={t("AI Stylist outfit model {number}", { number: index + 1 })}
              width={1497}
              height={2160}
              draggable={false}
            />
          </span>
        ))}
      </div>
    </>
  );
}

export function InfluencerTurntable() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { rotationRef, isDragging, pointerHandlers } = useTurntableRotation(selectedIndex, setSelectedIndex);
  const { t } = useCreatorLanguage();

  const navigate = useCallback((direction: -1 | 1) => {
    setSelectedIndex((current) => (current + direction + MODEL_COUNT) % MODEL_COUNT);
  }, []);

  return (
    <div className={styles.turntableScene} data-dragging={isDragging}>
      <StylistDisc rotationRef={rotationRef} tuning={PLATFORM_TUNING} />
      <ModelCarousel rotationRef={rotationRef} tuning={PLATFORM_TUNING} />

      <div
        className={styles.turntableDragSurface}
        aria-label={t("Drag left or right to rotate the MyAIFitting styling platform")}
        role="slider"
        aria-valuemin={1}
        aria-valuemax={MODEL_COUNT}
        aria-valuenow={selectedIndex + 1}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") navigate(-1);
          if (event.key === "ArrowRight") navigate(1);
        }}
        onPointerDown={pointerHandlers.onPointerDown}
        onPointerMove={pointerHandlers.onPointerMove}
        onPointerUp={pointerHandlers.onPointerUp}
        onPointerCancel={pointerHandlers.onPointerUp}
      />

      <div className={styles.turntableMoveHint} aria-hidden>
        <HandGrabbing size={15} weight="fill" />
        <span>{t("Drag to rotate")}</span>
        <ArrowsLeftRight size={17} weight="bold" />
      </div>

      <div className={styles.turntableControls} aria-label={t("Platform rotation controls")}>
        <button type="button" aria-label={t("Rotate platform left")} onClick={() => navigate(-1)}>
          <ArrowCounterClockwise size={17} weight="bold" />
        </button>
        <span><strong>{selectedIndex + 1}</strong> {t("of")} {MODEL_COUNT}</span>
        <button type="button" aria-label={t("Rotate platform right")} onClick={() => navigate(1)}>
          <ArrowClockwise size={17} weight="bold" />
        </button>
      </div>
    </div>
  );
}
