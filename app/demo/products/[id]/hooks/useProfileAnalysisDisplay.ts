import { useEffect, useRef, useState } from "react";

const MIN_ANALYSIS_MS = 200;
const ANALYSIS_MESSAGE = "Analyzing";

interface ProfileAnalysisDisplayInput {
  loading: boolean;
  hasResult: boolean;
  resetKey: string;
  enabled?: boolean;
}

export function useProfileAnalysisDisplay({ loading, hasResult, resetKey, enabled = true }: ProfileAnalysisDisplayInput) {
  const activeLoading = enabled && loading;
  const activeHasResult = enabled && hasResult;
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const prevLoadingRef = useRef(activeLoading);
  const prevResultRef = useRef(activeHasResult);

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

    if ((activeLoading && !wasLoading) || (activeHasResult && !hadResult && !wasLoading)) {
      restart();
    }

    prevLoadingRef.current = activeLoading;
    prevResultRef.current = activeHasResult;
  }, [activeLoading, activeHasResult]);

  useEffect(() => {
    if (!activeLoading && !activeHasResult) return;

    const updateElapsed = () => setElapsedMs(Date.now() - startedAt);
    updateElapsed();
    const id = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(id);
  }, [activeLoading, activeHasResult, startedAt]);

  const showAnalyzing = (activeLoading || activeHasResult) && (activeLoading || elapsedMs < MIN_ANALYSIS_MS);

  return {
    showAnalyzing,
    showComplete: activeHasResult && !showAnalyzing,
    message: ANALYSIS_MESSAGE,
  };
}
