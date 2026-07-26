"use client";

import type { PdpStudioAuditCatalog } from "../../types";
import { usePdpStudioHomeUi } from "../../hooks/usePdpStudioHomeUi";
import { HomeWorkflowCards } from "./HomeWorkflowCards";
import { HomeToolGrid } from "./HomeToolGrid";
import { HomeAssetLibrary } from "./HomeAssetLibrary";

interface HomeWorkspaceProps {
  catalog: PdpStudioAuditCatalog;
}

export function HomeWorkspace({ catalog }: HomeWorkspaceProps) {
  const ui = usePdpStudioHomeUi();

  return (
    <div className="pb-8">
      <div>
        <HomeToolGrid tools={catalog.tools} />
      </div>

      <div className="mt-[3.125rem]">
        <HomeWorkflowCards
          visible={ui.showWorkflowCards}
          onVisibleChange={ui.setShowWorkflowCards}
        />
      </div>

      <HomeAssetLibrary />
    </div>
  );
}
