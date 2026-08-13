"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TURNTABLE } from "@/app/ai-stylist/utils/turntable-config";

const TWO_PI = 2 * Math.PI;

function getAngleForIndex(index: number, count: number): number {
  return -index * (TWO_PI / count);
}

function getNearestIndex(rotation: number, count: number): number {
  const step = TWO_PI / count;
  const normalized = (((-rotation) % TWO_PI) + TWO_PI) % TWO_PI;
  return Math.round(normalized / step) % count;
}

function shortestPath(current: number, target: number): number {
  let diff = target - current;
  diff = ((diff + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
  return current + diff;
}

interface UseTurntableRotationOptions {
  modelCount: number;
  selectedIndex: number;
  onIndexChange: (index: number) => void;
}

export function useTurntableRotation({
  modelCount,
  selectedIndex,
  onIndexChange,
}: UseTurntableRotationOptions) {
  const [isDragging, setIsDragging] = useState(false);

  // rotationRef is the source of truth — updated every frame.
  // NO React state for rotation during animation = zero re-renders.
  const rotationRef = useRef(getAngleForIndex(selectedIndex, modelCount));

  const velocityRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const lastReportedIndexRef = useRef(selectedIndex);
  const onIndexChangeRef = useRef(onIndexChange);

  useEffect(() => {
    onIndexChangeRef.current = onIndexChange;
  }, [onIndexChange]);

  const cancelAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  const snapToAngle = useCallback(
    (targetAngle: number, targetIndex: number) => {
      cancelAnimation();

      const animate = () => {
        const current = rotationRef.current;
        const diff = targetAngle - current;

        if (Math.abs(diff) < 0.001) {
          // Snap complete — sync ref to final value
          rotationRef.current = targetAngle;
          lastReportedIndexRef.current = targetIndex;
          queueMicrotask(() => onIndexChangeRef.current(targetIndex));
          return;
        }

        // Only update the ref — no setRotation, no React re-render
        rotationRef.current = current + diff * TURNTABLE.snapStiffness;
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    },
    [cancelAnimation]
  );

  const startInertia = useCallback(() => {
    cancelAnimation();

    const animate = () => {
      velocityRef.current *= TURNTABLE.friction;
      // Only update the ref — no React re-render
      rotationRef.current = rotationRef.current + velocityRef.current;

      if (Math.abs(velocityRef.current) < TURNTABLE.snapThreshold) {
        const nearestIdx = getNearestIndex(rotationRef.current, modelCount);
        const target = getAngleForIndex(nearestIdx, modelCount);
        const adjusted = shortestPath(rotationRef.current, target);
        snapToAngle(adjusted, nearestIdx);
        return;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [cancelAnimation, modelCount, snapToAngle]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      cancelAnimation();
      isDraggingRef.current = true;
      setIsDragging(true);
      lastPointerXRef.current = e.clientX;
      velocityRef.current = 0;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [cancelAnimation]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;

    const deltaRot = deltaX * TURNTABLE.dragSensitivity;
    velocityRef.current = 0.7 * velocityRef.current + 0.3 * deltaRot;

    // Only update the ref — no React re-render
    rotationRef.current = rotationRef.current + deltaRot;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      startInertia();
    },
    [startInertia]
  );

  // External sync: when selectedIndex changes from outside (nav arrows)
  useEffect(() => {
    if (selectedIndex !== lastReportedIndexRef.current && !isDraggingRef.current) {
      const target = getAngleForIndex(selectedIndex, modelCount);
      const adjusted = shortestPath(rotationRef.current, target);
      snapToAngle(adjusted, selectedIndex);
    }
    lastReportedIndexRef.current = selectedIndex;
  }, [selectedIndex, modelCount, snapToAngle]);

  useEffect(() => {
    return () => cancelAnimation();
  }, [cancelAnimation]);

  return {
    rotationRef,
    isDragging,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
