"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { PdpStudioButton } from "../shared/PdpStudioButton";

interface PdpStudioCustomSizeDialogProps {
  open: boolean;
  width: string;
  height: string;
  onOpenChange: (open: boolean) => void;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
}

export function PdpStudioCustomSizeDialog({
  open,
  width,
  height,
  onOpenChange,
  onWidthChange,
  onHeightChange,
}: PdpStudioCustomSizeDialogProps) {
  const widthValue = Number(width);
  const heightValue = Number(height);
  const valid =
    widthValue >= 100 &&
    widthValue <= 4032 &&
    heightValue >= 100 &&
    heightValue <= 4032;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(92vw,28rem)] rounded-[var(--radius-pdp-lg)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-pdp-lg)]">Custom size</DialogTitle>
          <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
            Enter a canvas size from 100 to 4032 pixels.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-[var(--space-pdp-sm)]">
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Width · px</Label>
            <Input
              type="number"
              min={100}
              max={4032}
              value={width}
              onChange={(event) => onWidthChange(event.target.value)}
              aria-invalid={!valid}
              className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]"
            />
          </label>
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Height · px</Label>
            <Input
              type="number"
              min={100}
              max={4032}
              value={height}
              onChange={(event) => onHeightChange(event.target.value)}
              aria-invalid={!valid}
              className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]"
            />
          </label>
        </div>
        <p className="min-h-[1.5rem] text-[var(--text-pdp-xs)] text-[var(--color-pdp-danger)]">
          {valid ? "" : "Width and height must both be between 100 and 4032 pixels."}
        </p>
        <DialogFooter>
          <PdpStudioButton type="button" disabled={!valid} onClick={() => onOpenChange(false)}>
            Create canvas preview
          </PdpStudioButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
