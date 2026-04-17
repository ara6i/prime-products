"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[20.833vw] rounded-[1.042vw] border-0 p-[1.25vw]"
      >
        <DialogHeader className="gap-[0.417vw]">
          <DialogTitle className="text-[0.833vw] font-medium leading-[1.625] text-text-primary">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[0.729vw] leading-[1.57] text-text-muted">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-[0.417vw] flex-row gap-[0.625vw]">
          <Button
            variant="outline-neutral"
            size="sm"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "primary" : "primary"}
            size="sm"
            className={
              variant === "danger"
                ? "flex-1 bg-[#E53935] hover:bg-[#C62828]"
                : "flex-1"
            }
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
