"use client";

import { useRef, useCallback, useState } from "react";
import Image from "next/image";
import {
  CheckIcon,
  CloudUploadIcon,
  CameraIcon,
  LockOutlineIcon,
  ChevronDownIcon,
  LightbulbIcon,
  CloseIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";

interface UploadPhotoTabProps {
  accordionOpen: boolean;
  onToggleAccordion: () => void;
  uploadedPhotoUrl: string | null;
  isUploading: boolean;
  uploadError: string | null;
  onFileSelect: (file: File) => void;
  onSaveModel: () => void;
  onClearUpload: () => void;
}

export function UploadPhotoTab({
  accordionOpen,
  onToggleAccordion,
  uploadedPhotoUrl,
  isUploading,
  uploadError,
  onFileSelect,
  onSaveModel,
  onClearUpload,
}: UploadPhotoTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="flex flex-col gap-[0.833vw] self-stretch">
      <p className="text-[0.729vw] leading-[1.57] text-text-primary">
        Upload a full-body photo for the virtual try-on
        <br />
        Please consider guidelines for taking picture to get the most accurate
        result
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploadedPhotoUrl ? (
        <div className="relative flex items-center justify-center self-stretch rounded-[0.417vw] border border-product-card-border bg-white p-[0.833vw]">
          <Image
            src={uploadedPhotoUrl}
            alt="Uploaded photo"
            width={200}
            height={300}
            className="max-h-[15.625vw] rounded-[0.417vw] object-contain w-[10.417vw] h-[15.625vw]"
          />
          <Button
            variant="icon"
            onClick={onClearUpload}
            className="absolute right-[0.417vw] top-[0.417vw] h-[1.25vw] w-[1.25vw] bg-black/50 hover:bg-black/60"
          >
            <CloseIcon size={12} color="white" className="!w-[0.625vw] !h-[0.625vw]" />
          </Button>
        </div>
      ) : (
        <div className="self-stretch rounded-[0.417vw] bg-white">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            className={`flex cursor-pointer flex-col items-center gap-[0.417vw] rounded-[0.417vw] border border-dashed p-[0.833vw] transition-colors ${
              isDragging
                ? "border-brand-blue bg-surface-blue-pale"
                : "border-product-card-border"
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-[0.417vw] py-[0.833vw]">
                <div className="h-[1.667vw] w-[1.667vw] animate-spin rounded-full border-[3px] border-brand-blue/30 border-t-brand-blue" />
                <p className="text-[0.729vw] leading-[1.57] text-text-subtitle">
                  Uploading...
                </p>
              </div>
            ) : (
              <>
                <CloudUploadIcon
                  size={56}
                  color="var(--product-card-border)"
                  className="!w-[2.917vw] !h-[2.917vw]"
                />
                <div className="flex flex-col items-center gap-[0.208vw]">
                  <p className="text-[0.729vw] leading-[1.57] text-text-subtitle">
                    Click or drag file to this area to upload
                  </p>
                  <p className="text-[0.625vw] leading-[1.667] text-text-caption">
                    Max file size is 2.0 MB. supported file types are .jpg, and
                    .png
                  </p>
                </div>
                <p className="self-stretch text-center text-[0.729vw] leading-[1.57] text-text-subtitle">
                  or
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <CameraIcon size={16} color="currentColor" className="!w-[0.833vw] !h-[0.833vw]" />
                  Upload
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-[0.625vw] leading-[1.667] text-text-error">{uploadError}</p>
      )}

      <Button
        variant="primary"
        size="sm"
        disabled={!uploadedPhotoUrl || isUploading}
        className="self-start"
        onClick={onSaveModel}
      >
        <CheckIcon size={16} color="white" className="!w-[0.833vw] !h-[0.833vw]" />
        <span className="text-[0.729vw] leading-[1.57] text-white">
          Save Picture as Model
        </span>
      </Button>

      {/* Accordion: How to take the best photo */}
      <div
        className={`overflow-hidden rounded-[0.417vw] border transition-colors ${
          accordionOpen
            ? "border-brand-blue-light"
            : "border-surface-segment"
        }`}
      >
        <Button
          variant="ghost"
          onClick={onToggleAccordion}
          className={`flex w-full items-center gap-[0.417vw] rounded-none p-[0.833vw] transition-colors ${
            accordionOpen ? "bg-surface-blue-pale" : ""
          }`}
        >
          <div className="flex flex-1 items-center gap-[0.417vw]">
            <CameraIcon size={16} color="var(--text-primary)" className="!w-[0.833vw] !h-[0.833vw]" />
            <span className="text-[0.729vw] leading-[1.57] text-text-primary">
              How to take the best photo
            </span>
          </div>
          <ChevronDownIcon
            size={16}
            color="var(--text-primary)"
            className={`!w-[0.833vw] !h-[0.833vw] transition-transform ${accordionOpen ? "rotate-180" : ""}`}
          />
        </Button>

        {accordionOpen && (
          <>
            <div className="border-t border-brand-blue-light" />
            <div className="flex flex-col gap-[0.417vw] bg-surface-blue-pale px-[0.833vw] pb-[0.833vw] pt-[0.625vw]">
              <div className="flex gap-[0.625vw] self-stretch">
                <div className="flex flex-1 flex-col gap-[0.208vw] rounded-[0.625vw] bg-surface-success-light px-[0.625vw] py-[0.417vw]">
                  <div className="flex items-center gap-[0.417vw]">
                    <CheckIcon size={16} color="var(--status-success)" className="!w-[0.833vw] !h-[0.833vw]" />
                    <span className="text-[0.625vw] leading-[1.667] text-status-success">
                      Do
                    </span>
                  </div>
                  <p className="text-[0.625vw] leading-[1.667] text-text-primary">
                    Stand facing the camera with your full body in frame
                    <br />
                    Use natural or even lighting (e.g. near a window)
                    <br />
                    Wear fitted, simple clothing (e.g. neutral colors)
                    <br />
                    Choose a plain background (a light wall is ideal)
                    <br />
                    Stand straight and still, arms relaxed by your sides
                  </p>
                </div>

                <div className="flex flex-1 flex-col gap-[0.208vw] rounded-[0.625vw] bg-surface-error-light px-[0.625vw] py-[0.417vw]">
                  <div className="flex items-center gap-[0.417vw]">
                    <CloseIcon size={16} color="var(--text-error)" className="!w-[0.833vw] !h-[0.833vw]" />
                    <span className="text-[0.625vw] leading-[1.667] text-text-error">
                      Dont
                    </span>
                  </div>
                  <p className="text-[0.625vw] leading-[1.667] text-text-primary">
                    Don&apos;t wear loose, baggy, or layered
                    <br />
                    Don&apos;t sit, pose, or bend your body
                    <br />
                    Don&apos;t use strong backlighting
                    <br />
                    Don&apos;t take mirror photos or selfies
                    <br />
                    Don&apos;t apply filters, effects, or edits
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-[0.208vw] self-stretch rounded-[0.625vw] bg-suggestion-chip-bg px-[0.625vw] py-[0.417vw]">
                <div className="flex items-center gap-[0.417vw]">
                  <LightbulbIcon size={16} color="var(--tip-accent)" className="!w-[0.833vw] !h-[0.833vw]" />
                  <span className="text-[0.625vw] leading-[1.667] text-tip-accent">
                    Quick Tip
                  </span>
                </div>
                <p className="text-[0.625vw] leading-[1.667] text-black">
                  The simpler your photo is, the more accurate your virtual
                  try-on results will be.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Privacy Note */}
      <div className="flex flex-col gap-[0.208vw] self-stretch rounded-[0.625vw] bg-surface-warning-light px-[0.625vw] py-[0.417vw]">
        <div className="flex items-center gap-[0.417vw]">
          <LockOutlineIcon size={16} color="var(--warning-dot)" className="!w-[0.833vw] !h-[0.833vw]" />
          <span className="text-[0.625vw] leading-[1.667] text-warning-dot">
            Privacy Note
          </span>
        </div>
        <p className="text-[0.625vw] leading-[1.667] text-black">
          Your photo is used only to generate virtual try-on results.
          <br />
          It won&apos;t be shared, published, or used for any other purpose
          without your permission.
        </p>
      </div>
    </div>
  );
}
