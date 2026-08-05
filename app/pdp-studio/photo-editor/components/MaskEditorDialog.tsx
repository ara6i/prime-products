"use client";

import Image from "next/image";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Check,
  Eraser,
  PaintBrush,
} from "@phosphor-icons/react";
import type { PhotoEditorWorkspaceController } from "../hooks/usePhotoEditorWorkspace";
import type { MaskMode } from "../types/photoEditor";
import { PhotoMaskCanvas } from "./PhotoMaskCanvas";

interface MaskEditorDialogProps {
  ui: PhotoEditorWorkspaceController;
}

export function MaskEditorDialog({ ui }: MaskEditorDialogProps) {
  if (!ui.dialog) return null;

  const maskMode: MaskMode =
    ui.dialog === "retouch" ? "retouch" : ui.cutoutMode;
  const isRetouch = ui.dialog === "retouch";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-mask-editor-title"
      className={[
        "fixed inset-0 z-[1000] grid place-items-center bg-[var(--color-pdp-ink)]/28 backdrop-blur-[5px]",
        isRetouch ? "p-0" : "p-4",
      ].join(" ")}
    >
      <div
        className={[
          "grid min-h-0 overflow-hidden bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)] shadow-[var(--shadow-pdp-overlay)]",
          isRetouch
            ? "size-full grid-rows-[minmax(16rem,1fr)_minmax(15rem,45dvh)] rounded-none border-0 md:grid-cols-[60.5%_39.5%] md:grid-rows-1"
            : "h-[min(45rem,calc(100dvh-1.5rem))] w-[min(54rem,calc(100vw-1.5rem))] grid-rows-[minmax(15rem,1fr)_minmax(15rem,45dvh)] rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] md:grid-cols-[58%_42%] md:grid-rows-1",
        ].join(" ")}
      >
        <section className="relative grid min-h-0 place-items-center bg-[var(--color-pdp-paper)]">
          <div className="absolute left-4 top-4 z-20 flex overflow-hidden rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] bg-white shadow-[var(--shadow-pdp-card)]">
            <button
              type="button"
              aria-label="Undo brush stroke"
              disabled={!ui.strokes.length}
              onClick={ui.undo}
              className="grid size-10 place-items-center border-r border-[var(--color-pdp-rule)] text-[var(--color-pdp-ink-soft)] transition hover:bg-[var(--color-pdp-surface-soft)] hover:text-[var(--color-pdp-ink)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowCounterClockwise size={20} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Redo brush stroke"
              disabled={!ui.redoStrokes.length}
              onClick={ui.redo}
              className="grid size-10 place-items-center text-[var(--color-pdp-ink-soft)] transition hover:bg-[var(--color-pdp-surface-soft)] hover:text-[var(--color-pdp-ink)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowClockwise size={20} aria-hidden />
            </button>
          </div>

          <PhotoMaskCanvas
            imageUrl={ui.imageUrl}
            imageAspectRatio={ui.imageAspectRatio}
            mode={maskMode}
            brushSize={ui.brushSize}
            strokes={ui.strokes}
            onAddStroke={ui.addStroke}
          />
        </section>

        <aside
          className={[
            "flex min-h-0 flex-col overflow-y-auto border-t border-[var(--color-pdp-rule)] text-[var(--color-pdp-ink)] md:border-l md:border-t-0",
            isRetouch ? "bg-white" : "bg-[var(--color-pdp-surface)]",
          ].join(" ")}
        >
          {ui.dialog === "retouch" ? (
            <RetouchControls ui={ui} />
          ) : (
            <CutoutControls ui={ui} />
          )}
        </aside>
      </div>
    </div>
  );
}

function RetouchControls({ ui }: MaskEditorDialogProps) {
  return (
    <>
      <div className="p-4">
        <h2
          id="photo-mask-editor-title"
          className="text-[1.6rem] font-medium tracking-[-0.025em]"
        >
          Magic Retouch
        </h2>
        <p className="mt-2 max-w-[34ch] text-[0.75rem] leading-5 text-[var(--color-pdp-muted)]">
          Paint over the unwanted parts of your image, and let PDP Studio work
          its magic.
        </p>
        <BrushSizeControl value={ui.brushSize} onChange={ui.setBrushSize} />
      </div>
      <DialogActions
        onConfirm={ui.confirmEditing}
        onCancel={ui.cancelEditing}
        confirmDisabled={!ui.canApplyRetouch}
        confirmBusy={ui.busy}
        confirmLabel={
          ui.busy
            ? "Applying retouch…"
            : ui.canApplyRetouch
              ? "Apply retouch"
              : "Upload and brush an area"
        }
      />
    </>
  );
}

function CutoutControls({ ui }: MaskEditorDialogProps) {
  return (
    <>
      <div className="p-4 md:p-5">
        <h2
          id="photo-mask-editor-title"
          className="text-center text-[1.4rem] font-medium tracking-[-0.02em]"
        >
          Edit Cutout
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-5 px-4">
          <ModeButton
            label="Erase"
            selected={ui.cutoutMode === "erase"}
            tone="red"
            icon={<Eraser size={29} weight="regular" aria-hidden />}
            onClick={() => ui.setCutoutMode("erase")}
          />
          <ModeButton
            label="Restore"
            selected={ui.cutoutMode === "restore"}
            tone="green"
            icon={<PaintBrush size={28} weight="regular" aria-hidden />}
            onClick={() => ui.setCutoutMode("restore")}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-[0.6rem] bg-[var(--color-pdp-surface-soft)] p-0.5">
          {(["guided", "manual"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={ui.cutoutTab === tab}
              onClick={() => ui.setCutoutTab(tab)}
              className={[
                "h-10 rounded-[0.5rem] text-[0.75rem] font-medium capitalize transition",
                ui.cutoutTab === tab
                  ? "bg-[var(--color-pdp-ink)] text-white"
                  : "text-[var(--color-pdp-muted)] hover:bg-white",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>

        {ui.cutoutTab === "guided" ? (
          <p className="mt-2 text-[0.7rem] leading-5 text-[var(--color-pdp-muted)]">
            Objects are automatically detected to make your life easier!
          </p>
        ) : (
          <>
            <p className="mt-2 text-[0.7rem] leading-5 text-[var(--color-pdp-muted)]">
              Use the mouse to {ui.cutoutMode} pixels manually.
            </p>
            <BrushSizeControl
              value={ui.brushSize}
              onChange={ui.setBrushSize}
              compact
            />
          </>
        )}

        <h3 className="mt-11 text-[0.85rem] font-semibold">
          Cutout Suggestions
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["no-cutout", "original-cutout"] as const).map((suggestion) => {
            const selected = ui.cutoutSuggestion === suggestion;
            const label =
              suggestion === "no-cutout" ? "No cutout" : "Original cutout";
            return (
              <button
                key={suggestion}
                type="button"
                aria-pressed={selected}
                onClick={() => ui.setCutoutSuggestion(suggestion)}
                className="text-center text-[0.7rem] text-[var(--color-pdp-ink)]"
              >
                <span
                  className={[
                    "relative block aspect-square overflow-hidden rounded-[0.65rem] border bg-white",
                    selected
                      ? "border-[#7190ff] ring-2 ring-[#315cff]"
                      : "border-white/20",
                    suggestion === "original-cutout"
                      ? "bg-[linear-gradient(45deg,#f2f2f2_25%,transparent_25%),linear-gradient(-45deg,#f2f2f2_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f2f2f2_75%),linear-gradient(-45deg,transparent_75%,#f2f2f2_75%)] bg-[length:18px_18px] [background-position:0_0,0_9px,9px_-9px,-9px_0px]"
                      : "",
                  ].join(" ")}
                >
                  <Image
                    src={ui.imageUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="150px"
                    className="object-contain"
                  />
                </span>
                <span className="mt-1.5 block">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <DialogActions
        onConfirm={ui.confirmEditing}
        onCancel={ui.cancelEditing}
      />
    </>
  );
}

function ModeButton({
  label,
  selected,
  tone,
  icon,
  onClick,
}: {
  label: string;
  selected: boolean;
  tone: "red" | "green";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const toneClasses =
    tone === "red"
      ? "border-[var(--color-pdp-danger)] bg-[var(--color-pdp-danger-soft)] text-[var(--color-pdp-danger)]"
      : "border-[var(--color-pdp-success)] bg-[var(--color-pdp-success-soft)] text-[var(--color-pdp-success)]";

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "group grid justify-items-center gap-1.5 rounded-[0.75rem] text-[0.7rem] font-medium outline-none focus-visible:[&>span:first-child]:ring-2",
        tone === "red"
          ? "focus-visible:[&>span:first-child]:ring-[var(--color-pdp-danger)]"
          : "focus-visible:[&>span:first-child]:ring-[var(--color-pdp-success)]",
      ].join(" ")}
    >
      <span
        className={[
          "relative grid size-[4.8rem] place-items-center rounded-full border-[3px] transition",
          selected ? toneClasses : "border-transparent bg-[var(--color-pdp-surface-soft)] text-[var(--color-pdp-muted)]",
        ].join(" ")}
      >
        {icon}
        {selected ? (
          <span
            className={[
              "absolute -bottom-1 -right-0.5 grid size-6 place-items-center rounded-full text-white",
              tone === "red" ? "bg-[var(--color-pdp-danger)]" : "bg-[var(--color-pdp-success)]",
            ].join(" ")}
          >
            <Check size={14} weight="bold" aria-hidden />
          </span>
        ) : null}
      </span>
      <span className={selected ? (tone === "red" ? "text-[var(--color-pdp-danger)]" : "text-[var(--color-pdp-success)]") : ""}>
        {label}
      </span>
    </button>
  );
}

function BrushSizeControl({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  return (
    <label className={compact ? "mt-3 block" : "mt-3 block"}>
      <span className="text-[0.7rem] font-medium text-[var(--color-pdp-ink)]">Brush size</span>
      <input
        aria-label="Brush size"
        type="range"
        min={18}
        max={110}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-1 w-full cursor-pointer accent-[var(--color-pdp-accent)]"
      />
    </label>
  );
}

function DialogActions({
  onConfirm,
  onCancel,
  confirmDisabled = false,
  confirmBusy = false,
  confirmLabel = "Confirm",
}: {
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmDisabled?: boolean;
  confirmBusy?: boolean;
  confirmLabel?: string;
}) {
  return (
    <div className="mt-auto border-t border-[var(--color-pdp-rule)] bg-white p-4">
      <button
        type="button"
        disabled={confirmDisabled || confirmBusy}
        onClick={() => void onConfirm()}
        className="h-12 w-full rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-accent)] text-[0.8rem] font-medium text-white transition hover:bg-[var(--color-pdp-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pdp-focus)] disabled:cursor-not-allowed disabled:bg-[var(--color-pdp-rule)] disabled:text-[var(--color-pdp-muted)]"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-2 h-10 w-full text-[0.75rem] font-medium text-[var(--color-pdp-accent)] transition hover:text-[var(--color-pdp-accent-hover)]"
      >
        Cancel
      </button>
    </div>
  );
}
