"use client";

import { Tabs, TabsList, TabsTrigger } from "@/app/shared/components/ui/tabs";
import { useBrandKitUi } from "../../hooks/useBrandKitUi";
import { BrandAssetsPanel } from "./BrandAssetsPanel";
import { BrandInfoPanel } from "./BrandInfoPanel";

export function BrandKitWorkspace() {
  const ui = useBrandKitUi();

  return (
    <div className="grid gap-6 py-6">
      <Tabs value={ui.activeTab} onValueChange={(value) => ui.setActiveTab(value as "assets" | "info")}>
        <TabsList className="border-b border-[var(--color-pdp-rule)]">
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
      {ui.activeTab === "assets" ? (
        <BrandAssetsPanel notice={ui.assetNotice} onNotice={ui.setAssetNotice} />
      ) : (
        <BrandInfoPanel ui={ui} />
      )}
    </div>
  );
}
