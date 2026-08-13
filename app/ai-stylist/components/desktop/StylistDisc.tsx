"use client";

import { useEffect, useRef } from "react";

interface StylistDiscProps {
  rotationRef: React.RefObject<number>;
  bottomPercent?: number;
  perspective?: number;
  scale?: number;
  tilt?: number;
}

const SCREW_MARKERS = Array.from({ length: 12 }, (_, index) => {
  const angle = (index / 12) * Math.PI * 2;
  return {
    left: `${(50 + Math.cos(angle) * 45).toFixed(4)}%`,
    top: `${(50 + Math.sin(angle) * 43).toFixed(4)}%`,
  };
});

/**
 * Figma-matched turntable shell. The silhouette stays fixed in perspective,
 * while the brushed-metal surface and markers rotate with the model carousel.
 */
export function StylistDisc({
  rotationRef,
  bottomPercent = 22.8,
  perspective = 100,
  scale = 100,
  tilt = 0,
}: StylistDiscProps) {
  const rotatingTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId = 0;

    const update = () => {
      if (rotatingTopRef.current) {
        const degrees = ((rotationRef.current ?? 0) * 180) / Math.PI;
        rotatingTopRef.current.style.transform =
          `translate(-50%, -50%) scaleY(0.27) rotate(${degrees}deg)`;
      }
      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [rotationRef]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 z-[3] w-[96%]"
      style={{
        bottom: `${bottomPercent}%`,
        transform: `translateX(-50%) perspective(900px) rotateX(${tilt}deg) scale(${scale / 100}) scaleY(${perspective / 100})`,
        transformOrigin: "center center",
      }}
    >
      {/* Perspective shell from the approved Figma reference. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/ai-stylist/platform-disc-tight.png"
        alt=""
        className="relative z-[2] block h-auto w-full brightness-[1.18] saturate-[0.32] contrast-[1.08] drop-shadow-[0_0.72vw_0.62vw_rgba(38,38,43,0.28)]"
        draggable={false}
      />

      {/*
       * The source texture contains a circular metal plate inside a portrait
       * PNG. Crop that circle in this square, rotate it, then apply the
       * perspective compression. This keeps the whole top surface aligned
       * with the photographed shell instead of rotating a smaller oval over it.
       */}
      <div
        ref={rotatingTopRef}
        className="absolute left-1/2 top-[37.5%] z-[3] aspect-square w-[96.9%] origin-center overflow-hidden rounded-full"
        style={{
          filter: "brightness(1.24) contrast(1.08) saturate(0.22)",
          transform:
            "translate(-50%, -50%) scaleY(0.27) rotate(0deg)",
          willChange: "transform",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai-stylist/disc-top-texture.png"
          alt=""
          className="absolute left-0 top-[-23.5%] h-auto w-full"
          draggable={false}
        />
        {SCREW_MARKERS.map((marker, index) => (
          <span
            key={index}
            className="absolute h-[0.22vw] w-[0.22vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#68676b]/70 shadow-[0_0_0.12vw_rgba(255,255,255,0.88)]"
            style={{ left: marker.left, top: marker.top }}
          />
        ))}
      </div>

      {/*
       * Repaint the near rim above the rotating top. It is the same real disc
       * asset, clipped at the physical front edge, so the top cannot spill over
       * the rim as it turns.
       */}
      <div
        className="pointer-events-none absolute inset-0 z-[4] overflow-hidden"
        style={{ clipPath: "inset(72% 0 0 0)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai-stylist/platform-disc-tight.png"
          alt=""
          className="block h-auto w-full brightness-[1.18] saturate-[0.32] contrast-[1.08]"
          draggable={false}
        />
      </div>
    </div>
  );
}
