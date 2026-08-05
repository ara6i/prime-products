"use client";

import { Tabs, TabsList, TabsTrigger } from "@/app/shared/components/ui/tabs";
import { useBrandKitUi } from "../../hooks/useBrandKitUi";
import { BrandAssetsPanel } from "./BrandAssetsPanel";
import { BrandInfoPanel } from "./BrandInfoPanel";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";

export function BrandKitWorkspace() {
  const ui = useBrandKitUi();

  return (
    <div className="grid gap-6 pb-10">
      <PdpStudioPageHeader
        title="Brand Kit"
        description="Keep every generation consistent with your colors, typography, logos, and visual direction."
      />
      <Tabs value={ui.activeTab} onValueChange={(value) => ui.setActiveTab(value as "assets" | "info")}>
        <TabsList className="w-fit rounded-[var(--radius-pdp-pill)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-1 shadow-[var(--shadow-pdp-card)]">
          <TabsTrigger value="assets" className="min-h-[var(--size-pdp-control)] px-[var(--space-pdp-md)] text-[var(--text-pdp-sm)]">
            Brand assets
          </TabsTrigger>
          <TabsTrigger value="info" className="min-h-[var(--size-pdp-control)] px-[var(--space-pdp-md)] text-[var(--text-pdp-sm)]">
            Brand info
            <span className="ml-2 rounded bg-[var(--color-pdp-ink)] px-1.5 py-0.5 text-[0.5625rem] font-semibold text-white">
              New
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {ui.loading ? <div className="grid min-h-72 place-items-center rounded-2xl bg-white text-sm text-[var(--color-pdp-muted)]">Loading Brand Kit…</div> : ui.activeTab === "assets" ? (
        <BrandAssetsPanel ui={ui} />
      ) : (
        <BrandInfoPanel ui={ui} />
      )}
    </div>
  );
}
