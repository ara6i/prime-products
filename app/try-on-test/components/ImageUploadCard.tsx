"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";

export interface ImageUploadCardProps {
  label: string;
  hint: string;
  previewUrl: string | null;
  isCompressing: boolean;
  bytes: number;
  onSelect: (file: File) => void;
  onClear: () => void;
}

export function ImageUploadCard({
  label,
  hint,
  previewUrl,
  isCompressing,
  bytes,
  onSelect,
  onClear,
}: ImageUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onSelect(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
        {previewUrl && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-text-hint hover:text-text-primary transition-colors inline-flex items-center gap-1"
          >
            <X className="size-3" /> Clear
          </button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border transition-all cursor-pointer",
          // Glassy substrate: shows through behind the contained image AND
          // through the empty-state placeholder so both share one visual.
          "bg-gradient-to-br from-brand-blue-pale/40 via-white/30 to-brand-blue-pale/20 backdrop-blur-md",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)]",
          dragOver
            ? "border-brand-blue ring-2 ring-brand-blue/30"
            : previewUrl
              ? "border-white/60"
              : "border-dashed border-gray-300/70 hover:border-brand-blue/70 hover:from-brand-blue-pale/60 hover:to-brand-blue-pale/30",
        )}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={label}
              className="absolute inset-0 size-full object-contain p-3"
            />
            {isCompressing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm text-text-primary text-sm">
                Compressing…
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="rounded-full bg-white/70 backdrop-blur-sm p-3 text-brand-blue shadow-sm">
              <ImageIcon className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{hint}</p>
              <p className="mt-1 text-xs text-text-secondary inline-flex items-center gap-1">
                <Upload className="size-3" /> Drop or click to upload
              </p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="text-xs text-text-hint h-4">
        {previewUrl && !isCompressing && bytes > 0 && <span>{(bytes / 1024).toFixed(0)} KB ready</span>}
      </div>
    </div>
  );
}
