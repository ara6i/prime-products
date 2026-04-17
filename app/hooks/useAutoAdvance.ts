"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoAdvanceOptions {
  count: number;
  intervalMs?: number;
}

export function useAutoAdvance({ count, intervalMs = 5000 }: UseAutoAdvanceOptions) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !inView || count <= 1) return;

    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const elapsed = t - startRef.current;
      const ratio = Math.min(elapsed / intervalMs, 1);
      setProgress(ratio);
      if (ratio >= 1) {
        startRef.current = t;
        setStep((prev) => (prev + 1) % count);
        setProgress(0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [paused, inView, count, intervalMs]);

  const jumpToStep = useCallback((i: number) => {
    setPaused(true);
    setStep(i);
    setProgress(0);
    startRef.current = null;
  }, []);

  return { step, progress, jumpToStep, paused, containerRef };
}
