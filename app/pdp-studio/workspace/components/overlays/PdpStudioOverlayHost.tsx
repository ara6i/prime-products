"use client";

import type { PdpStudioOverlayId, PdpStudioPlan } from "../../types";
import { PdpStudioUsageDialog } from "./PdpStudioUsageDialog";
import { PdpStudioUpgradeDialog } from "./PdpStudioUpgradeDialog";
import { PdpStudioWorkspaceDialogs } from "./PdpStudioWorkspaceDialogs";
import { PdpStudioWorkspaceSheets } from "./PdpStudioWorkspaceSheets";

interface PdpStudioOverlayHostProps {
  activeOverlay: PdpStudioOverlayId | null;
  plans: PdpStudioPlan[];
  onClose: () => void;
  onOpenOverlay: (overlay: PdpStudioOverlayId) => void;
}

export function PdpStudioOverlayHost({
  activeOverlay,
  plans,
  onClose,
  onOpenOverlay,
}: PdpStudioOverlayHostProps) {
  return (
    <>
      <PdpStudioWorkspaceSheets activeOverlay={activeOverlay} onClose={onClose} />
      <PdpStudioUsageDialog
        open={activeOverlay === "usage"}
        onOpenChange={(open) => !open && onClose()}
        onUpgrade={() => onOpenOverlay("upgrade")}
      />
      <PdpStudioUpgradeDialog
        open={activeOverlay === "upgrade"}
        plans={plans}
        onOpenChange={(open) => !open && onClose()}
      />
      <PdpStudioWorkspaceDialogs
        activeOverlay={activeOverlay}
        onClose={onClose}
        onOpenOverlay={onOpenOverlay}
      />
    </>
  );
}
