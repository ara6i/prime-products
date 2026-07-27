"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import type { PdpStudioPlan } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface PdpStudioUpgradeDialogProps {
  open: boolean;
  plans: PdpStudioPlan[];
  onOpenChange: (open: boolean) => void;
}

export function PdpStudioUpgradeDialog({
  open,
  plans,
  onOpenChange,
}: PdpStudioUpgradeDialogProps) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "max" | "ultra">("pro");
  const [notice, setNotice] = useState("");
  const plan = plans.find((item) => item.id === selectedPlan) ?? plans[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[min(96vw,62rem)] overflow-y-auto rounded-[var(--radius-pdp-lg)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-0 text-[var(--color-pdp-ink)]">
        <DialogTitle className="sr-only">Upgrade to Pro</DialogTitle>
        <DialogDescription className="sr-only">Choose a PrimeStyleAI plan and billing period.</DialogDescription>
        <div className="grid min-h-[38rem] md:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col bg-[var(--color-pdp-accent-soft)] p-8">
            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-pdp-accent)]">Pro</span>
            <h2 className="mt-5 text-3xl font-semibold leading-tight">Create polished listings and sell more.</h2>
            <ul className="mt-7 grid gap-4 text-sm">
              {["Batch edit up to 50 images", "High AI export limit", "1,000+ Pro templates", "HD export", "Brand Kit", "Marketplace resizing"].map((feature) => (
                <li key={feature} className="flex gap-3">
                  <PdpStudioUiIcon name="check" className="shrink-0 text-[var(--color-pdp-accent)]" />
                  {feature}
                </li>
              ))}
            </ul>
            <button type="button" className="mt-auto w-fit text-sm text-[var(--color-pdp-muted)]">Help</button>
          </section>
          <section className="p-8">
            <div className="flex rounded-xl bg-[var(--color-pdp-surface-soft)] p-1">
              {(["pro", "max", "ultra"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedPlan(value)}
                  className={[
                    "flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize",
                    selectedPlan === value ? "bg-white shadow-sm" : "text-[var(--color-pdp-muted)]",
                  ].join(" ")}
                >
                  {value}
                </button>
              ))}
            </div>
            <DialogHeader className="mt-8">
              <DialogTitle className="text-2xl">Upgrade to {plan.label}</DialogTitle>
              <DialogDescription className="text-sm text-[var(--color-pdp-muted)]">
                Choose the billing period that works for your Space.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 grid gap-3">
              {(["yearly", "monthly"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBilling(value)}
                  className={[
                    "flex items-center justify-between rounded-xl border p-4 text-left",
                    billing === value
                      ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)]"
                      : "border-[var(--color-pdp-rule)]",
                  ].join(" ")}
                >
                  <span>
                    <span className="block text-sm font-semibold capitalize">{value}</span>
                    <span className="mt-1 block text-xs text-[var(--color-pdp-muted)]">
                      {value === "yearly" ? `${plan.yearlyPrice} billed yearly` : "Cancel anytime"}
                    </span>
                  </span>
                  <span className="font-semibold">
                    {value === "yearly" ? plan.yearlyMonthlyEquivalent : plan.monthlyPrice}
                    <span className="text-xs font-normal text-[var(--color-pdp-muted)]"> / month</span>
                  </span>
                </button>
              ))}
            </div>
            <PdpStudioButton
              type="button"
              onClick={() => setNotice(`${plan.label} checkout is not connected in UI preview mode.`)}
              className="mt-6 w-full"
            >
              Start 7-day free trial
            </PdpStudioButton>
            <button type="button" className="mt-4 w-full text-sm text-[var(--color-pdp-muted)]">Already Pro</button>
            {notice ? (
              <p role="status" className="mt-4 rounded-lg bg-[var(--color-pdp-warning-soft)] p-3 text-sm text-[var(--color-pdp-warning)]">
                {notice}
              </p>
            ) : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
