"use client";

import { LocationIcon, CloudIcon } from "@/app/shared/components/icons";
import type { WeatherData } from "@/app/shared/types";

interface WeatherPillProps {
  data: WeatherData;
  size?: "sm" | "md";
}

export function WeatherPill({ data, size = "sm" }: WeatherPillProps) {
  const textClass =
    size === "md"
      ? "text-[14px] leading-[22px] md:text-[0.833vw] md:leading-[1.354vw]"
      : "text-[14px] leading-[22px] md:text-[0.729vw] md:leading-[1.146vw]";

  return (
    <div className="flex min-h-[42px] items-center gap-4 rounded-[24px] bg-weather-pill-bg px-4 py-2 md:min-h-0 md:gap-[0.833vw] md:rounded-[1.563vw] md:px-[0.833vw] md:py-[0.417vw]">
      <div className="flex items-center gap-1 md:gap-[0.208vw]">
        <LocationIcon
          size={24}
          className="!h-6 !w-6 md:!h-[1.25vw] md:!w-[1.25vw]"
          color="var(--accent-purple)"
        />
        <span className={`${textClass} font-normal text-text-muted`}>
          {data.location}
        </span>
      </div>

      <div className="h-[26px] w-px bg-weather-pill-divider md:h-[1.354vw]" />

      <div className="flex items-center gap-1 md:gap-[0.208vw]">
        <CloudIcon
          size={24}
          className="!h-6 !w-6 md:!h-[1.25vw] md:!w-[1.25vw]"
          color="var(--weather-cloud)"
        />
        <span className={`${textClass} font-normal text-text-muted`}>
          {data.temperature}
        </span>
      </div>

      <div className="h-[26px] w-px bg-weather-pill-divider md:h-[1.354vw]" />

      <span className={`${textClass} font-normal text-text-muted`}>
        {data.condition}
      </span>
    </div>
  );
}
