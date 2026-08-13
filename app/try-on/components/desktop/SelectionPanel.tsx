"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/shared/components/ui";
import { useSelectionPanel } from "@/app/try-on/hooks/useSelectionPanel";
import { ChooseModelTab } from "./ChooseModelTab";
import { UploadPhotoTab } from "./UploadPhotoTab";
import type { SelectionTab } from "@/app/try-on/types";

interface SelectionPanelProps {
  selectedModelId: string | null;
  onModelSelect: (id: string) => void;
  onUploadedModelSelect: (url: string) => void;
  className?: string;
}

export function SelectionPanel({
  selectedModelId,
  onModelSelect,
  onUploadedModelSelect,
  className,
}: SelectionPanelProps) {
  const {
    activeTab,
    setActiveTab,
    bodyType,
    setBodyType,
    accordionOpen,
    setAccordionOpen,
    previewModelId,
    setPreviewModelId,
    handleSaveModel,
    uploadedPhotoUrl,
    isUploading,
    uploadError,
    handleUploadFile,
    handleSaveUploadedModel,
    handleClearUpload,
  } = useSelectionPanel({ selectedModelId, onModelSelect, onUploadedModelSelect });

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.042vw] border border-border-light bg-surface-light p-[1.25vw] ${className ?? ""}`}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as SelectionTab)}
        className="flex min-h-0 flex-1 flex-col gap-[1.042vw]"
      >
        <TabsList className="shrink-0">
          <TabsTrigger value="choose-model">Choose Model</TabsTrigger>
          <TabsTrigger value="upload-photo">Upload Photo</TabsTrigger>
        </TabsList>

        <TabsContent
          value="choose-model"
          className="flex min-h-0 flex-1 flex-col"
        >
          <ChooseModelTab
            bodyType={bodyType}
            onBodyTypeChange={setBodyType}
            previewModelId={previewModelId}
            onPreviewModelSelect={setPreviewModelId}
            onSaveModel={handleSaveModel}
          />
        </TabsContent>

        <TabsContent
          value="upload-photo"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <UploadPhotoTab
            accordionOpen={accordionOpen}
            onToggleAccordion={() => setAccordionOpen(!accordionOpen)}
            uploadedPhotoUrl={uploadedPhotoUrl}
            isUploading={isUploading}
            uploadError={uploadError}
            onFileSelect={handleUploadFile}
            onSaveModel={handleSaveUploadedModel}
            onClearUpload={handleClearUpload}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
