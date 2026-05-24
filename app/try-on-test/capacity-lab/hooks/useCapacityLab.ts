"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_CAPACITY_CONFIG, CAPACITY_SCENARIOS, CAPACITY_TARGETS } from "../lib/config";
import { getScenarioById, getTargetById } from "../mappers/capacityLabMapper";
import {
  cancelCapacityRun,
  getCapacityMetrics,
  getCapacityRunStatus,
  startCapacityRun,
} from "../services/capacityLabService";
import type { CapacityMetricsSnapshot, CapacityRunConfig, CapacityRunSnapshot } from "../types";

function isActiveRun(snapshot: CapacityRunSnapshot | null): boolean {
  return snapshot?.status === "queued" || snapshot?.status === "running";
}

export function useCapacityLab() {
  const [config, setConfig] = useState<CapacityRunConfig>({ ...DEFAULT_CAPACITY_CONFIG });
  const [snapshot, setSnapshot] = useState<CapacityRunSnapshot | null>(null);
  const [metrics, setMetrics] = useState<CapacityMetricsSnapshot | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTarget = useMemo(() => getTargetById(CAPACITY_TARGETS, config.targetId), [config.targetId]);
  const selectedScenario = useMemo(() => getScenarioById(CAPACITY_SCENARIOS, config.scenarioId), [config.scenarioId]);
  const isRunning = isActiveRun(snapshot);
  const activeRunId = snapshot?.runId ?? null;

  const updateConfig = useCallback(<Key extends keyof CapacityRunConfig>(key: Key, value: CapacityRunConfig[Key]) => {
    setConfig((current) => normalizeConfigChange(current, key, value));
  }, []);

  const refreshMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const nextMetrics = await getCapacityMetrics(config.targetId);
      setMetrics(nextMetrics);
    } catch (err) {
      setMetrics(null);
      setError(err instanceof Error ? err.message : "Unable to load host metrics");
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [config.targetId]);

  const startRun = useCallback(async () => {
    setError(null);
    if (!selectedScenario.isGeminiSafe && !config.confirmGemini) {
      const message = "Confirm real Gemini testing before running this scenario.";
      setError(message);
      toast.warning(message);
      return;
    }

    if (selectedTarget.isLive && !config.confirmLive) {
      const message = "Confirm live API testing before running against production.";
      setError(message);
      toast.warning(message);
      return;
    }

    setIsStarting(true);
    try {
      const response = await startCapacityRun(config);
      setSnapshot(response.snapshot);
      toast.success(selectedScenario.isGeminiSafe ? "Capacity check started" : "Real Gemini check started");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start capacity check";
      setError(message);
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  }, [config, selectedScenario.isGeminiSafe, selectedTarget.isLive]);

  const cancelRun = useCallback(async () => {
    if (!activeRunId || !isRunning) return;

    setIsCancelling(true);
    setError(null);
    try {
      const nextSnapshot = await cancelCapacityRun(activeRunId);
      setSnapshot(nextSnapshot);
      toast.success("Capacity check cancelled");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to cancel capacity check";
      setError(message);
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  }, [activeRunId, isRunning]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshMetrics();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshMetrics]);

  useEffect(() => {
    if (!activeRunId || !isRunning) return;

    const intervalId = window.setInterval(async () => {
      try {
        const nextSnapshot = await getCapacityRunStatus(activeRunId);
        setSnapshot(nextSnapshot);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to refresh run status");
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeRunId, isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      void refreshMetrics();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, refreshMetrics]);

  return {
    config,
    updateConfig,
    targets: CAPACITY_TARGETS,
    scenarios: CAPACITY_SCENARIOS,
    selectedTarget,
    selectedScenario,
    snapshot,
    metrics,
    isRunning,
    isStarting,
    isCancelling,
    isLoadingMetrics,
    error,
    startRun,
    cancelRun,
    refreshMetrics,
  };
}

function normalizeConfigChange<Key extends keyof CapacityRunConfig>(
  current: CapacityRunConfig,
  key: Key,
  value: CapacityRunConfig[Key],
): CapacityRunConfig {
  const next = { ...current, [key]: value } as CapacityRunConfig;
  const scenario = getScenarioById(CAPACITY_SCENARIOS, next.scenarioId);
  if (!scenario.isGeminiSafe) {
    next.targetId = "test";
    next.confirmLive = false;
  }
  const scenarioChanged = key === "scenarioId";
  const requestedUsers = scenarioChanged
    ? (scenario.isGeminiSafe ? 25 : Math.min(10, scenario.maxVirtualUsers))
    : Number(next.virtualUsers) || 1;
  const requestedTotal = scenarioChanged
    ? (scenario.isGeminiSafe ? 500 : requestedUsers)
    : key === "virtualUsers"
      ? Math.max(Number(next.totalRequests) || 1, requestedUsers)
      : next.totalRequests;
  const totalRequests = Math.min(requestedTotal, scenario.maxTotalRequests);
  const virtualUsers = Math.min(requestedUsers, scenario.maxVirtualUsers, totalRequests);
  const timeoutMs = scenario.isGeminiSafe
    ? Math.min(next.timeoutMs, 60000)
    : Math.max(next.timeoutMs, 120000);

  return {
    ...next,
    totalRequests,
    virtualUsers,
    timeoutMs,
    confirmGemini: scenario.isGeminiSafe ? false : next.confirmGemini,
  };
}
