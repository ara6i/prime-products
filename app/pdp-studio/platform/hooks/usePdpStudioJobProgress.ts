"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PdpStudioJob } from "../types/pdpStudioPlatform";
import {
  getPdpStudioJob,
  subscribePdpStudioJob,
} from "../services/pdpStudioJobService";

const TERMINAL = new Set<PdpStudioJob["status"]>([
  "succeeded",
  "failed",
  "cancelled",
]);

function isTerminal(status: PdpStudioJob["status"]): boolean {
  return TERMINAL.has(status);
}

export function isPdpStudioTerminalJobStatus(
  status: PdpStudioJob["status"],
): boolean {
  return isTerminal(status);
}

export function usePdpStudioJobProgress() {
  const [job, setJobState] = useState<PdpStudioJob | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pollingRef = useRef<number | null>(null);
  const jobCreatedAt = job?.createdAt ?? null;
  const jobCompletedAt = job?.completedAt ?? null;
  const jobStatus = job?.status ?? null;

  const setJob = useCallback((nextJob: PdpStudioJob | null) => {
    setJobState(nextJob);
    if (!nextJob) setElapsedSeconds(0);
  }, []);

  const stop = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!jobCreatedAt || !jobStatus) return;

    const startedAt = Date.parse(jobCreatedAt);
    if (!Number.isFinite(startedAt)) return;

    const updateElapsedSeconds = () => {
      const completedAt = jobCompletedAt
        ? Date.parse(jobCompletedAt)
        : Date.now();
      const endTime = Number.isFinite(completedAt) ? completedAt : Date.now();
      setElapsedSeconds(
        Math.max(0, Math.floor((endTime - startedAt) / 1_000)),
      );
    };

    const initialUpdate = window.setTimeout(updateElapsedSeconds, 0);
    if (isTerminal(jobStatus)) {
      return () => window.clearTimeout(initialUpdate);
    }

    const interval = window.setInterval(updateElapsedSeconds, 1_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [jobCompletedAt, jobCreatedAt, jobStatus]);

  const watch = useCallback(
    (initialJob: PdpStudioJob) => {
      stop();
      setJob(initialJob);
      if (isTerminal(initialJob.status)) return;

      const accept = (next: PdpStudioJob) => {
        setJob(next);
        if (isTerminal(next.status)) stop();
      };
      const beginPolling = () => {
        if (pollingRef.current) return;
        const poll = () => {
          void getPdpStudioJob(initialJob.id)
            .then(accept)
            .catch(() => undefined);
        };
        poll();
        pollingRef.current = window.setInterval(poll, 2_000);
      };
      cleanupRef.current = subscribePdpStudioJob(
        initialJob.id,
        accept,
        beginPolling,
      );
    },
    [setJob, stop],
  );

  return { job, elapsedSeconds, setJob, watch, stop };
}
