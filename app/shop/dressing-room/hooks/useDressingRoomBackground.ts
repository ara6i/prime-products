"use client";

import { useState } from "react";
import {
  dressingRoomBackgrounds,
  type DressingRoomBackgroundId,
} from "../data/dressingRoom.data";

export function useDressingRoomBackground() {
  const [backgroundId, setBackgroundId] =
    useState<DressingRoomBackgroundId>("fine-grid");
  const background =
    dressingRoomBackgrounds.find((preset) => preset.id === backgroundId) ??
    dressingRoomBackgrounds[0];

  return {
    background,
    backgroundId,
    backgrounds: dressingRoomBackgrounds,
    selectBackground: setBackgroundId,
  };
}
