"use client";

import { useEffect, useRef, useState } from "react";

/**
 * High-frequency stopwatch driven by requestAnimationFrame for smooth,
 * tear-free updates of the millisecond display. Caller starts and stops it
 * imperatively; the returned `elapsedMs` ticks at ~60 fps while running.
 */
export function useStopwatch(): {
  elapsedMs: number;
  isRunning: boolean;
  start: () => number;
  stop: () => number;
  reset: () => void;
} {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      if (startedAtRef.current != null) {
        setElapsedMs(performance.now() - startedAtRef.current);
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [isRunning]);

  function start(): number {
    const now = performance.now();
    startedAtRef.current = now;
    setElapsedMs(0);
    setIsRunning(true);
    return now;
  }

  function stop(): number {
    const startedAt = startedAtRef.current ?? performance.now();
    const final = performance.now() - startedAt;
    setElapsedMs(final);
    setIsRunning(false);
    return final;
  }

  function reset(): void {
    startedAtRef.current = null;
    setElapsedMs(0);
    setIsRunning(false);
  }

  return { elapsedMs, isRunning, start, stop, reset };
}

export function formatElapsed(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
