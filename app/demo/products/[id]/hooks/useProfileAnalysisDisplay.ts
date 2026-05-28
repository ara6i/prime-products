import { useEffect, useRef, useState } from "react";

const MIN_ANALYSIS_MS = 6000;

const ANALYSIS_MESSAGES = [
  "Reading your profile...",
  "Matching your measurements...",
  "Checking the size guide...",
  "Comparing fit sections...",
  "Applying your best size...",
  "Finalizing recommendation...",
];

interface ProfileAnalysisDisplayInput {
  loading: boolean;
  hasResult: boolean;
  resetKey: string;
}

export function useProfileAnalysisDisplay({ loading, hasResult, resetKey }: ProfileAnalysisDisplayInput) {
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const prevLoadingRef = useRef(loading);
  const prevResultRef = useRef(hasResult);

  const restart = () => {
    setStartedAt(Date.now());
    setElapsedMs(0);
  };

  useEffect(() => {
    restart();
  }, [resetKey]);

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    const hadResult = prevResultRef.current;

    if ((loading && !wasLoading) || (hasResult && !hadResult && !wasLoading)) {
      restart();
    }

    prevLoadingRef.current = loading;
    prevResultRef.current = hasResult;
  }, [loading, hasResult]);

  useEffect(() => {
    if (!loading && !hasResult) return;

    const updateElapsed = () => setElapsedMs(Date.now() - startedAt);
    updateElapsed();
    const id = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(id);
  }, [loading, hasResult, startedAt]);

  const showAnalyzing = (loading || hasResult) && (loading || elapsedMs < MIN_ANALYSIS_MS);
  const messageIndex = Math.min(Math.floor(elapsedMs / 1000), ANALYSIS_MESSAGES.length - 1);

  return {
    showAnalyzing,
    showComplete: hasResult && !showAnalyzing,
    message: ANALYSIS_MESSAGES[messageIndex],
  };
}
