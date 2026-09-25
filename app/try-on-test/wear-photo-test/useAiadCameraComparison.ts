"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FreshGeometryPrediction } from "./freshGeometryTypes";
import { aiadLinesKey, type AiadCameraCache, type AiadCameraMode, type AiadLineMap } from "./aiadWorkbenchGeometry";

export type AiadCalibrateLines = (mode: Exclude<AiadCameraMode, "raw">, lines: AiadLineMap) => Promise<FreshGeometryPrediction>;
type CameraJob = { id: number; mode: Exclude<AiadCameraMode, "raw">; lines: AiadLineMap };

/** One worker request at a time; rapid edits replace the pending job. */
export function useAiadCameraComparison(calibrate: AiadCalibrateLines) {
  const [cache, setCache] = useState<AiadCameraCache>({});
  const [busyMode, setBusyMode] = useState<AiadCameraMode | null>(null);
  const [errors, setErrors] = useState<Partial<Record<AiadCameraMode, string>>>({});
  const callbackRef = useRef(calibrate);
  const cacheRef = useRef<AiadCameraCache>({});
  const pendingRef = useRef<CameraJob | null>(null);
  const runningRef = useRef(false);
  const revisionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { callbackRef.current = calibrate; }, [calibrate]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      revisionRef.current += 1;
      pendingRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const drain = useCallback(async () => {
    if (runningRef.current || !mountedRef.current) return;
    runningRef.current = true;
    try {
      while (pendingRef.current && mountedRef.current) {
        const job = pendingRef.current;
        pendingRef.current = null;
        setBusyMode(job.mode);
        try {
          const prediction = await callbackRef.current(job.mode, job.lines);
          // A response for an older drag or mode must never overwrite the
          // latest edit. The next queued request uses the newest endpoints.
          if (mountedRef.current && job.id === revisionRef.current) {
            const snapshot = { lines: job.lines, prediction };
            const next = { ...cacheRef.current, [job.mode]: snapshot };
            // A Depth Pro response also contains the Apple-only comparison.
            if (job.mode === "apple-depth") next.apple = snapshot;
            cacheRef.current = next;
            setCache(next);
            setErrors((current) => ({ ...current, [job.mode]: undefined }));
          }
        } catch (error) {
          if (mountedRef.current && job.id === revisionRef.current) {
            setErrors((current) => ({ ...current, [job.mode]: error instanceof Error ? error.message : "Camera comparison failed." }));
          }
        }
      }
    } finally {
      runningRef.current = false;
      if (mountedRef.current && !pendingRef.current && !timerRef.current) setBusyMode(null);
    }
  }, []);

  const invalidate = useCallback(() => {
    revisionRef.current += 1;
    pendingRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setBusyMode(null);
  }, []);

  const request = useCallback((mode: AiadCameraMode, lines: AiadLineMap, immediate = false, force = false) => {
    invalidate();
    if (mode === "raw") return;
    const cached = cacheRef.current[mode];
    if (!force && cached && aiadLinesKey(cached.lines) === aiadLinesKey(lines)) return;
    setErrors((current) => ({ ...current, [mode]: undefined }));
    const job: CameraJob = { id: revisionRef.current, mode, lines: structuredClone(lines) };
    setBusyMode(mode);
    const enqueue = () => {
      timerRef.current = null;
      if (!mountedRef.current || job.id !== revisionRef.current) return;
      pendingRef.current = job;
      void drain();
    };
    if (immediate) enqueue();
    else timerRef.current = setTimeout(enqueue, 350);
  }, [drain, invalidate]);

  return { cache, busyMode, errors, request, invalidate };
}
