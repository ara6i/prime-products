"use client";

import type { DragEventHandler } from "react";
import { UploadCloudIcon } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";

interface ProductCsvUploadPanelProps {
  currentFileName: string;
  error: string;
  selectedFileName: string;
  isDragging: boolean;
  onChooseFile: () => void;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: () => void;
  onDrop: DragEventHandler<HTMLDivElement>;
}

export function ProductCsvUploadPanel({
  currentFileName,
  error,
  selectedFileName,
  isDragging,
  onChooseFile,
  onDragOver,
  onDragLeave,
  onDrop,
}: ProductCsvUploadPanelProps) {
  return (
    <div className="space-y-[var(--spacing-customer-gap-md)]">
      <div
        role="button"
        tabIndex={0}
        onClick={onChooseFile}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex min-h-[11.458vw] cursor-pointer flex-col items-center justify-center rounded-[0.938vw] border border-dashed p-[var(--spacing-customer-gap-xl)] text-center transition-colors max-lg:min-h-[54vw] max-lg:rounded-[4vw] max-lg:p-[7vw]",
          isDragging ? "border-brand-blue bg-customer-blue" : "border-customer-border-strong bg-customer-soft hover:border-brand-blue/60 hover:bg-customer-blue",
        )}
      >
        <UploadCloudIcon className="h-[2.5vw] w-[2.5vw] text-brand-blue max-lg:h-[10vw] max-lg:w-[10vw]" />
        <p className="mt-[var(--spacing-customer-gap-md)] text-customer-lg font-semibold text-text-primary max-lg:mt-[4vw] max-lg:text-[4.2vw]">
          Drag and drop CSV
        </p>
        <p className="mt-[0.313vw] text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">
          or click to choose a file
        </p>
        {selectedFileName ? (
          <p className="mt-[var(--spacing-customer-gap-md)] rounded-full bg-customer-card px-[0.833vw] py-[0.313vw] text-customer-xs font-semibold text-brand-blue max-lg:mt-[4vw] max-lg:px-[4vw] max-lg:py-[1.5vw] max-lg:text-[3vw]">
            {selectedFileName}
          </p>
        ) : currentFileName ? (
          <p className="mt-[var(--spacing-customer-gap-md)] text-customer-xs font-semibold text-customer-muted max-lg:mt-[4vw] max-lg:text-[3vw]">
            Current file: {currentFileName}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-[0.625vw] bg-customer-danger-bg px-[var(--spacing-customer-gap-md)] py-[var(--spacing-customer-gap-sm)] text-customer-sm font-semibold text-customer-danger-text max-lg:rounded-[3vw] max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3.2vw]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
