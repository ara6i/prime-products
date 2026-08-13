"use client";

import { ArrowRight, CheckCircle, X } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { MerchantLandingViewModel } from "../types";
import styles from "./merchantLanding.module.css";

type DialogPhase = "opening" | "open" | "closing";

export function MerchantInterestDialog({
  viewModel,
  isOpen,
  message,
  submissionState,
  onClose,
  onSubmit,
}: {
  viewModel: MerchantLandingViewModel;
  isOpen: boolean;
  message: string;
  submissionState: "idle" | "submitting" | "success" | "error";
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<DialogPhase>("opening");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let phaseTimeout: number | undefined;

    const phaseFrame = window.requestAnimationFrame(() => {
      if (isOpen) {
        setIsMounted(true);
        setPhase("opening");
        phaseTimeout = window.setTimeout(() => setPhase("open"), 700);
      } else {
        setPhase("closing");
        phaseTimeout = window.setTimeout(() => setIsMounted(false), 700);
      }
    });

    return () => {
      window.cancelAnimationFrame(phaseFrame);
      if (phaseTimeout) window.clearTimeout(phaseTimeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted || !isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const focusFrame = window.requestAnimationFrame(() =>
      nameInputRef.current?.focus(),
    );

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMounted, isOpen, onClose]);

  useEffect(() => {
    if (!isMounted) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [isMounted]);

  if (!isMounted) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(new FormData(event.currentTarget));
  };

  return (
    <div
      className={styles.dialogBackdrop}
      data-state={phase}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="merchant-interest-title"
      >
        <button
          type="button"
          className={styles.dialogClose}
          onClick={onClose}
          aria-label="Close form"
        >
          <X size={20} />
        </button>
        <span>PrimeStyleAI Shopping Network</span>
        <h2 id="merchant-interest-title">{viewModel.interest.title}</h2>
        <p>{viewModel.interest.body}</p>
        {submissionState === "success" ? (
          <div className={styles.dialogSuccess}>
            <CheckCircle size={36} weight="fill" />
            <strong>{message}</strong>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              Name
              <input
                ref={nameInputRef}
                name="name"
                autoComplete="name"
                required
                placeholder="Your name"
              />
            </label>
            <label>
              Work email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@brand.com"
              />
            </label>
            <label>
              Brand website
              <input name="website" type="url" placeholder="https://" />
            </label>
            {message ? (
              <p className={styles.formMessage} data-state={submissionState}>
                {message}
              </p>
            ) : null}
            <button type="submit" disabled={submissionState === "submitting"}>
              {submissionState === "submitting"
                ? "Joining…"
                : "Join the network"}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
