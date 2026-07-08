"use client";

import { useRef } from "react";
import { Upload, X } from "lucide-react";

interface Props {
  title?: string;
  emptyLabel?: string;
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  width: number;
  height: number;
}

export function ImageUploader({
  title = "Model photo",
  emptyLabel = "Upload full-body photo",
  previewUrl,
  onSelect,
  onClear,
  width,
  height,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {previewUrl && (
          <button
            onClick={onClear}
            className="text-xs text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
            type="button"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
      {previewUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Model preview" className="w-full rounded-lg border border-gray-100" />
          <p className="text-xs text-text-secondary">{width} × {height} px</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-gray-200 hover:border-brand-blue/40 transition-colors flex flex-col items-center justify-center gap-2 text-text-secondary"
        >
          <Upload className="h-6 w-6" />
          <span className="text-sm">{emptyLabel}</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
    </div>
  );
}
