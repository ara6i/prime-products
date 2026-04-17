"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollAnimationOptions {
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Animation duration (seconds) */
  duration?: number;
  /** ScrollTrigger start position */
  start?: string;
  /** Stagger delay between children */
  stagger?: number;
  /** Whether to animate children instead of the container */
  staggerChildren?: boolean;
  /** Custom selector for children to stagger */
  childSelector?: string;
  /** Disable the animation */
  disabled?: boolean;
}

/**
 * Fade-up animation triggered on scroll.
 * Animates the element (or its children with stagger) from below with opacity 0.
 */
export function useScrollFadeUp<T extends HTMLElement = HTMLDivElement>(
  options: ScrollAnimationOptions = {},
) {
  const ref = useRef<T>(null);
  const {
    delay = 0,
    duration = 0.8,
    start = "top 85%",
    stagger = 0.15,
    staggerChildren = false,
    childSelector = ":scope > *",
    disabled = false,
  } = options;

  useEffect(() => {
    if (disabled || !ref.current) return;
    const el = ref.current;

    if (staggerChildren) {
      const children = el.querySelectorAll(childSelector);
      gsap.set(children, { opacity: 0, y: 40 });
      gsap.to(children, {
        opacity: 1,
        y: 0,
        duration,
        delay,
        stagger,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: "play none none none",
        },
      });
    } else {
      gsap.set(el, { opacity: 0, y: 40 });
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: "play none none none",
        },
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === el) t.kill();
      });
    };
  }, [delay, duration, start, stagger, staggerChildren, childSelector, disabled]);

  return ref;
}

/**
 * Fade-in animation (no vertical movement) triggered on scroll.
 */
export function useScrollFadeIn<T extends HTMLElement = HTMLDivElement>(
  options: Omit<ScrollAnimationOptions, "staggerChildren" | "childSelector"> = {},
) {
  const ref = useRef<T>(null);
  const {
    delay = 0,
    duration = 0.8,
    start = "top 85%",
    disabled = false,
  } = options;

  useEffect(() => {
    if (disabled || !ref.current) return;
    const el = ref.current;

    gsap.set(el, { opacity: 0 });
    gsap.to(el, {
      opacity: 1,
      duration,
      delay,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start,
        toggleActions: "play none none none",
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === el) t.kill();
      });
    };
  }, [delay, duration, start, disabled]);

  return ref;
}

/**
 * Scale-up animation triggered on scroll.
 */
export function useScrollScale<T extends HTMLElement = HTMLDivElement>(
  options: ScrollAnimationOptions = {},
) {
  const ref = useRef<T>(null);
  const {
    delay = 0,
    duration = 0.8,
    start = "top 85%",
    stagger = 0.12,
    staggerChildren = false,
    childSelector = ":scope > *",
    disabled = false,
  } = options;

  useEffect(() => {
    if (disabled || !ref.current) return;
    const el = ref.current;

    if (staggerChildren) {
      const children = el.querySelectorAll(childSelector);
      gsap.set(children, { opacity: 0, scale: 0.9 });
      gsap.to(children, {
        opacity: 1,
        scale: 1,
        duration,
        delay,
        stagger,
        ease: "back.out(1.4)",
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: "play none none none",
        },
      });
    } else {
      gsap.set(el, { opacity: 0, scale: 0.9 });
      gsap.to(el, {
        opacity: 1,
        scale: 1,
        duration,
        delay,
        ease: "back.out(1.4)",
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: "play none none none",
        },
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === el) t.kill();
      });
    };
  }, [delay, duration, start, stagger, staggerChildren, childSelector, disabled]);

  return ref;
}

/**
 * Slide-in from left or right triggered on scroll.
 */
export function useScrollSlideIn<T extends HTMLElement = HTMLDivElement>(
  direction: "left" | "right" = "left",
  options: Omit<ScrollAnimationOptions, "staggerChildren" | "childSelector"> = {},
) {
  const ref = useRef<T>(null);
  const {
    delay = 0,
    duration = 0.9,
    start = "top 85%",
    disabled = false,
  } = options;

  useEffect(() => {
    if (disabled || !ref.current) return;
    const el = ref.current;
    const x = direction === "left" ? -60 : 60;

    gsap.set(el, { opacity: 0, x });
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration,
      delay,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start,
        toggleActions: "play none none none",
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === el) t.kill();
      });
    };
  }, [direction, delay, duration, start, disabled]);

  return ref;
}

/**
 * Draw-line animation for SVG lines triggered on scroll.
 */
export function useScrollDrawLine<T extends SVGSVGElement = SVGSVGElement>(
  options: Omit<ScrollAnimationOptions, "staggerChildren" | "childSelector"> = {},
) {
  const ref = useRef<T>(null);
  const {
    delay = 0,
    duration = 1.2,
    start = "top 80%",
    disabled = false,
  } = options;

  useEffect(() => {
    if (disabled || !ref.current) return;
    const svg = ref.current;
    const line = svg.querySelector("line");
    if (!line) return;

    const length = Math.sqrt(
      Math.pow(parseFloat(line.getAttribute("x2") || "0") - parseFloat(line.getAttribute("x1") || "0"), 2) +
      Math.pow(parseFloat(line.getAttribute("y2") || "0") - parseFloat(line.getAttribute("y1") || "0"), 2),
    );

    gsap.set(line, { strokeDashoffset: length });
    gsap.to(line, {
      strokeDashoffset: 0,
      duration,
      delay,
      ease: "power2.inOut",
      scrollTrigger: {
        trigger: svg,
        start,
        toggleActions: "play none none none",
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === svg) t.kill();
      });
    };
  }, [delay, duration, start, disabled]);

  return ref;
}

/**
 * Counter animation for numbers triggered on scroll.
 */
export function useScrollCounter<T extends HTMLElement = HTMLElement>(
  endValue: number,
  options: Omit<ScrollAnimationOptions, "staggerChildren" | "childSelector"> = {},
) {
  const ref = useRef<T>(null);
  const {
    delay = 0,
    duration = 1.5,
    start = "top 85%",
    disabled = false,
  } = options;

  useEffect(() => {
    if (disabled || !ref.current) return;
    const el = ref.current;
    const obj = { val: 0 };

    gsap.to(obj, {
      val: endValue,
      duration,
      delay,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start,
        toggleActions: "play none none none",
      },
      onUpdate: () => {
        el.textContent = Math.round(obj.val).toLocaleString();
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === el) t.kill();
      });
    };
  }, [endValue, delay, duration, start, disabled]);

  return ref;
}
