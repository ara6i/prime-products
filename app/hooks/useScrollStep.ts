"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollStep(stepCount: number) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer || stepCount <= 0) return;

    let raf = 0;
    const compute = () => {
      const rect = outer.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      if (total <= 0) {
        setProgress(0);
        setStep(0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = scrolled / total;
      setProgress(p);
      const idx = Math.min(Math.floor(p * stepCount), stepCount - 1);
      setStep(idx);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [stepCount]);

  const jumpToStep = (i: number) => {
    const outer = outerRef.current;
    if (!outer) return;
    const rect = outer.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const target = window.scrollY + rect.top + (i / stepCount) * total + 10;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return { outerRef, step, progress, jumpToStep };
}
