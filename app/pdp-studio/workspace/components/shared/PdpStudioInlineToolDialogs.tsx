"use client";

import type { PdpStudioToolDefinition } from "../../types";
import type { PdpStudioHomeDialogsController } from "../../hooks/usePdpStudioHomeDialogs";
import { PdpStudioAiToolDialog } from "../home/dialogs/PdpStudioAiToolDialog";
import { PdpStudioImageLibraryDialog } from "../home/dialogs/PdpStudioImageLibraryDialog";

interface PdpStudioInlineToolDialogsProps {
  dialogs: PdpStudioHomeDialogsController;
  tools: PdpStudioToolDefinition[];
}

export function PdpStudioInlineToolDialogs({
  dialogs,
  tools,
}: PdpStudioInlineToolDialogsProps) {
  return (
    <>
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
        referenceImages={dialogs.referenceImages}
        previewMessage={dialogs.previewMessage}
        generationState={dialogs.generationState}
        generationError={dialogs.generationError}
        job={dialogs.job}
        tools={tools}
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
        onSelectReferenceFiles={dialogs.selectReferenceFiles}
        onGenerate={dialogs.generatePreview}
        onCancel={dialogs.cancelGeneration}
        onRetry={dialogs.retryGeneration}
      />
    </>
  );
}
