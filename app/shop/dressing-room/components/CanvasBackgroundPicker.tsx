"use client";

import { Check, Palette } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  DressingRoomBackgroundId,
  DressingRoomBackgroundPreset,
} from "../data/dressingRoom.data";
import styles from "./dressingRoom.module.css";

type CanvasBackgroundPickerProps = {
  backgrounds: readonly DressingRoomBackgroundPreset[];
  selectedId: DressingRoomBackgroundId;
  onSelect: (id: DressingRoomBackgroundId) => void;
};

export function CanvasBackgroundPicker({
  backgrounds,
  selectedId,
  onSelect,
}: CanvasBackgroundPickerProps) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsidePointer(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointer);
  }, []);

  return (
    <div ref={pickerRef} className={styles.backgroundPicker}>
      <button
        type="button"
        className={styles.backgroundTrigger}
        aria-label="Choose canvas background"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Canvas background"
        onClick={() => setOpen((current) => !current)}
      >
        <Palette size={16} />
      </button>

      {open && (
        <div
          className={styles.backgroundMenu}
          role="radiogroup"
          aria-label="Canvas background"
        >
          <span>Canvas background</span>
          {backgrounds.map((background) => {
            const selected = background.id === selectedId;
            const previewStyle = {
              "--background-preview-color": background.color,
              "--background-preview-image": background.imageUrl
                ? `url("${background.imageUrl}")`
                : "none",
              "--background-preview-width": `${background.previewWidth}px`,
              "--background-preview-height": `${background.previewHeight}px`,
            } as CSSProperties;

            return (
              <button
                key={background.id}
                type="button"
                className={`${styles.backgroundOption} ${
                  selected ? styles.selectedBackgroundOption : ""
                }`}
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  onSelect(background.id);
                  setOpen(false);
                }}
              >
                <i style={previewStyle} aria-hidden="true" />
                <span>
                  <strong>{background.label}</strong>
                  <small>{background.description}</small>
                </span>
                {selected && <Check size={14} weight="bold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
