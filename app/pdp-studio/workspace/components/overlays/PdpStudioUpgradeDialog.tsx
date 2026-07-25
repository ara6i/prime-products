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

const ULTRA_VOLUME_TIERS = [
  {
    label: "Ultra 2x",
    monthly: "$198 / month",
    yearly: "$1,980 / year",
    exports: "10,000 Batch exports",
  },
  {
    label: "Ultra 5x",
    monthly: "$495 / month",
    yearly: "$4,950 / year",
    exports: "25,000 Batch exports",
  },
  {
    label: "Ultra 10x",
    monthly: "$990 / month",
    yearly: "$9,900 / year",
    exports: "50,000 Batch exports",
  },
] as const;

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
  const [notice, setNotice] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[min(96vw,72rem)] overflow-y-auto rounded-[var(--radius-pdp-lg)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] text-[var(--color-pdp-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-pdp-xl)]">Upgrade your Space</DialogTitle>
          <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
            Prices reproduce the July 24 audit in USD. Checkout is intentionally disabled in this UI-only build.
          </DialogDescription>
        </DialogHeader>

        <div className="flex w-fit rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-2xs)]">
          {(["monthly", "yearly"] as const).map((value) => (
            <PdpStudioButton
              key={value}
              type="button"
              variant="ghost"
              data-active={billing === value}
              onClick={() => setBilling(value)}
              className="min-h-[2.25rem] bg-transparent capitalize data-[active=true]:bg-[var(--color-pdp-accent-soft)] data-[active=true]:text-[var(--color-pdp-accent)]"
            >
              {value}
            </PdpStudioButton>
          ))}
        </div>

        <div className="grid gap-[var(--space-pdp-md)] lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={[
                "flex flex-col rounded-[var(--radius-pdp-lg)] border bg-[var(--color-pdp-surface)] p-[var(--space-pdp-lg)]",
                plan.recommended
                  ? "border-[var(--color-pdp-accent)]"
                  : "border-[var(--color-pdp-rule)]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-[var(--space-pdp-sm)]">
                <h3 className="text-[var(--text-pdp-lg)] font-bold">{plan.label}</h3>
                {plan.recommended ? (
                  <span className="rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent-soft)] px-[var(--space-pdp-sm)] py-[var(--space-pdp-2xs)] text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-accent)]">
                    Recommended
                  </span>
                ) : null}
              </div>
              <p className="mt-[var(--space-pdp-xs)] min-h-[3rem] text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
                {plan.tagline}
              </p>
              <p className="mt-[var(--space-pdp-md)] font-[family-name:var(--font-pdp-mono)] text-[var(--text-pdp-xl)] font-bold">
                {billing === "monthly" ? plan.monthlyPrice : plan.yearlyMonthlyEquivalent}
                <span className="text-[var(--text-pdp-xs)] font-normal text-[var(--color-pdp-muted)]"> / month</span>
              </p>
              {billing === "yearly" ? (
                <p className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">{plan.yearlyPrice} billed yearly</p>
              ) : null}
              <ul className="my-[var(--space-pdp-lg)] grid gap-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-[var(--space-pdp-xs)]">
                    <PdpStudioUiIcon name="check" className="mt-[0.15rem] shrink-0 text-[var(--color-pdp-success)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <PdpStudioButton
                type="button"
                variant={plan.recommended ? "primary" : "outline"}
                onClick={() => setNotice(`${plan.label} checkout is not connected in UI preview mode.`)}
                className="mt-auto"
              >
                Start one-week trial
              </PdpStudioButton>
            </article>
          ))}
        </div>
        <section className="rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-lg)]">
          <div className="mb-[var(--space-pdp-md)]">
            <h3 className="text-[var(--text-pdp-md)] font-bold">
              Ultra volume tiers
            </h3>
            <p className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
              Higher catalog capacity from the audited pricing surface.
            </p>
          </div>
          <div className="grid gap-[var(--space-pdp-sm)] md:grid-cols-3">
            {ULTRA_VOLUME_TIERS.map((tier) => (
              <article
                key={tier.label}
                className="rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-[var(--space-pdp-md)]"
              >
                <h4 className="font-bold">{tier.label}</h4>
                <p className="mt-[var(--space-pdp-xs)] font-[family-name:var(--font-pdp-mono)] text-[var(--text-pdp-sm)]">
                  {billing === "monthly" ? tier.monthly : tier.yearly}
                </p>
                <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
                  {tier.exports}
                </p>
              </article>
            ))}
          </div>
        </section>
        {notice ? (
          <p role="status" className="rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-warning-soft)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-warning)]">
            {notice}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
