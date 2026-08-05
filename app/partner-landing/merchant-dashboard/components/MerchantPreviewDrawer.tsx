"use client";

import { ArrowRight, CheckCircle, Info, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef } from "react";
import styles from "./merchantPreviewDrawer.module.css";

export interface MerchantPreviewDrawerContent {
  eyebrow?: string;
  title: string;
  description: string;
  steps: Array<{ title: string; detail: string }>;
  evidence?: Array<{ label: string; value: string }>;
}

interface MerchantPreviewDrawerProps {
  content: MerchantPreviewDrawerContent | null;
  onClose: () => void;
}

export function MerchantPreviewDrawer({ content, onClose }: MerchantPreviewDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!content) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = closeRef.current?.closest('[role="dialog"]');
      if (!(drawer instanceof HTMLElement)) return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const activeIndex = focusable.findIndex((element) => element === document.activeElement);
      const nextIndex = activeIndex < 0
        ? 0
        : event.shiftKey
          ? (activeIndex - 1 + focusable.length) % focusable.length
          : (activeIndex + 1) % focusable.length;
      event.preventDefault();
      focusable[nextIndex].focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [content, onClose]);

  if (!content) return null;

  return (
    <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className={styles.header}>
          <div>
            <span>{content.eyebrow ?? "Action preview"}</span>
            <h2 id={titleId}>{content.title}</h2>
            <p id={descriptionId}>{content.description}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close action preview">
            <X size={22} weight="bold" aria-hidden />
          </button>
        </header>

        <p className={styles.demoNotice}><Info size={19} weight="fill" aria-hidden />Demo preview only — no changes will be saved.</p>

        <ol className={styles.steps}>
          {content.steps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <div><strong>{step.title}</strong><p>{step.detail}</p></div>
              <CheckCircle size={21} weight="duotone" aria-hidden />
            </li>
          ))}
        </ol>

        {content.evidence?.length ? (
          <details className={styles.evidence}>
            <summary>Review supporting details</summary>
            <dl>
              {content.evidence.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
            </dl>
          </details>
        ) : null}

        <footer className={styles.footer}>
          <button type="button" onClick={onClose}>Return to dashboard <ArrowRight size={17} weight="bold" aria-hidden /></button>
        </footer>
      </aside>
    </div>
  );
}
