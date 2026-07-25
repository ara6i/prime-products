"use client";

import type { ChangeEvent } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/shared/components/ui/tabs";
import { PDP_STUDIO_IMAGE_LIBRARY_TABS } from "../../../data/pdpStudioHomeDialogData";
import type {
  PdpStudioImageLibrarySource,
  PdpStudioImageLibraryTab,
} from "../../../types/homeToolDialog";
import { PdpStudioButton } from "../../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../../shared/PdpStudioUiIcon";

interface PdpStudioImageLibraryDialogProps {
  source: PdpStudioImageLibrarySource | null;
  activeTab: PdpStudioImageLibraryTab;
  selectedImage: { name: string; previewUrl: string } | null;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: PdpStudioImageLibraryTab) => void;
  onSelectFile: (file: File | null) => void;
}

function UploadSurface({
  selectedImage,
  onSelectFile,
}: Pick<
  PdpStudioImageLibraryDialogProps,
  "selectedImage" | "onSelectFile"
>) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSelectFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  return (
    <div className="grid min-h-[23rem] place-items-center">
      {selectedImage ? (
        <div className="grid w-full max-w-[14rem] gap-3">
          <div className="relative aspect-square overflow-hidden rounded-[var(--radius-pdp-md)] border-2 border-[var(--color-pdp-accent)] bg-[var(--color-pdp-surface-soft)] shadow-[var(--shadow-pdp-card)]">
            <Image
              src={selectedImage.previewUrl}
              alt={selectedImage.name}
              fill
              unoptimized
              className="object-contain"
            />
            <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[var(--color-pdp-accent)] text-white">
              <PdpStudioUiIcon name="check" size={14} weight="bold" />
            </span>
          </div>
          <p className="truncate text-center text-[0.75rem] text-[var(--color-pdp-muted)]">
            {selectedImage.name}
          </p>
          <label className="cursor-pointer text-center text-[0.8125rem] font-medium text-[var(--color-pdp-accent)] hover:underline">
            Choose another image
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleChange}
            />
          </label>
        </div>
      ) : (
        <label className="group grid min-h-[12rem] w-full max-w-[31rem] cursor-pointer place-items-center rounded-[var(--radius-pdp-md)] border border-dashed border-[var(--color-pdp-rule-strong)] bg-[var(--color-pdp-surface-soft)] px-8 text-center transition hover:border-[var(--color-pdp-accent)] hover:bg-[var(--color-pdp-accent-soft)]">
          <span className="grid gap-3">
            <span className="mx-auto grid size-10 place-items-center rounded-full border border-[var(--color-pdp-rule)] bg-white text-[var(--color-pdp-accent)] shadow-sm">
              <PdpStudioUiIcon name="upload" size={19} />
            </span>
            <span className="text-[0.875rem] font-semibold text-[var(--color-pdp-ink)]">
              Upload images{" "}
              <span className="font-normal text-[var(--color-pdp-muted)]">
                or drop them here
              </span>
            </span>
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleChange}
          />
        </label>
      )}
    </div>
  );
}

function EmptyLibraryState({
  icon,
  title,
  description,
}: {
  icon: "ai-images" | "design";
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[23rem] place-items-center text-center">
      <div className="max-w-[22rem]">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
          <PdpStudioUiIcon name={icon} size={21} />
        </span>
        <h3 className="mt-4 text-[1rem] font-semibold text-[var(--color-pdp-ink)]">
          {title}
        </h3>
        <p className="mt-1.5 text-[0.8125rem] leading-5 text-[var(--color-pdp-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

export function PdpStudioImageLibraryDialog({
  source,
  activeTab,
  selectedImage,
  onOpenChange,
  onTabChange,
  onSelectFile,
}: PdpStudioImageLibraryDialogProps) {
  const open = source !== null;
  const sourceLabel =
    source === "background-remover" ? "Background Remover" : "Start from a photo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex !z-[400] !h-[min(82vh,43rem)] !w-[min(92vw,62rem)] !max-w-none flex-col gap-0 overflow-hidden rounded-[1rem] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] p-0 text-[var(--color-pdp-ink)]"
        overlayClassName="!z-[300] bg-[var(--color-pdp-ink)]/25 backdrop-blur-sm"
      >
        <DialogHeader className="border-b border-[var(--color-pdp-rule)] px-6 pb-0 pt-5 text-left">
          <DialogTitle className="text-[1.125rem] font-semibold">
            Add images
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select a local image for {sourceLabel}.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            onTabChange(value as PdpStudioImageLibraryTab)
          }
          className="min-h-0 flex-1 gap-0"
        >
          <TabsList className="w-full gap-5 border-b border-[var(--color-pdp-rule)] px-6">
            {PDP_STUDIO_IMAGE_LIBRARY_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="border-b-2 border-transparent px-0 py-3 text-[0.8125rem] font-medium text-[var(--color-pdp-muted)] data-[state=active]:border-[var(--color-pdp-accent)] data-[state=active]:text-[var(--color-pdp-ink)] focus-visible:outline-none focus-visible:ring-0"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <TabsContent value="all" className="h-full">
              <UploadSurface
                selectedImage={selectedImage}
                onSelectFile={onSelectFile}
              />
            </TabsContent>
            <TabsContent value="uploads" className="h-full">
              <UploadSurface
                selectedImage={selectedImage}
                onSelectFile={onSelectFile}
              />
            </TabsContent>
            <TabsContent value="products" className="h-full">
              <div className="grid min-h-[23rem] place-items-center text-center">
                <div className="max-w-[22rem]">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
                    <PdpStudioUiIcon name="shopify" size={21} />
                  </span>
                  <h3 className="mt-4 text-[1rem] font-semibold">
                    Access your Shopify product images
                  </h3>
                  <p className="mt-1.5 text-[0.8125rem] leading-5 text-[var(--color-pdp-muted)]">
                    Connect your store to use and edit your product visuals.
                  </p>
                  <PdpStudioButton
                    type="button"
                    className="mt-5"
                    disabled
                    title="Shopify connection is outside this UI-only build"
                  >
                    Connect to Shopify
                  </PdpStudioButton>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="ai-images" className="h-full">
              <EmptyLibraryState
                icon="ai-images"
                title="No AI images yet"
                description="Images you generate in PDP Studio will appear here."
              />
            </TabsContent>
            <TabsContent value="designs" className="h-full">
              <EmptyLibraryState
                icon="design"
                title="No saved designs yet"
                description="Finished designs will be available here for reuse."
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex min-h-16 items-center justify-between border-t border-[var(--color-pdp-rule)] px-6">
          <span className="text-[0.8125rem] text-[var(--color-pdp-muted)]">
            {selectedImage ? "1 image selected" : "Select images"}
          </span>
          <PdpStudioButton
            type="button"
            disabled={!selectedImage}
            onClick={() => onOpenChange(false)}
            className="min-w-[7.5rem]"
          >
            Add images
          </PdpStudioButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
