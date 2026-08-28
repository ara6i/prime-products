"use client";

import { Ruler, X } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import {
  ARC_JACKET_SIZE_ROWS,
  formatGuideMeasurement,
  formatGuideRange,
  type ArcJacketSize,
  type ArcJacketSizeUnit,
} from "./arcJacketSizeGuide";
import styles from "./merchantSizeGuideModal.module.css";

const CLOSE_ANIMATION_MS = 320;

type MerchantSizeGuideModalProps = {
  open: boolean;
  selectedSize: ArcJacketSize;
  onClose: () => void;
  onSelectSize: (size: ArcJacketSize) => void;
};

export function MerchantSizeGuideModal({
  open,
  selectedSize,
  onClose,
  onSelectSize,
}: MerchantSizeGuideModalProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [unit, setUnit] = useState<ArcJacketSizeUnit>("cm");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const activeRow =
    ARC_JACKET_SIZE_ROWS.find((row) => row.size === selectedSize) ??
    ARC_JACKET_SIZE_ROWS[2];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let frame: number | undefined;
    let visibilityFrame: number | undefined;
    let timeout: number | undefined;

    if (open) {
      frame = window.requestAnimationFrame(() => {
        setMounted(true);
        visibilityFrame = window.requestAnimationFrame(() => setVisible(true));
      });
    } else {
      frame = window.requestAnimationFrame(() => setVisible(false));
      timeout = window.setTimeout(
        () => setMounted(false),
        CLOSE_ANIMATION_MS,
      );
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (visibilityFrame) window.cancelAnimationFrame(visibilityFrame);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
      previousFocus?.focus();
    };
  }, [open]);

  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;

    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={styles.backdrop}
      data-visible={visible}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        id="arc-jacket-size-guide-dialog"
        className={styles.modal}
        data-visible={visible}
        role="dialog"
        aria-modal="true"
        aria-labelledby="arc-jacket-size-guide-title"
        onKeyDown={keepFocusInside}
      >
        <header className={styles.header}>
          <span aria-hidden="true">01 / Fit guide</span>
          <p>Arc Jacket / Size Info</p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
          >
            <X size={20} weight="regular" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.content}>
          <figure className={styles.diagram}>
            <Image
              src="/media/partner-landing/merchant-network/arc-jacket-size-guide-v1.png"
              alt="Cobalt Arc Jacket measurement diagram showing shoulder, bust, waist, sleeve, and jacket length lines"
              width={1023}
              height={1537}
              sizes="(max-width: 820px) 94vw, 45vw"
              quality={90}
              loading="eager"
            />
            <figcaption>Measure the garment laid flat and fully zipped.</figcaption>
          </figure>

          <div className={styles.guide}>
            <div className={styles.intro}>
              <p>Women&apos;s cropped outerwear</p>
              <h2 id="arc-jacket-size-guide-title">Find your Arc Jacket size.</h2>
              <span>
                Use your body bust and waist to choose a size. Shoulder, sleeve,
                and cropped length confirm how the jacket will sit.
              </span>
            </div>

            <div className={styles.guideToolbar}>
              <p>Garment measurements</p>
              <div className={styles.unitToggle} aria-label="Measurement unit">
                {(["cm", "in"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={unit === value ? styles.unitActive : undefined}
                    onClick={() => setUnit(value)}
                    aria-pressed={unit === value}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Size</th>
                    <th scope="col">Chest</th>
                    <th scope="col">Hem</th>
                    <th scope="col">Shoulder</th>
                    <th scope="col">Sleeve</th>
                    <th scope="col">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {ARC_JACKET_SIZE_ROWS.map((row) => (
                    <tr
                      key={row.size}
                      className={
                        row.size === selectedSize ? styles.selectedRow : undefined
                      }
                    >
                      <th scope="row">
                        <button
                          type="button"
                          onClick={() => onSelectSize(row.size)}
                          aria-pressed={row.size === selectedSize}
                        >
                          {row.size}
                        </button>
                      </th>
                      <td>{formatGuideMeasurement(row.chest, unit)}</td>
                      <td>{formatGuideMeasurement(row.hem, unit)}</td>
                      <td>{formatGuideMeasurement(row.shoulder, unit)}</td>
                      <td>{formatGuideMeasurement(row.sleeve, unit)}</td>
                      <td>{formatGuideMeasurement(row.length, unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.fitProfile} aria-live="polite">
              <span>Recommended body range for {selectedSize}</span>
              <div>
                <p>
                  <strong>Bust</strong>
                  {formatGuideRange(activeRow.bodyBust, unit)} {unit}
                </p>
                <p>
                  <strong>Waist</strong>
                  {formatGuideRange(activeRow.bodyWaist, unit)} {unit}
                </p>
              </div>
            </div>

            <div className={styles.bodyInputs}>
              <p>
                <Ruler size={17} weight="regular" aria-hidden="true" />
                Body measurements used for fitting
              </p>
              <span>Bust · Waist · Shoulder breadth · Arm length · Height</span>
            </div>

            <p className={styles.note}>
              Chest and hem are full garment circumference. Shoulder, sleeve,
              and back length are seam-to-seam. Allow ±1 cm production tolerance.
            </p>

            <footer className={styles.footer}>
              <span>Selected size: {selectedSize}</span>
              <button type="button" onClick={onClose}>
                Use size {selectedSize}
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
