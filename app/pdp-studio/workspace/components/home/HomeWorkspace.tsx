"use client";

import type { PdpStudioAuditCatalog } from "../../types";
import { usePdpStudioHomeDialogs } from "../../hooks/usePdpStudioHomeDialogs";
import { usePdpStudioHomeUi } from "../../hooks/usePdpStudioHomeUi";
import { HomeUpgradeBanner } from "./HomeUpgradeBanner";
import { HomeWorkflowCards } from "./HomeWorkflowCards";
import { HomeToolGrid } from "./HomeToolGrid";
import { HomePresetLibrary } from "./HomePresetLibrary";
import { PdpStudioCustomSizeDialog } from "./PdpStudioCustomSizeDialog";
import { PdpStudioAiToolDialog } from "./dialogs/PdpStudioAiToolDialog";
import { PdpStudioImageLibraryDialog } from "./dialogs/PdpStudioImageLibraryDialog";

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

      <PdpStudioImageLibraryDialog
        source={dialogs.imageLibrarySource}
        activeTab={dialogs.imageLibraryTab}
        selectedImage={dialogs.selectedImage}
        onOpenChange={(open) => {
          if (!open) dialogs.closeImageLibrary();
        }}
        onTabChange={dialogs.setImageLibraryTab}
        onSelectFile={dialogs.selectImageFile}
      />

      <PdpStudioAiToolDialog
        activeToolId={dialogs.activeToolId}
        activePanel={dialogs.activePanel}
        quality={dialogs.quality}
        size={dialogs.size}
        brandEnabled={dialogs.brandEnabled}
        brandDescription={dialogs.brandDescription}
        prompt={dialogs.prompt}
        selectedImage={dialogs.selectedImage}
        previewMessage={dialogs.previewMessage}
        tools={catalog.tools}
        onOpenChange={(open) => {
          if (!open) dialogs.closeAiTool();
        }}
        onSwitchTool={dialogs.switchAiTool}
        onTogglePanel={dialogs.togglePanel}
        onClosePanel={() => dialogs.setActivePanel(null)}
        onQualityChange={dialogs.setQuality}
        onSizeChange={dialogs.setSize}
        onBrandEnabledChange={dialogs.setBrandEnabled}
        onBrandDescriptionChange={dialogs.setBrandDescription}
        onPromptChange={dialogs.setPrompt}
        onSelectFile={dialogs.selectImageFile}
        onGenerate={dialogs.generatePreview}
      />
    </div>
  );
}
