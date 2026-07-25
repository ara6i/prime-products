"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import { PdpStudioButton } from "../shared/PdpStudioButton";

interface PdpStudioUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

function UsageMeter({
  label,
  value,
  max,
  renewal,
}: {
  label: string;
  value: number;
  max: number;
  renewal: string;
}) {
  const width = `${Math.min(100, Math.round((value / max) * 100))}%`;
  return (
    <section className="rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] p-[var(--space-pdp-md)]">
      <div className="flex items-center justify-between gap-[var(--space-pdp-sm)]">
        <h3 className="text-[var(--text-pdp-sm)] font-semibold">{label}</h3>
        <span className="font-[family-name:var(--font-pdp-mono)] text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
          {value} / {max}
        </span>
      </div>
      <div className="mt-[var(--space-pdp-sm)] h-[0.5rem] overflow-hidden rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-surface-soft)]">
        <div
          className="h-full rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent)]"
          style={{ width }}
        />
      </div>
      <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
        Renews {renewal}
      </p>
    </section>
  );
}

export function PdpStudioUsageDialog({
  open,
  onOpenChange,
  onUpgrade,
}: PdpStudioUsageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(92vw,34rem)] rounded-[var(--radius-pdp-lg)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-pdp-lg)]">Space usage</DialogTitle>
          <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
            Preview values mirror the audited Free-plan layout. No account usage is fetched.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-[var(--space-pdp-sm)]">
          <UsageMeter label="AI credits" value={18} max={100} renewal="August 24" />
          <UsageMeter label="Exports" value={26} max={100} renewal="August 24" />
        </div>
        <PdpStudioButton type="button" onClick={onUpgrade} className="w-full">
          View upgrade plans
        </PdpStudioButton>
      </DialogContent>
    </Dialog>
  );
}
