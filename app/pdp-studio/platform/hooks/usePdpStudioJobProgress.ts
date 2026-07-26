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

export function isPdpStudioTerminalJobStatus(
  status: PdpStudioJob["status"],
): boolean {
  return TERMINAL.has(status);
}

export function usePdpStudioJobProgress() {
  const [job, setJob] = useState<PdpStudioJob | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pollingRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const watch = useCallback(
    (initialJob: PdpStudioJob) => {
      stop();
      setJob(initialJob);
      if (isPdpStudioTerminalJobStatus(initialJob.status)) return;

      const accept = (next: PdpStudioJob) => {
        setJob(next);
        if (isPdpStudioTerminalJobStatus(next.status)) stop();
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
    [stop],
  );

  return { job, setJob, watch, stop };
}
