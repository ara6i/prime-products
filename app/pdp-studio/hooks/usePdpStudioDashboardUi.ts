"use client";

import { useMemo, useState } from "react";
import type { PdpStudioDashboardView } from "../types";

export function usePdpStudioDashboardUi(view: PdpStudioDashboardView) {
  const initialTool = view.tools.find((tool) => tool.active) ?? view.tools[0];

  const [selectedNavId, setSelectedNavId] = useState("home");
  const [selectedToolId, setSelectedToolId] = useState(initialTool?.id ?? "");
  const [selectedBackgroundId, setSelectedBackgroundId] = useState(view.backgrounds[0]?.id ?? "");
  const [selectedModelId, setSelectedModelId] = useState(view.models[0]?.id ?? "");
  const [selectedPoseId, setSelectedPoseId] = useState(view.poses[0]?.id ?? "");
  const [selectedExportId, setSelectedExportId] = useState(view.exports[0]?.id ?? "");
  const [selectedPhotoShootModelId, setSelectedPhotoShootModelId] = useState(view.clothingPhotoShoot.models[0]?.id ?? "");
  const [selectedPhotoShootBackgroundId, setSelectedPhotoShootBackgroundId] = useState(
    view.clothingPhotoShoot.backgrounds[0]?.id ?? "",
  );
  const [selectedPhotoShootPoseId, setSelectedPhotoShootPoseId] = useState(view.clothingPhotoShoot.poses[0]?.id ?? "");
  const [detailToolId, setDetailToolId] = useState<string | null>(null);

  const selectedTool = useMemo(
    () => view.tools.find((tool) => tool.id === selectedToolId) ?? view.tools[0],
    [selectedToolId, view.tools],
  );

  const detailTool = useMemo(
    () => view.tools.find((tool) => tool.id === detailToolId) ?? null,
    [detailToolId, view.tools],
  );

  return {
    selectedNavId,
    selectedToolId,
    selectedBackgroundId,
    selectedModelId,
    selectedPoseId,
    selectedExportId,
    selectedPhotoShootModelId,
    selectedPhotoShootBackgroundId,
    selectedPhotoShootPoseId,
    selectedTool,
    detailTool,
    setSelectedNavId,
    setSelectedToolId,
    setSelectedBackgroundId,
    setSelectedModelId,
    setSelectedPoseId,
    setSelectedExportId,
    setSelectedPhotoShootModelId,
    setSelectedPhotoShootBackgroundId,
    setSelectedPhotoShootPoseId,
    openToolDetail: setDetailToolId,
    closeToolDetail: () => setDetailToolId(null),
  };
}
