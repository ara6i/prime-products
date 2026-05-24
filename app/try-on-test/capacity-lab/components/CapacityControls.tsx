import { Button } from "@/app/shared/components/ui/button";
import {
  CAPACITY_REQUEST_PRESETS,
  CAPACITY_USER_PRESETS,
} from "../lib/config";
import { getCapacityTryOnModelEstimate } from "../lib/modelEstimates";
import type { CapacityRunConfig, CapacityScenarioOption, CapacityTargetOption } from "../types";
import { TRY_ON_MODELS, getModelEntry } from "../../lib/models";

interface CapacityControlsProps {
  config: CapacityRunConfig;
  targets: CapacityTargetOption[];
  scenarios: CapacityScenarioOption[];
  isStarting: boolean;
  isRunning: boolean;
  onConfigChange: <Key extends keyof CapacityRunConfig>(key: Key, value: CapacityRunConfig[Key]) => void;
  onStart: () => void;
}

export function CapacityControls({
  config,
  targets,
  scenarios,
  isStarting,
  isRunning,
  onConfigChange,
  onStart,
}: CapacityControlsProps) {
  const selectedTarget = targets.find((target) => target.id === config.targetId) ?? targets[0]!;
  const selectedScenario = scenarios.find((scenario) => scenario.id === config.scenarioId) ?? scenarios[0]!;
  const availableTargets = selectedScenario.isGeminiSafe ? targets : targets.filter((target) => target.id === "test");
  const userPresets = buildPresetValues([...CAPACITY_USER_PRESETS], selectedScenario.maxVirtualUsers);
  const requestPresets = buildPresetValues([...CAPACITY_REQUEST_PRESETS], selectedScenario.maxTotalRequests);
  const estimatedTryOns = config.totalRequests * selectedScenario.estimatedTryOnCallsPerRequest;
  const estimatedSizingCalls = config.totalRequests * selectedScenario.estimatedSizingCallsPerRequest;
  const usesTryOnModel = selectedScenario.estimatedTryOnCallsPerRequest > 0;
  const selectedModel = getModelEntry(config.tryOnModel);
  const selectedModelEstimate = getCapacityTryOnModelEstimate(config.tryOnModel);
  const estimatedTryOnTokens = estimatedTryOns * selectedModelEstimate.tokensPerTryOn;

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Capacity Lab</p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Measure backend readiness before shoppers arrive.</h1>
        <p className="max-w-3xl text-sm leading-6 text-text-secondary">
          Run controlled virtual traffic against local, test, or live backends, then watch response time and host resources
          in one place. The default scenario does not call Gemini, so it is safe for repeated checks.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
          Target backend
          <select
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-blue"
            value={config.targetId}
            disabled={isRunning || isStarting}
            onChange={(event) => onConfigChange("targetId", event.target.value as CapacityRunConfig["targetId"])}
          >
            {availableTargets.map((target) => (
              <option key={target.id} value={target.id}>{target.label}</option>
            ))}
          </select>
          <span className="text-xs font-normal text-text-secondary">
            {selectedScenario.isGeminiSafe ? selectedTarget.description : "Stress tests are locked to the isolated test backend."}
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
          Scenario
          <select
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-blue"
            value={config.scenarioId}
            disabled={isRunning || isStarting}
            onChange={(event) => onConfigChange("scenarioId", event.target.value as CapacityRunConfig["scenarioId"])}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
            ))}
          </select>
          <span className="text-xs font-normal text-text-secondary">{selectedScenario.helper}</span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
          Request timeout
          <input
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-blue"
            type="number"
            min={1000}
            max={selectedScenario.isGeminiSafe ? 60000 : 180000}
            step={1000}
            value={config.timeoutMs}
            disabled={isRunning || isStarting}
            onChange={(event) => onConfigChange("timeoutMs", Number(event.target.value))}
          />
          <span className="text-xs font-normal text-text-secondary">Milliseconds per request</span>
        </label>
      </div>

      {usesTryOnModel && (
        <label className="mt-5 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-text-primary">
          Try-on model
          <select
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-blue"
            value={config.tryOnModel}
            disabled={isRunning || isStarting}
            onChange={(event) => onConfigChange("tryOnModel", event.target.value as CapacityRunConfig["tryOnModel"])}
          >
            {TRY_ON_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                [{model.family === "vertex" ? "Vertex" : "Gemini"}] {model.label} - {model.status}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal leading-5 text-text-secondary">
            {selectedModel.description} This only changes the image try-on request. AI sizing still uses the backend sizing model config.
          </span>
        </label>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PresetGroup
          label="Virtual users"
          value={config.virtualUsers}
          values={userPresets}
          maxAllowed={selectedScenario.maxVirtualUsers}
          disabled={isRunning || isStarting}
          onSelect={(value) => onConfigChange("virtualUsers", value)}
        />
        <PresetGroup
          label="Total requests"
          value={config.totalRequests}
          values={requestPresets}
          maxAllowed={selectedScenario.maxTotalRequests}
          disabled={isRunning || isStarting}
          onSelect={(value) => onConfigChange("totalRequests", value)}
        />
      </div>

      {!selectedScenario.isGeminiSafe && (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold">Real Gemini run estimate</p>
              <p className="mt-1 text-xs leading-5 text-blue-900">
                {estimatedTryOns.toLocaleString("en-US")} image try-ons, {estimatedSizingCalls.toLocaleString("en-US")} AI sizing calls,
                roughly {estimatedTryOnTokens.toLocaleString("en-US")} try-on tokens based on {selectedModelEstimate.tokensPerTryOn.toLocaleString("en-US")}
                tokens per try-on. Current theoretical image ceiling is about {selectedModelEstimate.theoreticalTryOnPerMinute.toLocaleString("en-US")}
                /minute; safe target is about {selectedModelEstimate.safeTryOnPerMinute.toLocaleString("en-US")}/minute.
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-900">
                This run uses {selectedModel.label}. Change the model above before starting the run.
              </p>
              <p className="mt-2 text-xs font-semibold text-blue-900">
                Stress runs are hard-locked to /api/test-lab mirror routes on the test backend. Disabled presets exceed the current mirror safety cap.
              </p>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-blue shadow-sm">
              Max {selectedScenario.maxTotalRequests.toLocaleString("en-US")} requests / {selectedScenario.maxVirtualUsers.toLocaleString("en-US")} users
            </span>
          </div>
        </div>
      )}

      {!selectedScenario.isGeminiSafe && (
        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <input
            className="mt-1"
            type="checkbox"
            checked={config.confirmGemini}
            disabled={isRunning || isStarting}
            onChange={(event) => onConfigChange("confirmGemini", event.target.checked)}
          />
          <span>
            I understand this sends real Gemini requests from the isolated test-lab mirror routes. Cancel stops queued/polling work in the lab, but already-submitted test backend jobs can still finish and consume quota.
          </span>
        </label>
      )}

      {selectedTarget.isLive && (
        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <input
            className="mt-1"
            type="checkbox"
            checked={config.confirmLive}
            disabled={isRunning || isStarting}
            onChange={(event) => onConfigChange("confirmLive", event.target.checked)}
          />
          <span>
            I understand this targets the live API. Use small runs first so we do not affect real customers.
          </span>
        </label>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-secondary">
          Health supports thousands of virtual users. Stress scenarios are capped server-side, test-backend only, and use test-safe sample shopper data.
        </p>
        <Button type="button" size="2xl" onClick={onStart} disabled={isRunning || isStarting} className="px-6 text-sm">
          {isStarting ? "Starting..." : isRunning ? "Running..." : selectedScenario.isGeminiSafe ? "Run capacity check" : "Run real Gemini check"}
        </Button>
      </div>
    </section>
  );
}

interface PresetGroupProps {
  label: string;
  value: number;
  values: number[];
  maxAllowed: number;
  disabled: boolean;
  onSelect: (value: number) => void;
}

function PresetGroup({ label, value, values, maxAllowed, disabled, onSelect }: PresetGroupProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">
          Selected: {value.toLocaleString("en-US")} · Max: {maxAllowed.toLocaleString("en-US")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((item) => {
          const isOverLimit = item > maxAllowed;
          return (
            <Button
              key={item}
              type="button"
              variant={item === value ? "primary" : "outline"}
              size="sm"
              disabled={disabled || isOverLimit}
              title={isOverLimit ? `Disabled: max allowed is ${maxAllowed.toLocaleString("en-US")}` : undefined}
              onClick={() => onSelect(item)}
              className={`min-w-14 px-4 text-xs ${isOverLimit ? "border-gray-200 bg-gray-100 text-gray-400 opacity-60" : ""}`}
            >
              {item.toLocaleString("en-US")}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function buildPresetValues(values: number[], maxAllowed: number): number[] {
  return Array.from(new Set([...values, maxAllowed])).sort((left, right) => left - right);
}
