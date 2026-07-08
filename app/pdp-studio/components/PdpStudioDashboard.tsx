"use client";

import { Toaster } from "sonner";
import type { PdpStudioUser } from "../shared/pdpStudioAuthService";
import type { PdpStudioDashboardView } from "../types";
import { usePdpStudioDashboardUi } from "../hooks/usePdpStudioDashboardUi";
import { PdpStudioAuthModal } from "./PdpStudioAuthModal";
import { PdpStudioHeader } from "./PdpStudioHeader";
import { PdpStudioSidebar } from "./PdpStudioSidebar";
import { PdpStudioWorkspace } from "./PdpStudioWorkspace";

export function PdpStudioDashboard({ user, view }: { user: PdpStudioUser | null; view: PdpStudioDashboardView }) {
  const needsAuth = !user;
  const ui = usePdpStudioDashboardUi(view);

  return (
    <>
      <main className="min-h-screen bg-[#f4f5f7] text-[#19191b]">
        <div className={needsAuth ? "pointer-events-none select-none blur-[1px]" : ""}>
          <div className="grid min-h-screen lg:grid-cols-[252px_1fr]">
            <PdpStudioSidebar
              groups={view.sidebarGroups}
              selectedNavId={ui.selectedNavId}
              onSelectNav={ui.setSelectedNavId}
            />
            <section className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
              <PdpStudioHeader
                user={user}
                groups={view.sidebarGroups}
                selectedNavId={ui.selectedNavId}
                onSelectNav={ui.setSelectedNavId}
              />
              <PdpStudioWorkspace view={view} ui={ui} />
            </section>
          </div>
        </div>

        {needsAuth ? <PdpStudioAuthModal /> : null}
      </main>

      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          className: "rounded-lg",
          style: {
            background: "#ffffff",
            color: "#171717",
            border: "1px solid #e7e7e7",
            boxShadow: "0 16px 44px rgba(15, 23, 42, 0.1)",
            width: "min(92vw, 420px)",
          },
        }}
      />
    </>
  );
}
