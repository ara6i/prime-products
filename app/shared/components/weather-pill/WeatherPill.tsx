"use client";

import { LocationIcon, CloudIcon } from "@/app/shared/components/icons";
import type { WeatherData } from "@/app/shared/types";

interface WeatherPillProps {
  data: WeatherData;
}

export function WeatherPill({ data }: WeatherPillProps) {
  return (
    <div className="flex items-center gap-[0.833vw] rounded-[1.563vw] bg-weather-pill-bg px-[0.833vw] py-[0.417vw]">
      <div className="flex items-center gap-[0.208vw]">
        <LocationIcon size={24} className="!w-[1.25vw] !h-[1.25vw]" color="var(--accent-purple)" />
        <span className="text-[0.729vw] font-normal leading-[1.146vw] text-text-muted">
          {data.location}
        </span>
      </div>

      <div className="h-[1.354vw] w-px bg-weather-pill-divider" />

      <div className="flex items-center gap-[0.208vw]">
        <CloudIcon size={24} className="!w-[1.25vw] !h-[1.25vw]" color="var(--weather-cloud)" />
        <span className="text-[0.729vw] font-normal leading-[1.146vw] text-text-muted">
          {data.temperature}
        </span>
      </div>

      <div className="h-[1.354vw] w-px bg-weather-pill-divider" />

      <span className="text-[0.729vw] font-normal leading-[1.146vw] text-text-muted">
        {data.condition}
      </span>
    </div>
  );
}
