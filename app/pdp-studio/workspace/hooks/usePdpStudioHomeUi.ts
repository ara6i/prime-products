"use client";

import { useState } from "react";

export function usePdpStudioHomeUi() {
  const [showMore, setShowMore] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);
  const [showWorkflowCards, setShowWorkflowCards] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState("white");
  const [customSizeOpen, setCustomSizeOpen] = useState(false);
  const [customWidth, setCustomWidth] = useState("2000");
  const [customHeight, setCustomHeight] = useState("2000");

  return {
    showMore,
    showUpgradeBanner,
    showWorkflowCards,
    selectedPresetId,
    customSizeOpen,
    customWidth,
    customHeight,
    setShowMore,
    setShowUpgradeBanner,
    setShowWorkflowCards,
    setSelectedPresetId,
    setCustomSizeOpen,
    setCustomWidth,
    setCustomHeight,
  };
}
