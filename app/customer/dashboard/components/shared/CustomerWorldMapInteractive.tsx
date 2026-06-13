"use client";

import { useRef, useState, type MouseEvent } from "react";
import { cn } from "@/app/shared/lib/utils";
import type { MapCountryPath } from "../../utils/map/prepareCustomerMapData";
import { flagFromIso2 } from "../../utils/geo";

interface CustomerWorldMapInteractiveProps {
  width: number;
  height: number;
  countries: MapCountryPath[];
}

interface HoverState {
  country: MapCountryPath;
  x: number;
  y: number;
  maxX: number;
}

const bucketFill = [
  "var(--customer-surface-soft)",
  "#C7D6FF",
  "#8FADFF",
  "#4A7AF6",
  "var(--brand-blue)",
];

function getTooltipLabel(count: number): string {
  if (count === 0) return "no try-ons";
  if (count === 1) return "try-on";
  return "try-ons";
}

export function CustomerWorldMapInteractive({
  width,
  height,
  countries,
}: CustomerWorldMapInteractiveProps) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalTryOns = countries.reduce((sum, country) => sum + country.count, 0);

  const handleMove = (event: MouseEvent<SVGPathElement>, country: MapCountryPath) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setHover({
      country,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      maxX: Math.max(0, rect.width - 200),
    });
  };

  return (
    <div className="flex flex-col gap-[var(--spacing-customer-gap-md)]">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-[0.833vw] bg-customer-soft/50 max-lg:rounded-[4vw]"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full"
          aria-label="Customer countries world map"
          onMouseLeave={() => setHover(null)}
        >
          <g>
            {countries.map((country, index) => {
              const isHovered =
                hover?.country.numeric === country.numeric && hover.country.name === country.name;

              return (
                <path
                  key={`${country.numeric}-${index}`}
                  d={country.path}
                  fill={bucketFill[country.bucket]}
                  stroke={isHovered ? "var(--brand-blue)" : "var(--customer-border-strong)"}
                  strokeWidth={isHovered ? 1.2 : 0.4}
                  onMouseEnter={(event) => handleMove(event, country)}
                  onMouseMove={(event) => handleMove(event, country)}
                  className={cn(
                    "transition-all duration-75",
                    country.count > 0 ? "cursor-pointer" : "cursor-default",
                    isHovered && "opacity-90",
                  )}
                  style={isHovered ? { filter: "brightness(1.08)" } : undefined}
                />
              );
            })}
          </g>
        </svg>

        {hover ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 min-w-[8.333vw] rounded-[0.417vw] border border-customer-border bg-customer-card px-[var(--spacing-customer-gap-md)] py-[var(--spacing-customer-gap-sm)] shadow-customer-card max-lg:min-w-[38vw] max-lg:rounded-[3vw] max-lg:px-[3vw] max-lg:py-[2vw]"
            style={{
              left: Math.min(hover.x + 12, hover.maxX),
              top: Math.max(hover.y - 12, 0),
            }}
          >
            <div className="flex items-center gap-[0.417vw] max-lg:gap-[2vw]">
              {hover.country.iso2 ? (
                <span className="text-customer-lg leading-none max-lg:text-[5vw]">
                  {flagFromIso2(hover.country.iso2)}
                </span>
              ) : null}
              <span className="text-customer-sm font-semibold text-text-primary max-lg:text-[3.4vw]">
                {hover.country.name}
              </span>
            </div>
            <div className="mt-[0.313vw] flex items-baseline gap-[0.313vw] max-lg:mt-[1vw] max-lg:gap-[1.5vw]">
              <span className="text-customer-xl font-semibold tabular-nums text-text-primary max-lg:text-[4.5vw]">
                {hover.country.count.toLocaleString()}
              </span>
              <span className="text-customer-xs text-customer-muted max-lg:text-[3vw]">
                {getTooltipLabel(hover.country.count)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-[var(--spacing-customer-gap-md)]">
        <div className="flex items-center gap-[0.521vw] text-customer-xs text-customer-muted max-lg:gap-[2vw] max-lg:text-[3vw]">
          <span>Less</span>
          {bucketFill.slice(1).map((fill) => (
            <span
              key={fill}
              className="h-[0.521vw] w-[0.938vw] rounded-[0.104vw] max-lg:h-[2vw] max-lg:w-[3.5vw] max-lg:rounded-[0.8vw]"
              style={{ background: fill }}
            />
          ))}
          <span>More</span>
        </div>
        <div className="text-customer-xs text-customer-muted max-lg:text-[3vw]">
          {totalTryOns > 0
            ? `${totalTryOns.toLocaleString()} ${getTooltipLabel(totalTryOns)}`
            : "No customer countries yet"}
        </div>
      </div>
    </div>
  );
}
