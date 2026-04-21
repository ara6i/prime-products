"use client";

import { useState, useRef, type MouseEvent } from "react";
import { cn } from "@/app/shared/lib/utils";
import type { MapCountryPath } from "./prepareMapData";

interface Props {
  width: number;
  height: number;
  countries: MapCountryPath[];
  legendMax: number;
}

const bucketFill = [
  "var(--admin-map-fill)",
  "var(--admin-map-scale-1)",
  "var(--admin-map-scale-2)",
  "var(--admin-map-scale-3)",
  "var(--admin-map-scale-4)",
];

interface HoverState {
  country: MapCountryPath;
  x: number;
  y: number;
}

function flagFromIso2(iso2: string | null): string {
  if (!iso2 || iso2.length !== 2) return "";
  const base = 0x1f1a5;
  const codePoints = Array.from(iso2.toUpperCase()).map((c) => base + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function WorldMapInteractive({ width, height, countries, legendMax }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: MouseEvent<SVGPathElement>, country: MapCountryPath) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      country,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="flex flex-col gap-[var(--spacing-admin-gap-md)]">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-[0.417vw] bg-admin-muted/40 max-lg:rounded-lg"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          aria-label="Merchant countries world map"
          onMouseLeave={() => setHover(null)}
        >
          <g>
            {countries.map((c, idx) => {
              const isHovered = hover?.country.numeric === c.numeric && hover?.country.name === c.name;
              return (
                <path
                  key={`${c.numeric}-${idx}`}
                  d={c.path}
                  fill={bucketFill[c.bucket]}
                  stroke={isHovered ? "var(--brand-blue)" : "var(--admin-map-stroke)"}
                  strokeWidth={isHovered ? 1.2 : 0.4}
                  onMouseEnter={(e) => handleMove(e, c)}
                  onMouseMove={(e) => handleMove(e, c)}
                  className={cn(
                    "transition-all duration-75",
                    c.count > 0 ? "cursor-pointer" : "cursor-default",
                    isHovered && "opacity-90",
                  )}
                  style={isHovered ? { filter: "brightness(1.08)" } : undefined}
                />
              );
            })}
          </g>
        </svg>

        {hover && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 min-w-[8.333vw] rounded-[0.417vw] border border-admin-border bg-admin-surface-card shadow-admin-elevated px-[var(--spacing-admin-gap-md)] py-[var(--spacing-admin-gap-sm)] max-lg:min-w-[140px] max-lg:rounded-lg max-lg:px-3 max-lg:py-2"
            style={{
              left: Math.min(hover.x + 12, (containerRef.current?.clientWidth ?? 0) - 200),
              top: Math.max(hover.y - 12, 0),
            }}
          >
            <div className="flex items-center gap-[0.417vw] max-lg:gap-2">
              {hover.country.iso2 && (
                <span className="text-admin-lg leading-none max-lg:text-xl">
                  {flagFromIso2(hover.country.iso2)}
                </span>
              )}
              <span className="text-admin-sm font-semibold text-text-primary max-lg:text-sm">
                {hover.country.name}
              </span>
            </div>
            <div className="mt-[0.313vw] flex items-baseline gap-[0.313vw] max-lg:mt-1 max-lg:gap-1.5">
              <span className="text-admin-xl font-semibold text-text-primary tabular-nums max-lg:text-lg">
                {hover.country.count.toLocaleString()}
              </span>
              <span className="text-admin-xs text-text-hint max-lg:text-[11px]">
                {hover.country.count === 0
                  ? "no merchants"
                  : hover.country.count === 1
                    ? "merchant"
                    : "merchants"}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-[var(--spacing-admin-gap-md)]">
        <div className="flex items-center gap-[0.521vw] text-admin-xs text-text-hint max-lg:gap-2 max-lg:text-[11px]">
          <span>Less</span>
          {bucketFill.slice(1).map((fill, i) => (
            <span
              key={i}
              className="h-[0.521vw] w-[0.938vw] rounded-[0.104vw] max-lg:h-2 max-lg:w-3.5 max-lg:rounded-sm"
              style={{ background: fill }}
            />
          ))}
          <span>More</span>
        </div>
        <div className="text-admin-xs text-text-hint max-lg:text-[11px]">
          {legendMax > 0
            ? `${legendMax.toLocaleString()} max per country`
            : "No merchant countries yet"}
        </div>
      </div>
    </div>
  );
}
