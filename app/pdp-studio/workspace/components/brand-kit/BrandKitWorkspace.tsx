"use client";

import { Tabs, TabsList, TabsTrigger } from "@/app/shared/components/ui/tabs";
import { useBrandKitUi } from "../../hooks/useBrandKitUi";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";
import { BrandAssetsPanel } from "./BrandAssetsPanel";
import { BrandInfoPanel } from "./BrandInfoPanel";

export function BrandKitWorkspace() {
  const ui = useBrandKitUi();

  return (
    <div className="grid gap-[var(--space-pdp-xl)]">
      <PdpStudioPageHeader
        title="Brand Kit"
        description="Keep logos, colors, fonts, models, backgrounds, text layers, and brand direction available across product workflows."
      />
      <Tabs value={ui.activeTab} onValueChange={(value) => ui.setActiveTab(value as "assets" | "info")}>
        <TabsList className="border-b border-[var(--color-pdp-rule)]">
          <TabsTrigger value="assets" className="min-h-[var(--size-pdp-control)] px-[var(--space-pdp-md)] text-[var(--text-pdp-sm)]">
            Brand assets
          </TabsTrigger>
          <TabsTrigger value="info" className="min-h-[var(--size-pdp-control)] px-[var(--space-pdp-md)] text-[var(--text-pdp-sm)]">
            Brand info · New
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
