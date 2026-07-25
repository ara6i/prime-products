"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CarouselDirection = -1 | 1;

export function useHorizontalCarousel() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(true);

  const syncControls = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const remaining = viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft;
    setCanGoBack(viewport.scrollLeft > 2);
    setCanGoForward(remaining > 2);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const frame = window.requestAnimationFrame(syncControls);
    const resizeObserver = new ResizeObserver(syncControls);
    resizeObserver.observe(viewport);
    viewport.addEventListener("scroll", syncControls, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      viewport.removeEventListener("scroll", syncControls);
    };
  }, [syncControls]);

  const move = useCallback((direction: CarouselDirection) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const firstCard = viewport.querySelector<HTMLElement>("[data-carousel-item]");
    const distance = (firstCard?.offsetWidth ?? viewport.clientWidth * 0.8) + 12;
    viewport.scrollBy({ left: direction * distance, behavior: "smooth" });
  }, []);

  return {
    viewportRef,
    canGoBack,
    canGoForward,
    goBack: () => move(-1),
    goForward: () => move(1),
  };
}
