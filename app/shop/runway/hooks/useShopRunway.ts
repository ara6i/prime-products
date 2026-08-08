"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shopRunwayLooks } from "../data/shopRunway.data";
import { mapShopRunwayLook } from "../mappers/shopRunway.mapper";

export type RunwayMotionDirection = -1 | 0 | 1;

const SETTLE_DURATION = 620;
const AUTO_ADVANCE_DELAY = 4600;
const DRAG_COMMIT_PROGRESS = 0.16;

function clampProgress(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function useShopRunway() {
  const looks = useMemo(() => shopRunwayLooks.map(mapShopRunwayLook), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [motionDirection, setMotionDirectionState] =
    useState<RunwayMotionDirection>(0);
  const [motionProgress, setMotionProgressState] = useState(0);
  const [isDragging, setIsDraggingState] = useState(false);
  const [isAnimating, setIsAnimatingState] = useState(false);

  const dragStartRef = useRef(0);
  const dragDistanceRef = useRef(240);
  const motionDirectionRef = useRef<RunwayMotionDirection>(0);
  const motionProgressRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const setMotionDirection = useCallback((direction: RunwayMotionDirection) => {
    motionDirectionRef.current = direction;
    setMotionDirectionState(direction);
  }, []);

  const setMotionProgress = useCallback((progress: number) => {
    const nextProgress = clampProgress(progress);
    motionProgressRef.current = nextProgress;
    setMotionProgressState(nextProgress);
  }, []);

  const setIsDragging = useCallback((dragging: boolean) => {
    isDraggingRef.current = dragging;
    setIsDraggingState(dragging);
  }, []);

  const setIsAnimating = useCallback((animating: boolean) => {
    isAnimatingRef.current = animating;
    setIsAnimatingState(animating);
  }, []);

  const clearMotionTimers = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const finishMotion = useCallback(
    (direction: Exclude<RunwayMotionDirection, 0>, commit: boolean) => {
      if (commit) {
        setActiveIndex(
          (index) => (index + direction + looks.length) % looks.length,
        );
      }
      setMotionProgress(0);
      setMotionDirection(0);
      setIsDragging(false);
      setIsAnimating(false);
      settleTimerRef.current = null;
    },
    [
      looks.length,
      setIsAnimating,
      setIsDragging,
      setMotionDirection,
      setMotionProgress,
    ],
  );

  const settleMotion = useCallback(
    (commit: boolean) => {
      const direction = motionDirectionRef.current;
      if (direction === 0) {
        setIsDragging(false);
        return;
      }

      clearMotionTimers();
      setIsDragging(false);
      setIsAnimating(true);
      setMotionProgress(commit ? 1 : 0);
      settleTimerRef.current = window.setTimeout(
        () => finishMotion(direction, commit),
        SETTLE_DURATION,
      );
    },
    [
      clearMotionTimers,
      finishMotion,
      setIsAnimating,
      setIsDragging,
      setMotionProgress,
    ],
  );

  const startDrag = useCallback(
    (position: number, availableDistance: number) => {
      if (isAnimatingRef.current) return false;
      clearMotionTimers();
      dragStartRef.current = position;
      dragDistanceRef.current = Math.max(availableDistance * 0.42, 96);
      setMotionDirection(0);
      setMotionProgress(0);
      setIsDragging(true);
      return true;
    },
    [clearMotionTimers, setIsDragging, setMotionDirection, setMotionProgress],
  );

  const updateDrag = useCallback(
    (position: number) => {
      if (!isDraggingRef.current) return;
      const delta = position - dragStartRef.current;
      if (Math.abs(delta) < 2) return;
      setMotionDirection(delta > 0 ? 1 : -1);
      setMotionProgress(Math.abs(delta) / dragDistanceRef.current);
    },
    [setMotionDirection, setMotionProgress],
  );

  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    settleMotion(motionProgressRef.current >= DRAG_COMMIT_PROGRESS);
  }, [settleMotion]);

  const cancelDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    settleMotion(false);
  }, [settleMotion]);

  const step = useCallback(
    (direction: 1 | -1) => {
      if (isDraggingRef.current || isAnimatingRef.current) return;
      clearMotionTimers();
      setMotionDirection(direction);
      setMotionProgress(0);
      setIsAnimating(false);

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        setIsAnimating(true);
        setMotionProgress(1);
        settleTimerRef.current = window.setTimeout(
          () => finishMotion(direction, true),
          SETTLE_DURATION,
        );
      });
    },
    [
      clearMotionTimers,
      finishMotion,
      setIsAnimating,
      setMotionDirection,
      setMotionProgress,
    ],
  );

  const selectLook = useCallback(
    (index: number) => {
      const normalizedIndex = (index + looks.length) % looks.length;
      if (normalizedIndex === activeIndex) return;
      const forwardDistance =
        (normalizedIndex - activeIndex + looks.length) % looks.length;
      step(forwardDistance <= looks.length / 2 ? 1 : -1);
    },
    [activeIndex, looks.length, step],
  );

  useEffect(() => {
    if (
      paused ||
      isDragging ||
      isAnimating ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const interval = window.setInterval(() => step(1), AUTO_ADVANCE_DELAY);
    return () => window.clearInterval(interval);
  }, [isAnimating, isDragging, paused, step]);

  useEffect(
    () => () => {
      clearMotionTimers();
    },
    [clearMotionTimers],
  );

  function toggleFavorite(productId: string) {
    setFavoriteIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  const targetIndex =
    motionDirection === 0
      ? activeIndex
      : (activeIndex + motionDirection + looks.length) % looks.length;

  return {
    looks,
    activeIndex,
    activeLook: looks[activeIndex],
    targetIndex,
    targetLook: looks[targetIndex],
    paused,
    favoriteIds,
    motionDirection,
    motionProgress,
    isDragging,
    isAnimating,
    selectLook,
    step,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    setPaused,
    toggleFavorite,
  };
}
