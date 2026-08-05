"use client";

import { ArrowRight, CheckCircle, X } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import type { InfluencerLandingViewModel } from "../types";
import styles from "./influencerLanding.module.css";

export function InfluencerInterestDialog({ viewModel, isOpen, message, submissionState, onClose, onSubmit }: {
  viewModel: InfluencerLandingViewModel;
  isOpen: boolean;
  message: string;
  submissionState: "idle" | "submitting" | "success" | "error";
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let visibleFrame: number | undefined;
    if (isOpen) {
      const mountFrame = window.requestAnimationFrame(() => {
        setIsMounted(true);
        visibleFrame = window.requestAnimationFrame(() => setIsVisible(true));
      });
      return () => {
        window.cancelAnimationFrame(mountFrame);
        if (visibleFrame) window.cancelAnimationFrame(visibleFrame);
      };
    }

    const closeFrame = window.requestAnimationFrame(() => setIsVisible(false));
    const timeout = window.setTimeout(() => setIsMounted(false), 260);
    return () => {
      window.cancelAnimationFrame(closeFrame);
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

  if (!isMounted) return null;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void onSubmit(new FormData(event.currentTarget)); };
  return (
    <div className={styles.dialogBackdrop} data-state={isVisible ? "open" : "closed"} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="influencer-interest-title">
        <button type="button" className={styles.dialogClose} onClick={onClose} aria-label="Close form"><X size={20} /></button>
        <span>Creator waitlist</span><h2 id="influencer-interest-title">{viewModel.interest.title}</h2><p>{viewModel.interest.body}</p>
        {submissionState === "success" ? <div className={styles.dialogSuccess}><CheckCircle size={36} weight="fill" /><strong>{message}</strong><button type="button" onClick={onClose}>Close</button></div> : (
          <form onSubmit={handleSubmit}>
            <label>Name<input name="name" autoComplete="name" required placeholder="Your name" /></label>
            <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@email.com" /></label>
            <label>Creator profile<input name="website" type="url" placeholder="https://" /></label>
            {message ? <p className={styles.formMessage} data-state={submissionState}>{message}</p> : null}
            <button type="submit" disabled={submissionState === "submitting"}>{submissionState === "submitting" ? "Joining…" : "Join waitlist"}<ArrowRight size={17} /></button>
          </form>
        )}
      </section>
    </div>
  );
}
