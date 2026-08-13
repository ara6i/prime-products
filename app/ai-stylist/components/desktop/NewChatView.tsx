"use client";

import { WeatherPill } from "./WeatherPill";
import { Button } from "@/app/shared/components/ui";
import { GenerateIcon } from "@/app/shared/components/icons";
import { History } from "lucide-react";
import type { WeatherData } from "@/app/shared/types";

interface NewChatViewProps {
  onStartStyling: () => void;
  onOpenHistory: () => void;
  isLoading?: boolean;
  weather?: WeatherData | null;
  userName?: string | null;
}

export function NewChatView({
  onStartStyling,
  onOpenHistory,
  isLoading,
  weather,
  userName,
}: NewChatViewProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-[1.25vw]">
      <div className="flex flex-col items-center gap-[0.625vw]">
        <h2 className="text-[1.042vw] font-normal leading-[1.771vw] text-text-primary">
          Hey{userName ? ` ${userName}` : ""}! 👋
        </h2>

        {weather && <WeatherPill data={weather} size="md" />}

        <div className="flex max-w-[27vw] flex-col items-center text-center text-[0.833vw] font-normal leading-[1.354vw] text-text-primary">
          <p>Answer four visual questions and get complete outfits from real catalog products.</p>
          <p className="mt-[0.208vw] text-text-muted">
            Your stylist checks garment rules, color harmony, weather, occasion, and budget.
          </p>
        </div>

        <div className="flex items-center gap-[0.625vw]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={onOpenHistory}
            className="rounded-full"
          >
            <History className="!h-[0.833vw] !w-[0.833vw]" />
            History
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            onClick={onStartStyling}
            className="rounded-full bg-[#7258fa] text-white hover:bg-[#6035f2]"
          >
            <GenerateIcon
              size={16}
              className="!h-[0.833vw] !w-[0.833vw]"
              color="white"
            />
            {isLoading ? "Starting…" : "Start Styling"}
          </Button>
        </div>
      </div>
    </div>
  );
}
