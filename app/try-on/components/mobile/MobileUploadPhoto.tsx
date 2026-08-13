"use client";

import { useCallback, useRef, useState } from "react";
import {
  CameraIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CloudUploadIcon,
  LockOutlineIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { PhotoGuidelinesSheet } from "./PhotoGuidelinesSheet";

interface MobileUploadPhotoProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  uploadedFileName: string | null;
  onClearUpload: () => void;
  onSaveModel: () => void;
  canSave: boolean;
}

export function MobileUploadPhoto({
  onFileSelect,
  isUploading,
  uploadedFileName,
  onClearUpload,
  onSaveModel,
  canSave,
}: MobileUploadPhotoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const selectFile = useCallback(
    (file?: File) => {
      if (file) onFileSelect(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onFileSelect],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      selectFile(event.target.files?.[0]);
    },
    [selectFile],
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pb-6 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <p className="shrink-0 text-[14px] leading-[22px] text-[#222326]">
          Upload a full-body photo for the virtual try-on
          <br />
          Please consider guidelines for taking picture to get the most
          accurate result
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a full-body photo"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            selectFile(event.dataTransfer.files?.[0]);
          }}
          className="flex min-h-[166px] shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#b8b8ba] bg-white px-4 py-3 text-center transition-colors hover:border-[#2b64ff]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b64ff]"
        >
          {isUploading ? (
            <>
              <div className="size-8 animate-spin rounded-full border-[3px] border-[#2b64ff]/25 border-t-[#2b64ff]" />
              <p className="text-[14px] leading-[22px] text-[#6d6d6f]">
                Uploading...
              </p>
            </>
          ) : (
            <>
              <CloudUploadIcon size={34} color="#b8b8ba" />
              <div>
                <p className="text-[14px] leading-[22px] text-[#6d6d6f]">
                  Click or drag file to this area to upload
                </p>
                <p className="text-[11px] leading-[18px] text-[#8b8b8d]">
                  Max file size is 2.0 MB. Supported file types are .jpg and
                  .png
                </p>
              </div>
              <span className="text-[12px] leading-5 text-[#8b8b8d]">or</span>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[#2154ef]">
                <CloudUploadIcon size={15} color="currentColor" />
                Upload
              </span>
            </>
          )}
        </div>

        {uploadedFileName && (
          <div className="flex min-h-10 shrink-0 items-center justify-between gap-2 rounded-[10px] border border-[#dedee0] bg-white px-3 py-2">
            <span className="min-w-0 truncate text-[13px] leading-5 text-[#222326]">
              {uploadedFileName}
            </span>
            <button
              type="button"
              onClick={onClearUpload}
              className="flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] text-[#d33a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b64ff]"
            >
              <CloseIcon size={12} color="currentColor" />
              Remove
            </button>
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          disabled={!canSave || isUploading}
          onClick={onSaveModel}
          className="h-[42px] w-fit shrink-0 gap-2 self-start rounded-full px-5 text-[14px] disabled:bg-[#d2d2d4] disabled:text-white"
        >
          <CheckIcon size={16} color="currentColor" />
          Save Picture as Model
        </Button>

        <button
          type="button"
          onClick={() => setShowGuidelines(true)}
          className="flex min-h-11 w-full shrink-0 items-center justify-between rounded-[10px] border border-[#dedee0] bg-white px-3 text-left text-[13px] font-medium leading-5 text-[#222326] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b64ff]"
        >
          <span className="flex items-center gap-2">
            <CameraIcon size={16} color="#2154ef" />
            How to take the best photo
          </span>
          <ChevronDownIcon size={16} color="#6d6d6f" />
        </button>

        <div className="flex shrink-0 flex-col gap-1 rounded-[10px] bg-[#fff6bd] px-3 py-2">
          <div className="flex items-center gap-2">
            <LockOutlineIcon size={16} color="#b57b00" />
            <span className="text-[12px] font-medium leading-5 text-[#9c6900]">
              Privacy Note
            </span>
          </div>
          <p className="text-[11px] leading-[18px] text-[#343538]">
            Your photo is used only to generate virtual try-on results. It
            won&apos;t be shared, published, or used for any other purpose
            without your permission.
          </p>
        </div>
      </div>

      <PhotoGuidelinesSheet
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
      />
    </>
  );
}
