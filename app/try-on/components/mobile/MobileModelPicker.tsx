"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import {
  CLOSE_UP_MODELS,
  FULL_BODY_MODELS,
} from "@/app/try-on/data/models";
import type { BodyType, SelectionTab } from "@/app/try-on/types";
import { MobileUploadPhoto } from "./MobileUploadPhoto";

interface MobileModelPickerProps {
  activeSource: SelectionTab;
  onSourceChange: (source: SelectionTab) => void;
  previewModelId: string | null;
  onPreviewModelSelect: (id: string | null) => void;
  onSaveModel: () => void;
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  uploadedFileName: string | null;
  onClearUpload: () => void;
  onSaveUploadedModel: () => void;
  canSaveUpload: boolean;
}

export function MobileModelPicker({
  activeSource,
  onSourceChange,
  previewModelId,
  onPreviewModelSelect,
  onSaveModel,
  onFileSelect,
  isUploading,
  uploadedFileName,
  onClearUpload,
  onSaveUploadedModel,
  canSaveUpload,
}: MobileModelPickerProps) {
  const [bodyType, setBodyType] = useState<BodyType>(() =>
    previewModelId?.startsWith("c") ? "close-up" : "full-body",
  );
  const models =
    bodyType === "full-body" ? FULL_BODY_MODELS : CLOSE_UP_MODELS;

  const handleBodyTypeChange = (nextBodyType: BodyType) => {
    setBodyType(nextBodyType);
    const nextModels =
      nextBodyType === "full-body" ? FULL_BODY_MODELS : CLOSE_UP_MODELS;
    if (!nextModels.some((model) => model.id === previewModelId)) {
      onPreviewModelSelect(null);
    }
  };

  return (
    <section
      aria-label="Choose a try-on model"
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#e7e7e7] bg-white"
    >
      <div className="h-[38px] shrink-0 border-b border-[#d8d8da]">
        <div
          role="tablist"
          aria-label="Model source"
          className="flex h-full max-w-full"
          style={{ width: 248 }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSource === "choose-model"}
            onClick={() => onSourceChange("choose-model")}
            className={`shrink-0 border-t-[3px] px-2 text-left text-[14px] leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2b64ff] ${
              activeSource === "choose-model"
                ? "border-[#2b64ff] bg-white font-medium text-[#2b64ff]"
                : "border-transparent bg-[#e8e9eb] font-normal text-[#6d6d6f] hover:bg-[#dedfe2]"
            }`}
            style={{ width: 140 }}
          >
            Choose Model
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSource === "upload-photo"}
            onClick={() => onSourceChange("upload-photo")}
            className={`shrink-0 border-t-[3px] px-2 text-left text-[14px] leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2b64ff] ${
              activeSource === "upload-photo"
                ? "border-[#2b64ff] bg-white font-medium text-[#2b64ff]"
                : "border-transparent bg-[#e8e9eb] font-normal text-[#6d6d6f] hover:bg-[#dedfe2]"
            }`}
            style={{ width: 108 }}
          >
            Upload Photo
          </button>
        </div>
      </div>

      {activeSource === "choose-model" ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-4 px-3 pb-3 pt-4">
            <p className="shrink-0 text-[14px] leading-[22px] text-[#222326]">
              No photo needed.
              <br />
              Choose from our models and see how outfits look instantly:
            </p>

            <div
              role="tablist"
              aria-label="Model framing"
              className="grid h-[42px] shrink-0 grid-cols-2 overflow-hidden rounded-[10px] bg-[#e5e5e6] p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={bodyType === "full-body"}
                onClick={() => handleBodyTypeChange("full-body")}
                className={`rounded-[9px] text-[16px] leading-[22px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2b64ff] ${
                  bodyType === "full-body"
                    ? "bg-[#d7e4ff] text-[#164ce6]"
                    : "text-[#343538]"
                }`}
              >
                Full Body
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={bodyType === "close-up"}
                onClick={() => handleBodyTypeChange("close-up")}
                className={`rounded-[9px] text-[16px] leading-[22px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2b64ff] ${
                  bodyType === "close-up"
                    ? "bg-[#d7e4ff] text-[#164ce6]"
                    : "text-[#343538]"
                }`}
              >
                Close-up
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-2 gap-3">
                {models.map((model) => {
                  const selected = previewModelId === model.id;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onPreviewModelSelect(model.id)}
                      className={`relative min-h-[184px] overflow-hidden rounded-[14px] border-[3px] bg-[#f4f4f4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b64ff] focus-visible:ring-offset-2 ${
                        selected
                          ? "border-[#2b64ff]"
                          : "border-transparent hover:border-[#2b64ff]/30"
                      }`}
                    >
                      <Image
                        src={model.src}
                        alt={model.alt}
                        fill
                        sizes="(max-width: 767px) 42vw, 160px"
                        className="object-cover"
                        priority={model.id === models[0]?.id}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <Button
              type="button"
              variant="primary"
              disabled={!previewModelId}
              onClick={onSaveModel}
              className="pointer-events-auto h-[50px] min-w-[172px] gap-2 px-6 text-[16px] shadow-[0_8px_24px_rgba(33,84,239,0.2)] disabled:bg-[#d2d2d4] disabled:text-white disabled:shadow-none"
            >
              <CheckIcon size={20} color="currentColor" />
              Save as Model
            </Button>
          </div>
        </>
      ) : (
        <MobileUploadPhoto
          onFileSelect={onFileSelect}
          isUploading={isUploading}
          uploadedFileName={uploadedFileName}
          onClearUpload={onClearUpload}
          onSaveModel={onSaveUploadedModel}
          canSave={canSaveUpload}
        />
      )}
    </section>
  );
}
