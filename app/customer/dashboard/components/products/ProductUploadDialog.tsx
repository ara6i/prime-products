"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { UploadCloudIcon } from "lucide-react";
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
import { ProductCsvUploadPanel } from "./ProductCsvUploadPanel";

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
          variant="outline"
          className="h-[2.292vw] gap-[0.417vw] px-[0.833vw] text-customer-sm font-semibold max-lg:h-[10.5vw] max-lg:gap-[2vw] max-lg:px-[4vw] max-lg:text-[3.2vw]"
        >
          <UploadCloudIcon className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.5vw] max-lg:w-[3.5vw]" />
          Upload CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] !w-[42vw] !max-w-[42vw] gap-[var(--spacing-customer-gap-md)] overflow-y-auto rounded-[1.042vw] border-customer-border bg-customer-card p-[var(--spacing-customer-card)] sm:!max-w-[42vw] max-xl:!w-[56vw] max-xl:!max-w-[56vw] max-lg:max-h-[94vh] max-lg:!w-[94vw] max-lg:!max-w-[94vw] max-lg:gap-[4vw] max-lg:rounded-[5vw] max-lg:p-[5vw]">
        <DialogHeader className="gap-[0.208vw] max-lg:gap-[1vw]">
          <DialogTitle className="text-customer-xl tracking-[-0.03em] text-text-primary max-lg:text-[5vw]">
            Upload product CSV
          </DialogTitle>
          <DialogDescription className="text-customer-sm leading-[1.6] text-text-body max-lg:text-[3.3vw]">
            Upload a product export or catalog CSV.
          </DialogDescription>
        </DialogHeader>

        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />

        <ProductCsvUploadPanel
          currentFileName={currentFileName}
          error={error}
          selectedFileName={file?.name ?? ""}
          isDragging={isDragging}
          onChooseFile={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        />

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
