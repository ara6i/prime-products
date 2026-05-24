"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PackageSearch } from "lucide-react";
import { fetchDemoProductForLab, fetchDemoProductOptions, type DemoLabProductApplyData, type DemoLabProductOption } from "../lib/demoProducts";

interface DemoProductPickerProps {
  baseUrl: string;
  disabled: boolean;
  onApply: (data: DemoLabProductApplyData) => Promise<void>;
}

export function DemoProductPicker({ baseUrl, disabled, onApply }: DemoProductPickerProps) {
  const [options, setOptions] = useState<DemoLabProductOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDemoProductOptions(baseUrl)
      .then((items) => {
        if (!cancelled) setOptions(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load demo products");
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const selected = useMemo(
    () => options.find((option) => option.id === selectedId) ?? null,
    [options, selectedId],
  );
  const isApplying = !!applyingId;

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setLoadedId(null);
    setError(null);
    if (!id) return;

    setApplyingId(id);
    try {
      const data = await fetchDemoProductForLab(baseUrl, id);
      await onApply(data);
      setLoadedId(id);
      if (!data.hasSizeGuide) setError("Selected product has no saved size guide; default chart was used.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply demo product");
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-brand-blue-pale p-2 text-brand-blue">
            <PackageSearch className="size-4" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">Demo product</h3>
        </div>
        {(loadingList || isApplying) && <Loader2 className="size-4 animate-spin text-brand-blue" />}
      </div>

      <div className="flex gap-3">
        {selected?.imageUrl ? (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.imageUrl} alt="" className="size-full object-contain" />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-text-hint">
            <PackageSearch className="size-5" />
          </div>
        )}

        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">
          Product
          <select
            value={selectedId}
            disabled={disabled || loadingList || isApplying}
            onChange={(event) => void handleSelect(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-text-primary"
          >
            <option value="">{loadingList ? "Loading products..." : "Manual product"}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} {option.category ? `- ${option.category}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadedId && !error && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          Product loaded into the lab.
        </p>
      )}
      {error && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{error}</p>}
    </div>
  );
}
