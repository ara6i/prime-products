"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createTryOnApiClient,
  subscribeToJob,
  TryOnApiError,
  type SubmitTryOnPayload,
  type VtoStreamUpdate,
} from "../lib/tryOnApi";
import { emptyTimings } from "../lib/mappers";
import type { TryOnPhase, TryOnRunInput, TryOnRunResult, TryOnRunTimings } from "../lib/types";

/**
 * Owns the submit → SSE state machine for one try-on run. Surfaces phase,
 * timings, and the final result/error. Resolves the returned promise from
 * `run()` so callers can `await` and chain history bookkeeping.
 */
export function useTryOnSubmission(config: { baseUrl: string; apiKey: string }): {
  phase: TryOnPhase;
  timings: TryOnRunTimings;
  result: TryOnRunResult | null;
  errorMessage: string | null;
  run: (input: TryOnRunInput) => Promise<TryOnRunResult>;
  reset: () => void;
} {
  const [phase, setPhase] = useState<TryOnPhase>("idle");
  const [timings, setTimings] = useState<TryOnRunTimings>(emptyTimings());
  const [result, setResult] = useState<TryOnRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  const reset = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setPhase("idle");
    setTimings(emptyTimings());
    setResult(null);
    setErrorMessage(null);
  }, []);

  const run = useCallback(
    async (input: TryOnRunInput): Promise<TryOnRunResult> => {
      cleanupRef.current?.();
      cleanupRef.current = null;

      setPhase("submitting");
      setTimings(emptyTimings());
      setResult(null);
      setErrorMessage(null);

      const client = createTryOnApiClient(config);
      const submitStartedAt = performance.now();

      const payload: SubmitTryOnPayload = {
        modelImage: input.modelImage,
        garmentImage: input.garmentImage,
      };
      if (input.customPrompt) payload.customPrompt = input.customPrompt;
      if (input.productTitle) payload.productTitle = input.productTitle;
      if (input.productDescription) payload.productDescription = input.productDescription;
      if (input.productMaterial) payload.productMaterial = input.productMaterial;
      if (input.model) payload.model = input.model;

      let ack;
      try {
        ack = await client.submit(payload);
      } catch (err) {
        const message =
          err instanceof TryOnApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Try-on submission failed";
        setPhase("error");
        setErrorMessage(message);
        throw err;
      }

      const ackAt = performance.now();
      const ackMs = ackAt - submitStartedAt;
      setTimings((prev) => ({ ...prev, ackMs }));
      setPhase("queued");

      return new Promise<TryOnRunResult>((resolve, reject) => {
        let settled = false;

        const finishSuccess = (imageUrl: string) => {
          if (settled) return;
          settled = true;
          const completedAt = performance.now();
          const finalTimings: TryOnRunTimings = {
            ackMs,
            generationMs: completedAt - ackAt,
            totalMs: completedAt - submitStartedAt,
          };
          const runResult: TryOnRunResult = { jobId: ack.jobId, imageUrl, timings: finalTimings };
          setTimings(finalTimings);
          setResult(runResult);
          setPhase("done");
          cleanupRef.current?.();
          cleanupRef.current = null;
          resolve(runResult);
        };

        const finishFailure = (message: string) => {
          if (settled) return;
          settled = true;
          setPhase("error");
          setErrorMessage(message);
          cleanupRef.current?.();
          cleanupRef.current = null;
          reject(new Error(message));
        };

        const handleUpdate = (update: VtoStreamUpdate) => {
          if (update.status === "processing") {
            setPhase("generating");
            return;
          }
          if (update.status === "completed" && update.imageUrl) {
            finishSuccess(update.imageUrl);
            return;
          }
          if (update.status === "failed") {
            finishFailure(update.error || "Try-on generation failed");
          }
        };

        const handleStreamError = () => {
          if (settled) return;
          finishFailure(
            "SSE stream lost connection before the result arrived. The job may still complete on the backend — check /api/v1/tryon/status/<jobId>.",
          );
        };

        cleanupRef.current = subscribeToJob(client.streamUrl(), ack.jobId, handleUpdate, handleStreamError);

        // Once subscribed we're definitely waiting for Gemini.
        setPhase("generating");
      });
    },
    [config],
  );

  return { phase, timings, result, errorMessage, run, reset };
}
