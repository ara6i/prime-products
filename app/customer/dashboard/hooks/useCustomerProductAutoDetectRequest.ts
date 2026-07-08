"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeCustomerAutoDetectWebsiteUrl,
  validateCustomerProductAutoDetectForm,
} from "../mappers/productAutoDetectMapper";
import type {
  CustomerProductAutoDetectActivity,
  CustomerProductAutoDetectCategory,
  CustomerProductAutoDetectField,
  CustomerProductAutoDetectForm,
  CustomerProductAutoDetectInventoryMode,
  CustomerProductAutoDetectJob,
  CustomerProductAutoDetectProduct,
  CustomerProductAutoDetectSizeGuideMode,
  CustomerProductAutoDetectStatus,
  CustomerProductAutoDetectStep,
  CustomerProductAutoDetectTouched,
  CustomerProductAutoDetectVariantMode,
} from "../types/products";

const AUTO_DETECT_STEP_COPY = [
  {
    id: "authorize",
    label: "Authorize",
    detail: "Confirm website access",
    found: "Authorized",
  },
  {
    id: "preflight",
    label: "Prepare",
    detail: "Read catalog areas",
    found: "Areas found",
  },
  {
    id: "settings",
    label: "Choose",
    detail: "Map categories",
    found: "Choices saved",
  },
  {
    id: "import",
    label: "Review",
    detail: "Find products",
    found: "Ready",
  },
];

interface JobResponse {
  ok?: boolean;
  error?: string;
  job?: CustomerProductAutoDetectJob;
}

interface StreamPayload {
  error?: string;
  event?: {
    id: string;
    type: string;
    level: CustomerProductAutoDetectActivity["level"];
    message: string;
    detail: string | null;
    createdAt: string;
  };
  job?: CustomerProductAutoDetectJob;
}

function activeStepForStatus(status: CustomerProductAutoDetectStatus): number {
  if (status === "idle" || status === "failed") return 0;
  if (status === "preflight_running") return 1;
  if (status === "settings_required" || status === "settings_ready") return 2;
  if (status === "import_running") return 3;
  return AUTO_DETECT_STEP_COPY.length;
}

function buildAutoDetectSteps(status: CustomerProductAutoDetectStatus): CustomerProductAutoDetectStep[] {
  const activeStepIndex = activeStepForStatus(status);
  return AUTO_DETECT_STEP_COPY.map((step, index) => ({
    ...step,
    status:
      status === "ready" || index < activeStepIndex
        ? "complete"
        : index === activeStepIndex && (status === "preflight_running" || status === "import_running")
          ? "active"
          : "queued",
  }));
}

function activityFromStream(payload: StreamPayload): CustomerProductAutoDetectActivity | null {
  if (!payload.event) return null;
  return {
    id: payload.event.id,
    type: payload.event.type,
    level: payload.event.level,
    message: payload.event.message,
    detail: payload.event.detail,
    timestamp: payload.event.createdAt,
  };
}

function normalizedActivityKey(item: CustomerProductAutoDetectActivity) {
  if (item.type === "route_found") {
    const urlKey = normalizedUrlKey(item.detail);
    if (urlKey) return `route:${urlKey}`;
    return `route:${item.message}:${item.detail ?? ""}`.toLowerCase();
  }
  if (item.type === "category_found") return `category:${item.detail ?? item.message}`.toLowerCase();
  if (item.type === "product_found") return `product:${item.detail ?? item.message}`.toLowerCase();
  return item.id;
}

function normalizedUrlKey(value?: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.replace(/^www\./i, "").toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/g, "") || "/";
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "";
  }
}

function dedupeActivities(items: CustomerProductAutoDetectActivity[], limit: number) {
  const seen = new Set<string>();
  const out: CustomerProductAutoDetectActivity[] = [];
  for (const item of items) {
    const key = normalizedActivityKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function parseEventData<TPayload>(event: MessageEvent): TPayload | null {
  try {
    return JSON.parse(event.data) as TPayload;
  } catch {
    return null;
  }
}

async function readJobResponse(response: Response): Promise<CustomerProductAutoDetectJob> {
  const payload = (await response.json().catch(() => null)) as JobResponse | null;
  if (!response.ok || !payload?.job) {
    throw new Error(payload?.error ?? "Auto Detect request failed.");
  }
  return payload.job;
}

export function useCustomerProductAutoDetectRequest(verifiedWebsiteUrl: string) {
  const normalizedVerifiedWebsiteUrl = useMemo(
    () => normalizeCustomerAutoDetectWebsiteUrl(verifiedWebsiteUrl),
    [verifiedWebsiteUrl],
  );
  const [websiteUrl, setWebsiteUrlValue] = useState(normalizedVerifiedWebsiteUrl);
  const [authorized, setAuthorizedValue] = useState(false);
  const [touched, setTouched] = useState<CustomerProductAutoDetectTouched>({});
  const [status, setStatus] = useState<CustomerProductAutoDetectStatus>("idle");
  const [job, setJob] = useState<CustomerProductAutoDetectJob | null>(null);
  const [categories, setCategories] = useState<CustomerProductAutoDetectCategory[]>([]);
  const [inventoryMode, setInventoryMode] = useState<CustomerProductAutoDetectInventoryMode>("track_from_site");
  const [variantMode, setVariantMode] = useState<CustomerProductAutoDetectVariantMode>("visible_options");
  const [sizeGuideMode, setSizeGuideMode] = useState<CustomerProductAutoDetectSizeGuideMode>("detect_public_guides");
  const [detectedProducts, setDetectedProducts] = useState<CustomerProductAutoDetectProduct[]>([]);
  const [activity, setActivity] = useState<CustomerProductAutoDetectActivity[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const streamCompletedRef = useRef(false);

  useEffect(() => () => closeStream(), []);

  const values = useMemo<CustomerProductAutoDetectForm>(
    () => ({
      websiteUrl,
      authorized,
    }),
    [authorized, websiteUrl],
  );
  const errors = useMemo(() => validateCustomerProductAutoDetectForm(values), [values]);
  const hasErrors = Object.keys(errors).length > 0;
  const normalizedWebsiteUrl = useMemo(
    () => normalizeCustomerAutoDetectWebsiteUrl(values.websiteUrl),
    [values.websiteUrl],
  );
  const steps = useMemo(() => buildAutoDetectSteps(status), [status]);

  function closeStream() {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }

  function applyJob(
    nextJob: CustomerProductAutoDetectJob,
    options: { replaceActivity?: boolean } = {},
  ) {
    setJob(nextJob);
    setStatus(nextJob.status);
    setCategories(nextJob.settings?.categoryMappings ?? nextJob.categories);
    setInventoryMode(nextJob.settings?.inventoryMode ?? "track_from_site");
    setVariantMode(nextJob.settings?.variantMode ?? "visible_options");
    setSizeGuideMode(nextJob.settings?.sizeGuideMode ?? "detect_public_guides");
    setDetectedProducts(nextJob.products);
    if (options.replaceActivity ?? true) {
      setActivity(dedupeActivities(nextJob.events.slice(-24).reverse(), 12));
    }
    setErrorMessage(nextJob.error ?? "");
  }

  function appendActivity(item: CustomerProductAutoDetectActivity) {
    setActivity((current) => {
      if (current.some((existing) => existing.id === item.id)) return current;
      const itemKey = normalizedActivityKey(item);
      const next = current.filter((existing) => normalizedActivityKey(existing) !== itemKey);
      return [item, ...next].slice(0, 18);
    });
  }

  function appendSyntheticActivity(
    message: string,
    level: CustomerProductAutoDetectActivity["level"] = "info",
    detail?: string | null,
  ) {
    appendActivity({
      id: `${Date.now()}:${message}`,
      level,
      message,
      detail,
      timestamp: new Date().toISOString(),
    });
  }

  function markTouched(field: CustomerProductAutoDetectField) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function setWebsiteUrl(nextWebsiteUrl: string) {
    closeStream();
    setWebsiteUrlValue(nextWebsiteUrl);
    setStatus("idle");
    setJob(null);
    setCategories([]);
    setDetectedProducts([]);
    setActivity([]);
    setErrorMessage("");
    streamCompletedRef.current = false;
  }

  function setAuthorized(authorized: boolean) {
    closeStream();
    setAuthorizedValue(authorized);
    if (!authorized) resetDetection();
  }

  function resetDetection() {
    closeStream();
    setStatus("idle");
    setJob(null);
    setCategories([]);
    setDetectedProducts([]);
    setActivity([]);
    setErrorMessage("");
    streamCompletedRef.current = false;
  }

  function updateCategory(categoryId: string, patch: Partial<Pick<CustomerProductAutoDetectCategory, "selected" | "mappedCategory">>) {
    setCategories((current) => current.map((category) => (
      category.id === categoryId ? { ...category, ...patch } : category
    )));
  }

  async function startPreflight() {
    setTouched({ websiteUrl: true, authorized: true });
    if (hasErrors) return false;

    closeStream();
    streamCompletedRef.current = false;
    setStatus("preflight_running");
    setJob(null);
    setCategories([]);
    setDetectedProducts([]);
    setActivity([]);
    setErrorMessage("");
    appendSyntheticActivity("Website check started", "info", normalizedWebsiteUrl);

    try {
      const response = await fetch("/api/customer/dashboard/products/auto-detect/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: normalizedWebsiteUrl }),
      });
      const nextJob = await readJobResponse(response);
      applyJob(nextJob);
      openJobStream(nextJob.id);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start Auto Detect.";
      setStatus("failed");
      setErrorMessage(message);
      appendSyntheticActivity(message, "error");
      return false;
    }
  }

  async function saveSettings() {
    if (!job) return false;
    try {
      const response = await fetch(`/api/customer/dashboard/products/auto-detect/jobs/${job.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryMode,
          variantMode,
          sizeGuideMode,
          categoryMappings: categories.map((category) => ({
            id: category.id,
            selected: category.selected,
            mappedCategory: category.mappedCategory,
          })),
        }),
      });
      const nextJob = await readJobResponse(response);
      applyJob(nextJob, { replaceActivity: false });
      appendSyntheticActivity("Choices saved", "info", `${categories.filter((category) => category.selected).length} categories selected`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save Auto Detect settings.";
      setErrorMessage(message);
      appendSyntheticActivity(message, "error");
      return false;
    }
  }

  async function startImport() {
    if (!job) return false;
    closeStream();
    streamCompletedRef.current = false;
    setStatus("import_running");
    setDetectedProducts([]);
    setActivity([]);
    setErrorMessage("");
    appendSyntheticActivity("Product search started", "info", job.websiteUrl);

    try {
      const response = await fetch(`/api/customer/dashboard/products/auto-detect/jobs/${job.id}/import`, {
        method: "POST",
      });
      const nextJob = await readJobResponse(response);
      applyJob(nextJob, { replaceActivity: false });
      openJobStream(nextJob.id);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start product search.";
      setStatus("failed");
      setErrorMessage(message);
      appendSyntheticActivity(message, "error");
      return false;
    }
  }

  async function patchProduct(productId: string, patch: { selected?: boolean; reviewed?: boolean }) {
    if (!job) return;
    try {
      const response = await fetch(`/api/customer/dashboard/products/auto-detect/jobs/${job.id}/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const nextJob = await readJobResponse(response);
      applyJob(nextJob);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update product review.";
      setErrorMessage(message);
      appendSyntheticActivity(message, "error");
    }
  }

  function openJobStream(jobId: string) {
    closeStream();
    const source = new EventSource(`/api/customer/dashboard/products/auto-detect/jobs/${jobId}/stream`);
    eventSourceRef.current = source;

    const handlePayload = (event: MessageEvent) => {
      const payload = parseEventData<StreamPayload>(event);
      if (!payload) return;
      const nextActivity = activityFromStream(payload);
      if (nextActivity) appendActivity(nextActivity);
      if (payload.job) applyJob(payload.job, { replaceActivity: false });
    };

    [
      "job_started",
      "route_found",
      "category_found",
      "settings_saved",
      "product_found",
      "product_updated",
      "warning",
    ].forEach((eventName) => {
      source.addEventListener(eventName, handlePayload);
    });

    source.addEventListener("done", (event) => {
      streamCompletedRef.current = true;
      const payload = parseEventData<StreamPayload>(event);
      if (payload?.job) applyJob(payload.job);
      closeStream();
    });

    source.addEventListener("failed", (event) => {
      streamCompletedRef.current = true;
      const payload = parseEventData<StreamPayload>(event);
      if (payload?.job) applyJob(payload.job);
      const message = payload?.error ?? "Auto Detect failed.";
      setStatus("failed");
      setErrorMessage(message);
      appendSyntheticActivity(message, "error");
      closeStream();
    });

    source.onerror = () => {
      if (streamCompletedRef.current) return;
      streamCompletedRef.current = true;
      setStatus("failed");
      setErrorMessage("Auto Detect stream disconnected.");
      appendSyntheticActivity("Auto Detect stream disconnected.", "error");
      closeStream();
    };
  }

  return {
    values,
    touched,
    errors,
    status,
    steps,
    job,
    categories,
    inventoryMode,
    variantMode,
    sizeGuideMode,
    detectedProducts,
    activity,
    hasErrors,
    errorMessage,
    normalizedWebsiteUrl,
    markTouched,
    setWebsiteUrl,
    setAuthorized,
    setInventoryMode,
    setVariantMode,
    setSizeGuideMode,
    updateCategory,
    resetDetection,
    startPreflight,
    saveSettings,
    startImport,
    patchProduct,
  };
}
