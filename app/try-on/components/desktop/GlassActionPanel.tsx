"use client";

import {
  FileDownloadIcon,
  ShareIcon,
  DeleteIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";

interface GlassActionPanelProps {
  onDownload?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

export function GlassActionPanel({ onDownload, onShare, onDelete }: GlassActionPanelProps) {
  return (
    <div className="absolute bottom-[0.521vw] left-[0.521vw] z-20">
      {/* Shadow */}
      <div
        className="pointer-events-none absolute overflow-hidden rounded-[9999px]"
        style={{ inset: "-1.302vw" }}
      >
        <div
          className="absolute rounded-[1.771vw]"
          style={{
            left: "1.354vw",
            right: "1.354vw",
            top: "1.615vw",
            bottom: "1.094vw",
            background: "rgba(0, 0, 0, 0.08)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Glass pill */}
      <div className="relative overflow-hidden rounded-[1.771vw]" style={{ width: "3.75vw", height: "8.854vw" }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backdropFilter: "blur(80px)",
            WebkitBackdropFilter: "blur(80px)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.771vw]"
          style={{ background: "rgba(38, 38, 38, 0.15)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.771vw]"
          style={{ background: "rgba(245, 245, 245, 0.6)" }}
        />

        <div className="relative flex h-full flex-col items-center justify-center gap-[0.417vw] px-[0.833vw] py-[1.042vw]">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="h-[1.979vw] w-full px-[0.625vw] py-[0.417vw]"
          >
            <FileDownloadIcon size={16} color="var(--brand-blue)" className="!w-[0.833vw] !h-[0.833vw]" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="h-[1.979vw] w-full px-[0.625vw] py-[0.417vw]"
          >
            <ShareIcon size={16} color="var(--brand-blue)" className="!w-[0.833vw] !h-[0.833vw]" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-[1.979vw] w-full border-rule-rejected px-[0.625vw] py-[0.417vw] hover:bg-rule-rejected/10"
          >
            <DeleteIcon size={16} color="var(--rule-rejected)" className="!w-[0.833vw] !h-[0.833vw]" />
          </Button>
        </div>
      </div>
    </div>
  );
}
