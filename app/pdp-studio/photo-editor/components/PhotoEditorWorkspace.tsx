"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  CaretRight,
  CircleHalf,
  DownloadSimple,
  ImageSquare,
  Lightbulb,
  Plus,
  ShareNetwork,
  Sparkle,
  TextT,
  Trash,
} from "@phosphor-icons/react";
import { useRef } from "react";
import { PdpStudioButton } from "../../workspace/components/shared/PdpStudioButton";
import { PdpStudioGenerationProgressPanel } from "../../workspace/components/shared/PdpStudioGenerationProgress";
import { PdpStudioUiIcon } from "../../workspace/components/shared/PdpStudioUiIcon";
import { usePhotoEditorWorkspace } from "../hooks/usePhotoEditorWorkspace";
import type { PhotoEditorTool } from "../types/photoEditor";
import { MaskEditorDialog } from "./MaskEditorDialog";

interface PhotoEditorWorkspaceProps {
  tool: PhotoEditorTool;
}

export function PhotoEditorWorkspace({ tool }: PhotoEditorWorkspaceProps) {
  const ui = usePhotoEditorWorkspace(tool);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <main
      data-pdp-studio
      className="flex h-screen min-h-[36rem] flex-col overflow-hidden bg-white font-[family-name:var(--font-pdp-body)] text-[var(--color-pdp-ink)]"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Replace product image"
        onChange={(event) => {
          ui.replaceImage(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />

      <EditorToolbar ui={ui} />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_22.5rem]">
        <section className="relative flex min-h-0 flex-col overflow-hidden bg-[#edf2f9]">
          <div className="relative grid min-h-0 flex-1 place-items-center p-7">
            <div className="relative aspect-square h-[min(55vh,31rem)] max-h-full max-w-full -translate-x-6 overflow-visible rounded-[0.25rem] bg-white shadow-[0_16px_60px_rgba(24,39,75,0.11)]">
              <Image
                src={ui.imageUrl}
                alt="Product editor preview"
                fill
                unoptimized
                sizes="(max-width: 1000px) 65vw, 600px"
                className="object-contain"
                priority
              />
              {ui.tool === "background-remover" && !ui.outputAsset ? (
                <EditorSelectionFrame />
              ) : null}
              {ui.hasLocalEdit ? (
                <span className="absolute bottom-3 left-3 rounded-full bg-[#162a66]/88 px-3 py-1 text-[0.65rem] font-medium text-white shadow-sm">
                  Local preview
                </span>
              ) : null}
              {ui.busy ? (
                <div className="absolute inset-0 grid place-items-center bg-white/82 backdrop-blur-[2px]">
                  <PdpStudioGenerationProgressPanel
                    stage={
                      ui.job?.progress.stage ?? "Uploading private assets"
                    }
                    percent={ui.job?.progress.percent ?? 8}
                    elapsedSeconds={ui.elapsedSeconds}
                    status={ui.job?.status ?? "uploading"}
                  />
                </div>
              ) : null}
            </div>
          </div>
          {ui.tool === "retouch" ? (
            <div className="absolute inset-x-0 bottom-20 z-10 px-5">
              <div className="mx-auto flex max-w-[26.5rem] -translate-x-6 items-center gap-2 rounded-[0.85rem] border border-[var(--color-pdp-rule-strong)] bg-white p-1.5 shadow-sm">
                <input
                  type="text"
                  aria-label="Describe an edit"
                  placeholder="Describe an edit"
                  value={ui.prompt}
                  onChange={(event) => ui.setPrompt(event.target.value)}
                  disabled={ui.busy}
                  className="h-9 min-w-0 flex-1 bg-transparent px-3 text-[0.75rem] outline-none placeholder:text-[var(--color-pdp-muted)]"
                />
                <span className="rounded-[0.45rem] bg-[var(--color-pdp-surface-soft)] px-2 py-1.5 text-[0.65rem] font-medium">
                  Standard
                </span>
                <span className="rounded-[0.4rem] border border-[var(--color-pdp-rule)] px-1.5 py-1 text-[0.6rem] font-semibold">
                  1K
                </span>
                <PdpStudioButton
                  type="button"
                  aria-label="Apply edit"
                  disabled={!ui.canRunPromptEdit}
                  onClick={() => void ui.runPromptEdit()}
                  className="grid size-9 min-h-9 place-items-center rounded-[0.55rem] bg-[var(--color-pdp-accent)] p-0 text-white"
                >
                  <PdpStudioUiIcon
                    name="arrow"
                    size={15}
                    className="-rotate-90"
                  />
                </PdpStudioButton>
              </div>
            </div>
          ) : null}
          {ui.error ? (
            <p
              role="alert"
              className="absolute bottom-5 left-1/2 z-20 max-w-[34rem] -translate-x-[58%] rounded-[0.65rem] border border-red-200 bg-red-50 px-4 py-2 text-center text-[0.72rem] text-red-700 shadow-sm"
            >
              {ui.error}
            </p>
          ) : null}
        </section>

        <PhotoInspectorRail
          ui={ui}
          onReplace={() => fileInputRef.current?.click()}
        />
      </div>

      <MaskEditorDialog ui={ui} />
    </main>
  );
}

function EditorSelectionFrame() {
  const handles = [
    "-left-1.5 -top-1.5",
    "left-1/2 -top-1.5 -translate-x-1/2",
    "-right-1.5 -top-1.5",
    "-left-1.5 top-1/2 -translate-y-1/2",
    "-right-1.5 top-1/2 -translate-y-1/2",
    "-bottom-1.5 -left-1.5",
    "-bottom-1.5 left-1/2 -translate-x-1/2",
    "-bottom-1.5 -right-1.5",
  ];

  return (
    <div
      aria-hidden
      className="absolute left-[51%] top-[33%] h-[45%] w-[46%] border-2 border-[var(--color-pdp-accent)]"
    >
      <span className="absolute -top-11 right-0 flex overflow-hidden rounded-[0.55rem] bg-[#2f3035] text-white shadow-lg">
        <span className="grid size-9 place-items-center border-r border-white/10">
          <Trash size={16} />
        </span>
        <span className="grid size-9 place-items-center">
          <PdpStudioUiIcon name="more" size={17} />
        </span>
      </span>
      {handles.map((className) => (
        <span
          key={className}
          className={[
            "absolute size-3 rounded-[0.2rem] border-2 border-[var(--color-pdp-accent)] bg-white",
            className,
          ].join(" ")}
        />
      ))}
      <span className="absolute -right-11 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full border-2 border-[var(--color-pdp-accent)] bg-white text-[var(--color-pdp-accent)] shadow-sm">
        <PdpStudioUiIcon name="resize" size={15} />
      </span>
    </div>
  );
}

function EditorToolbar({
  ui,
}: {
  ui: ReturnType<typeof usePhotoEditorWorkspace>;
}) {
  const downloadUrl = ui.outputAsset?.url ?? null;

  return (
    <header className="relative z-30 flex min-h-16 items-center border-b border-[var(--color-pdp-rule)] bg-white px-3">
      <PdpStudioButton
        asChild
        variant="ghost"
        className="min-h-10 min-w-10 rounded-[0.65rem] p-0"
      >
        <Link href="/pdp-studio" aria-label="Go back home">
          <PdpStudioUiIcon name="home" size={18} />
        </Link>
      </PdpStudioButton>
      <div className="ml-6 flex items-center gap-1">
        <ToolbarButton icon={<Plus size={17} />} label="Insert" />
        <ToolbarButton icon={<TextT size={17} />} label="Add text" />
        <ToolbarButton icon={<ImageSquare size={17} />} label="Backgrounds" />
        <ToolbarButton
          icon={<PdpStudioUiIcon name="resize" size={17} />}
          label="Resize"
        />
        <ToolbarButton
          icon={<PdpStudioUiIcon name="more" size={18} />}
          label="More"
          iconOnly
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <PdpStudioButton
          asChild={Boolean(downloadUrl)}
          variant="outline"
          disabled={!downloadUrl}
          className="gap-2"
        >
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={ui.outputAsset?.originalName ?? undefined}
            >
              <DownloadSimple size={16} aria-hidden />
              Download
            </a>
          ) : (
            <>
              <DownloadSimple size={16} aria-hidden />
              Download
            </>
          )}
        </PdpStudioButton>
        <PdpStudioButton
          disabled={!downloadUrl}
          onClick={() => void ui.shareResult()}
          className="gap-2"
        >
          <ShareNetwork size={16} aria-hidden />
          Share
        </PdpStudioButton>
      </div>
    </header>
  );
}

function ToolbarButton({
  icon,
  label,
  iconOnly = false,
}: {
  icon: React.ReactNode;
  label: string;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={[
        "grid min-h-11 place-items-center rounded-[0.55rem] px-3 text-[0.625rem] text-[var(--color-pdp-ink-soft)] transition hover:bg-[var(--color-pdp-surface-soft)] hover:text-[var(--color-pdp-ink)]",
        iconOnly ? "min-w-11 px-2" : "min-w-16 gap-0.5",
      ].join(" ")}
    >
      {icon}
      {!iconOnly ? <span>{label}</span> : null}
    </button>
  );
}

function PhotoInspectorRail({
  ui,
  onReplace,
}: {
  ui: ReturnType<typeof usePhotoEditorWorkspace>;
  onReplace: () => void;
}) {
  return (
    <aside className="min-h-0 overflow-y-auto border-l border-[var(--color-pdp-rule)] bg-white">
      <div className="flex min-h-14 items-center justify-between border-b border-[var(--color-pdp-rule)] px-5">
        <h1 className="text-[1rem] font-semibold">Photo</h1>
        <button
          type="button"
          className="text-[0.75rem] font-medium text-[var(--color-pdp-accent)]"
        >
          Save
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4">
        <RailAction
          label="Replace"
          icon={<ImageSquare size={21} />}
          onClick={onReplace}
        />
        <RailAction
          label="Retouch"
          icon={<Sparkle size={21} />}
          onClick={ui.openRetouch}
        />
        <RailAction label="Light" badge="On" icon={<Lightbulb size={21} />} />
      </div>

      <InspectorSection title="Align to canvas">
        <div className="grid grid-cols-2 gap-2">
          <RailAction
            label="Center"
            icon={<AlignCenterHorizontal size={21} />}
            compact
          />
          <RailAction
            label="Middle"
            icon={<AlignCenterVertical size={21} />}
            compact
          />
        </div>
      </InspectorSection>

      <section className="border-b border-[var(--color-pdp-rule)] p-4 pt-0">
        <div className="rounded-[0.65rem] border border-[var(--color-pdp-rule-strong)] p-3">
          <div className="flex min-h-6 items-center justify-between">
            <h2 className="flex items-center gap-2 text-[0.75rem] font-medium">
              <PdpStudioUiIcon
                name="background-remover"
                size={17}
                className="text-[var(--color-pdp-ink-soft)]"
              />
              Remove background
            </h2>
          <button
            type="button"
            role="switch"
            aria-checked={ui.removeBackground}
            aria-label="Remove background"
            onClick={() => ui.setRemoveBackground(!ui.removeBackground)}
            className={[
              "relative h-6 w-11 rounded-full transition",
              ui.removeBackground
                ? "bg-[var(--color-pdp-accent)]"
                : "bg-[var(--color-pdp-rule-strong)]",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all",
                ui.removeBackground ? "left-6" : "left-1",
              ].join(" ")}
            />
          </button>
          </div>
          {ui.removeBackground ? (
            <div className="mt-3 grid gap-2">
              <PdpStudioButton
                type="button"
                disabled={!ui.canRemoveBackground}
                onClick={() => void ui.removeImageBackground()}
                className="h-10 w-full gap-2 rounded-[0.55rem] text-[0.75rem]"
              >
                <PdpStudioUiIcon name="background-remover" size={17} />
                {ui.busy && ui.tool === "background-remover"
                  ? "Removing…"
                  : "Remove background"}
              </PdpStudioButton>
              <PdpStudioButton
                type="button"
                variant="outline"
                onClick={ui.openCutout}
                className="h-10 w-full gap-2 rounded-[0.55rem] text-[0.75rem]"
              >
                <PdpStudioUiIcon name="background-remover" size={17} />
                Edit Cutout
              </PdpStudioButton>
            </div>
          ) : null}
        </div>
      </section>

      {ui.job?.status === "failed" || ui.job?.status === "cancelled" ? (
        <div className="grid gap-2 px-4 pb-4">
          <PdpStudioButton
            type="button"
            variant="outline"
            onClick={() => void ui.retryJob()}
          >
            Retry
          </PdpStudioButton>
        </div>
      ) : null}
      {ui.job?.status === "queued" || ui.job?.status === "running" ? (
        <div className="grid gap-2 px-4 pb-4">
          <PdpStudioButton
            type="button"
            variant="outline"
            onClick={() => void ui.cancelJob()}
          >
            Cancel
          </PdpStudioButton>
        </div>
      ) : null}

      <EffectGroup>
        <EffectRow label="Shadows" icon={<CircleHalf size={18} />} toggle />
        <EffectRow
          label="Outline"
          icon={<PdpStudioUiIcon name="layers" size={18} />}
          toggle
        />
        <EffectRow label="Reflection" icon={<Sparkle size={18} />} toggle />
      </EffectGroup>
      <EffectGroup>
        <EffectRow
          label="Adjust"
          icon={<PdpStudioUiIcon name="settings" size={18} />}
        />
        <EffectRow
          label="Blend"
          icon={<PdpStudioUiIcon name="palette" size={18} />}
          value="Normal"
        />
        <EffectRow
          label="Transform"
          icon={<PdpStudioUiIcon name="expand" size={18} />}
        />
        <EffectRow
          label="Position"
          icon={<PdpStudioUiIcon name="resize" size={18} />}
        />
      </EffectGroup>
      <EffectGroup>
        <EffectRow label="Blur" icon={<CircleHalf size={18} />} toggle />
        <EffectRow
          label="Filter"
          icon={<PdpStudioUiIcon name="image" size={18} />}
          toggle
        />
        <EffectRow
          label="Texture"
          icon={<PdpStudioUiIcon name="layers" size={18} />}
          toggle
        />
      </EffectGroup>
      <div className="grid grid-cols-2 gap-2 p-4">
        {["Front", "Back", "Duplicate", "Delete"].map((label) => (
          <button
            key={label}
            type="button"
            className="h-9 rounded-[0.55rem] border border-[var(--color-pdp-rule)] bg-white text-[0.68rem] text-[var(--color-pdp-ink-soft)] transition hover:bg-[var(--color-pdp-surface-soft)]"
          >
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}

function RailAction({
  label,
  icon,
  badge,
  onClick,
  compact = false,
}: {
  label: string;
  icon: React.ReactNode;
  badge?: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative grid place-items-center content-center gap-1 rounded-[0.65rem] border border-[var(--color-pdp-rule)] bg-white text-[0.68rem] text-[var(--color-pdp-ink-soft)] transition hover:border-[var(--color-pdp-accent-border)] hover:bg-[var(--color-pdp-accent-soft)]",
        compact ? "min-h-[2.65rem]" : "min-h-[3.65rem]",
      ].join(" ")}
    >
      <span className="text-[var(--color-pdp-accent)]">{icon}</span>
      <span>{label}</span>
      {badge ? (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-[var(--color-pdp-success-soft)] px-1.5 py-0.5 text-[0.5rem] font-semibold text-[var(--color-pdp-success)]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function InspectorSection({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--color-pdp-rule)] p-4">
      <div className="mb-3 flex min-h-6 items-center justify-between">
        <h2 className="text-[0.75rem] font-medium">{title}</h2>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function EffectGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 mb-4 overflow-hidden rounded-[0.65rem] border border-[var(--color-pdp-rule-strong)]">
      {children}
    </div>
  );
}

function EffectRow({
  label,
  icon,
  toggle = false,
  value,
}: {
  label: string;
  icon: React.ReactNode;
  toggle?: boolean;
  value?: string;
}) {
  return (
    <button
      type="button"
      className="flex h-12 w-full items-center gap-3 border-b border-[var(--color-pdp-rule)] px-4 text-left text-[0.75rem] text-[var(--color-pdp-ink-soft)] transition last:border-b-0 hover:bg-[var(--color-pdp-surface-soft)]"
    >
      <span className="text-[var(--color-pdp-accent)]">{icon}</span>
      <span className="flex-1">{label}</span>
      {value ? (
        <span className="text-[0.68rem] text-[var(--color-pdp-muted)]">
          {value}
        </span>
      ) : null}
      {toggle ? (
        <span className="relative h-5 w-9 rounded-full bg-[var(--color-pdp-rule-strong)]">
          <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm" />
        </span>
      ) : null}
      <CaretRight size={15} className="text-[var(--color-pdp-muted)]" />
    </button>
  );
}
