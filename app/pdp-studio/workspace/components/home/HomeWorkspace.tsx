"use client";

import type { PdpStudioAuditCatalog } from "../../types";
import { usePdpStudioHomeDialogs } from "../../hooks/usePdpStudioHomeDialogs";
import { usePdpStudioHomeUi } from "../../hooks/usePdpStudioHomeUi";
import { HomeUpgradeBanner } from "./HomeUpgradeBanner";
import { HomeWorkflowCards } from "./HomeWorkflowCards";
import { HomeToolGrid } from "./HomeToolGrid";
import { HomePresetLibrary } from "./HomePresetLibrary";
import { PdpStudioCustomSizeDialog } from "./PdpStudioCustomSizeDialog";
import { PdpStudioInlineToolDialogs } from "../shared/PdpStudioInlineToolDialogs";

interface HomeWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

export function HomeWorkspace({ catalog }: HomeWorkspaceProps) {
  const ui = usePdpStudioHomeUi();
  const dialogs = usePdpStudioHomeDialogs();

  return (
    <div className="pb-8">
      {ui.showUpgradeBanner ? (
        <HomeUpgradeBanner
          onDismiss={() => ui.setShowUpgradeBanner(false)}
        />
      ) : null}

      <div className={ui.showUpgradeBanner ? "mt-[2.4375rem]" : ""}>
        <HomeToolGrid
          tools={catalog.tools}
          onOpenImageLibrary={dialogs.openImageLibrary}
          onOpenAiTool={dialogs.openAiTool}
        />
      </div>

      <div className="mt-[3.125rem]">
        <HomeWorkflowCards
          visible={ui.showWorkflowCards}
          onVisibleChange={ui.setShowWorkflowCards}
        />
      </div>

      <div className="mt-[3.125rem]">
        <HomePresetLibrary
          catalog={catalog}
          showMore={ui.showMore}
          selectedPresetId={ui.selectedPresetId}
          onShowMore={ui.setShowMore}
          onSelectPreset={ui.setSelectedPresetId}
          onOpenCustomSize={() => ui.setCustomSizeOpen(true)}
        />
      </div>

      <PdpStudioCustomSizeDialog
        open={ui.customSizeOpen}
        width={ui.customWidth}
        height={ui.customHeight}
        onOpenChange={ui.setCustomSizeOpen}
        onWidthChange={ui.setCustomWidth}
        onHeightChange={ui.setCustomHeight}
      />

      <PdpStudioInlineToolDialogs
        dialogs={dialogs}
        tools={catalog.tools}
      />
    </div>
  );
}
