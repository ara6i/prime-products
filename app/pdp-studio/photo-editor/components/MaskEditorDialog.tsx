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
        "fixed inset-0 z-[1000] grid place-items-center bg-black/55 backdrop-blur-[7px]",
        isRetouch ? "p-0" : "p-4",
      ].join(" ")}
    >
      <div
        className={[
          "grid min-h-0 overflow-hidden bg-[#1e1f22] shadow-[0_30px_90px_rgba(0,0,0,0.42)]",
          isRetouch
            ? "size-full rounded-none border-0 md:grid-cols-[60.5%_39.5%]"
            : "h-[min(45rem,calc(100vh-3rem))] w-[min(54rem,calc(100vw-3rem))] rounded-[1rem] border border-white/10 md:grid-cols-[58%_42%]",
        ].join(" ")}
      >
        <section className="relative grid min-h-0 place-items-center bg-[#27282c]">
          <div className="absolute left-4 top-4 z-20 flex overflow-hidden rounded-[0.75rem] border border-white/15 bg-[#37383d] shadow-sm">
            <button
              type="button"
              aria-label="Undo brush stroke"
              disabled={!ui.strokes.length}
              onClick={ui.undo}
              className="grid size-10 place-items-center border-r border-white/10 text-white/65 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowCounterClockwise size={20} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Redo brush stroke"
              disabled={!ui.redoStrokes.length}
              onClick={ui.redo}
              className="grid size-10 place-items-center text-white/65 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
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
            "flex min-h-0 flex-col overflow-y-auto text-white",
            isRetouch ? "bg-[#111214]" : "bg-[#202124]",
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
          className="text-[1.6rem] font-semibold tracking-[-0.025em]"
        >
          Magic Retouch
        </h2>
        <p className="mt-2 max-w-[34ch] text-[0.75rem] leading-5 text-white/62">
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
          className="text-center text-[1.4rem] font-semibold tracking-[-0.02em]"
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

        <div className="mt-5 grid grid-cols-2 rounded-[0.6rem] bg-[#2c2d32] p-0.5">
          {(["guided", "manual"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={ui.cutoutTab === tab}
              onClick={() => ui.setCutoutTab(tab)}
              className={[
                "h-10 rounded-[0.5rem] text-[0.75rem] font-medium capitalize transition",
                ui.cutoutTab === tab
                  ? "bg-[#315cff] text-white"
                  : "text-white/72 hover:bg-white/5",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>

        {ui.cutoutTab === "guided" ? (
          <p className="mt-2 text-[0.7rem] leading-5 text-white/68">
            Objects are automatically detected to make your life easier!
          </p>
        ) : (
          <>
            <p className="mt-2 text-[0.7rem] leading-5 text-white/68">
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
                className="text-center text-[0.7rem] text-white"
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
      ? "border-[#ff485b] bg-[#4a2026] text-[#ff485b]"
      : "border-[#00c88a] bg-[#153c33] text-[#00d396]";

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "group grid justify-items-center gap-1.5 rounded-[0.75rem] text-[0.7rem] font-medium outline-none focus-visible:[&>span:first-child]:ring-2",
        tone === "red"
          ? "focus-visible:[&>span:first-child]:ring-[#ff485b]"
          : "focus-visible:[&>span:first-child]:ring-[#00c88a]",
      ].join(" ")}
    >
      <span
        className={[
          "relative grid size-[4.8rem] place-items-center rounded-full border-[3px] transition",
          selected ? toneClasses : "border-transparent bg-[#22282a] text-white/64",
        ].join(" ")}
      >
        {icon}
        {selected ? (
          <span
            className={[
              "absolute -bottom-1 -right-0.5 grid size-6 place-items-center rounded-full text-white",
              tone === "red" ? "bg-[#ff485b]" : "bg-[#00b87b]",
            ].join(" ")}
          >
            <Check size={14} weight="bold" aria-hidden />
          </span>
        ) : null}
      </span>
      <span className={selected ? (tone === "red" ? "text-[#ff5b69]" : "text-[#00d396]") : ""}>
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
      <span className="text-[0.7rem] font-semibold text-white">Brush size</span>
      <input
        aria-label="Brush size"
        type="range"
        min={18}
        max={110}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-1 w-full cursor-pointer accent-[#315cff]"
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
    <div className="mt-auto border-t border-white/8 p-4">
      <button
        type="button"
        disabled={confirmDisabled || confirmBusy}
        onClick={() => void onConfirm()}
        className="h-12 w-full rounded-[0.7rem] bg-[#315cff] text-[0.8rem] font-medium text-white transition hover:bg-[#234be5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8aa1ff] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/45"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-2 h-10 w-full text-[0.75rem] font-medium text-[#8199ff] transition hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}
