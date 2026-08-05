"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import type { PdpStudioLocalFile } from "../../types";
import { PdpStudioUiIcon } from "./PdpStudioUiIcon";

interface PdpStudioUploadZoneProps {
  id: string;
  label: string;
  files: PdpStudioLocalFile[];
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}

export function PdpStudioUploadZone({
  id,
  label,
  files,
  multiple = false,
  onFiles,
}: PdpStudioUploadZoneProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = "";
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="flex min-h-[9rem] cursor-pointer flex-col items-center justify-center gap-[var(--space-pdp-sm)] rounded-[var(--radius-pdp-lg)] border border-dashed border-[var(--color-pdp-rule-strong)] bg-[var(--color-pdp-paper)] p-5 text-center outline-none transition-colors hover:border-[var(--color-pdp-accent)] hover:bg-[var(--color-pdp-accent-soft)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-pdp-focus)]"
      >
        <span className="grid size-[2.75rem] place-items-center rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
          <PdpStudioUiIcon name="upload" />
        </span>
        <span className="text-[var(--text-pdp-sm)] font-medium text-[var(--color-pdp-ink)]">{label}</span>
        <span className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
          PNG, JPG, or WebP · private upload
        </span>
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple={multiple}
          onChange={handleChange}
          className="sr-only"
        />
      </label>
      {files.length ? (
        <div className="mt-[var(--space-pdp-sm)] grid grid-cols-2 gap-[var(--space-pdp-xs)] sm:grid-cols-4">
          {files.map((file) => (
            <figure key={file.id} className="min-w-0">
              <div className="relative aspect-square overflow-hidden rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)]">
                <Image src={file.previewUrl} alt="" fill unoptimized sizes="10rem" className="object-contain p-[var(--space-pdp-xs)]" />
              </div>
              <figcaption className="mt-[var(--space-pdp-2xs)] truncate text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
                {file.name}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}
