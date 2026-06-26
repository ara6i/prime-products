"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { PlusIcon, UploadCloudIcon } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/shared/components/ui";
import { cn } from "@/app/shared/lib/utils";

interface ProductUploadDialogProps {
  currentFileName: string;
  error: string;
  onApply: (file: File) => Promise<boolean>;
}

export function ProductUploadDialog({ currentFileName, error, onApply }: ProductUploadDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    setFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleApply() {
    if (!file) return;
    setIsApplying(true);
    const applied = await onApply(file);
    setIsApplying(false);

    if (applied) {
      setOpen(false);
      setFile(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="h-[2.292vw] gap-[0.417vw] px-[0.833vw] text-customer-sm font-semibold !text-white max-lg:h-[10.5vw] max-lg:gap-[2vw] max-lg:px-[4vw] max-lg:text-[3.2vw]"
        >
          <PlusIcon className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.5vw] max-lg:w-[3.5vw]" />
          Upload CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[34.375vw] gap-[var(--spacing-customer-gap-lg)] rounded-[1.042vw] border-customer-border bg-customer-card p-[var(--spacing-customer-card)] max-lg:max-w-[92vw] max-lg:gap-[5vw] max-lg:rounded-[5vw] max-lg:p-[5vw]">
        <DialogHeader className="gap-[0.313vw] max-lg:gap-[1.5vw]">
          <DialogTitle className="text-customer-xl tracking-[-0.03em] text-text-primary max-lg:text-[5vw]">
            Upload product CSV
          </DialogTitle>
          <DialogDescription className="text-customer-sm leading-[1.6] text-text-body max-lg:text-[3.3vw]">
            Drop a Shopify product export or catalog CSV, then apply it to preview products, variants, images, and inventory.
          </DialogDescription>
        </DialogHeader>

        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
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
          {file ? (
            <p className="mt-[var(--spacing-customer-gap-md)] rounded-full bg-customer-card px-[0.833vw] py-[0.313vw] text-customer-xs font-semibold text-brand-blue max-lg:mt-[4vw] max-lg:px-[4vw] max-lg:py-[1.5vw] max-lg:text-[3vw]">
              {file.name}
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

        <DialogFooter className="gap-[var(--spacing-customer-gap-sm)] max-lg:gap-[3vw]">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-[2.292vw] px-[0.833vw] text-customer-sm max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3.2vw]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!file || isApplying}
            onClick={handleApply}
            className="h-[2.292vw] px-[0.833vw] text-customer-sm !text-white disabled:!text-customer-muted max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3.2vw]"
          >
            {isApplying ? "Applying..." : "Apply CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
