import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { usePdpStudioDashboardUi } from "../hooks/usePdpStudioDashboardUi";
import type {
  PdpStudioBuildStatus,
  PdpStudioControlPreset,
  PdpStudioDashboardView,
  PdpStudioExportPreset,
  PdpStudioToolCard,
} from "../types";
import { PdpStudioIcon } from "./PdpStudioIcon";

type DashboardUi = ReturnType<typeof usePdpStudioDashboardUi>;

const checkerStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(45deg,#dedede 25%,transparent 25%),linear-gradient(-45deg,#dedede 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#dedede 75%),linear-gradient(-45deg,transparent 75%,#dedede 75%)",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
  backgroundSize: "16px 16px",
};

export function PdpStudioWorkspace({ view, ui }: { view: PdpStudioDashboardView; ui: DashboardUi }) {
  const primaryTools = view.tools.slice(0, 8);
  const secondaryTools = view.tools.slice(8);

  return (
    <div className="mt-8 space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {primaryTools.map((tool) => (
          <HomeToolTile
            key={tool.id}
            tool={tool}
            active={tool.id === ui.selectedToolId}
            onSelect={() => {
              ui.setSelectedToolId(tool.id);
              ui.openToolDetail(tool.id);
            }}
          />
        ))}
      </section>

      <HomeSection title="Get started">
        <div className="grid gap-4 lg:grid-cols-3">
          <StarterCard
            title="Build a PDP hero"
            subtitle="Clean product image with Shopify-ready crop"
            tone="checker"
            icon="image"
            onClick={() => ui.openToolDetail("pdp-hero")}
          />
          <StarterCard
            title="Create a full gallery set"
            subtitle="Hero, close-up, lifestyle, detail, and social variants"
            tone="gallery"
            icon="gallery"
            onClick={() => ui.openToolDetail("pdp-gallery")}
          />
          <StarterCard
            title="Stage a product scene"
            subtitle="Lifestyle background with controlled product focus"
            tone="scene"
            icon="sparkles"
            onClick={() => ui.openToolDetail("product-staging")}
          />
        </div>
      </HomeSection>

      <section className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <HomeSection title="Classics">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {view.backgrounds.slice(0, 4).map((preset) => (
                <ClassicTile
                  key={preset.id}
                  preset={preset}
                  active={preset.id === ui.selectedBackgroundId}
                  onSelect={() => ui.setSelectedBackgroundId(preset.id)}
                />
              ))}
            </div>
          </HomeSection>

          <HomeSection title="Studio">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {view.backgrounds.slice(4).map((preset) => (
                <PresetButton
                  key={preset.id}
                  preset={preset}
                  active={preset.id === ui.selectedBackgroundId}
                  onSelect={() => ui.setSelectedBackgroundId(preset.id)}
                />
              ))}
            </div>
          </HomeSection>

          <HomeSection title="PDP controls">
            <div className="grid gap-4 lg:grid-cols-2">
              <CompactControlGroup
                title="Model"
                presets={view.models}
                selectedId={ui.selectedModelId}
                onSelect={ui.setSelectedModelId}
              />
              <CompactControlGroup
                title="Pose"
                presets={view.poses}
                selectedId={ui.selectedPoseId}
                onSelect={ui.setSelectedPoseId}
              />
            </div>
          </HomeSection>

          <HomeSection title="More tools">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {secondaryTools.map((tool) => (
                <SmallToolRow
                  key={tool.id}
                  tool={tool}
                  onSelect={() => {
                    ui.setSelectedToolId(tool.id);
                    ui.openToolDetail(tool.id);
                  }}
                />
              ))}
            </div>
          </HomeSection>
        </div>

        <aside className="space-y-4">
          <SelectedSetup
            tool={ui.selectedTool}
            background={view.backgrounds.find((item) => item.id === ui.selectedBackgroundId) ?? view.backgrounds[0]}
            model={view.models.find((item) => item.id === ui.selectedModelId) ?? view.models[0]}
            pose={view.poses.find((item) => item.id === ui.selectedPoseId) ?? view.poses[0]}
            exportPreset={view.exports.find((item) => item.id === ui.selectedExportId) ?? view.exports[0]}
          />

          <div className="rounded-lg border border-black/10 bg-white p-4">
            <HomeSectionTitle title="Export sizes" />
            <div className="mt-3 space-y-2">
              {view.exports.map((item) => (
                <ExportRow
                  key={item.id}
                  item={item}
                  active={item.id === ui.selectedExportId}
                  onSelect={() => ui.setSelectedExportId(item.id)}
                />
              ))}
            </div>
          </div>
        </aside>
      </section>

      {ui.detailTool ? <ToolDetailPanel tool={ui.detailTool} onClose={ui.closeToolDetail} /> : null}
    </div>
  );
}

function HomeToolTile({
  tool,
  active,
  onSelect,
}: {
  tool: PdpStudioToolCard;
  active: boolean;
  onSelect: () => void;
}) {
  const content = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-[#2f28d9]">
        <PdpStudioIcon name={tool.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-black/85">{tool.label}</span>
        <span className="mt-0.5 block truncate text-xs text-black/45">{tool.category}</span>
      </span>
    </>
  );

  if (tool.href) {
    return (
      <Link
        href={tool.href}
        className={`flex h-16 items-center gap-3 rounded-lg border px-3 text-left transition-colors ${
          active ? "border-[#3b2cf4] bg-[#f2f1ff]" : "border-black/10 bg-white hover:bg-[#f7f7f8]"
        }`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-16 items-center gap-3 rounded-lg border px-3 text-left transition-colors ${
        active ? "border-[#3b2cf4] bg-[#f2f1ff]" : "border-black/10 bg-white hover:bg-[#f7f7f8]"
      }`}
    >
      {content}
    </button>
  );
}

function HomeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <HomeSectionTitle title={title} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function HomeSectionTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-semibold text-black/88">{title}</h2>;
}

function StarterCard({
  title,
  subtitle,
  tone,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  tone: "checker" | "gallery" | "scene";
  icon: PdpStudioToolCard["icon"];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="overflow-hidden rounded-lg border border-black/10 bg-white text-left transition-colors hover:bg-[#fbfbfc]"
    >
      <div className={`relative aspect-[1.55] ${toneClassName(tone)}`} style={tone === "checker" ? checkerStyle : undefined}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-24 w-32 items-center justify-center rounded-lg bg-white/72 shadow-sm">
            <PdpStudioIcon name={icon} className="h-10 w-10 text-[#2f28d9]" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span>
          <span className="block text-sm font-semibold text-black/86">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-black/52">{subtitle}</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/[0.04]">
          <PdpStudioIcon name="chevron" className="h-4 w-4 text-black/55" />
        </span>
      </div>
    </button>
  );
}

function ClassicTile({
  preset,
  active,
  onSelect,
}: {
  preset: PdpStudioControlPreset;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="text-left">
      <div
        className={`aspect-square rounded-lg border ${active ? "border-[#3b2cf4]" : "border-black/10"}`}
        style={preset.swatch === "checker" ? checkerStyle : preset.swatch ? { background: preset.swatch } : undefined}
      >
        {!preset.swatch ? (
          <div className="flex h-full items-center justify-center bg-[#f5f5f6]">
            <PdpStudioIcon name={preset.icon} className="h-8 w-8 text-[#2f28d9]" />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xs font-medium text-black/78">{preset.label}</p>
    </button>
  );
}

function PresetButton({
  preset,
  active,
  onSelect,
}: {
  preset: PdpStudioControlPreset;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-lg border bg-white p-3 text-left transition-colors ${
        active ? "border-[#3b2cf4] bg-[#f2f1ff]" : "border-black/10 hover:bg-[#fbfbfc]"
      }`}
    >
      <Swatch preset={preset} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-black/84">{preset.label}</span>
        <span className="mt-0.5 block truncate text-xs text-black/48">{preset.description}</span>
      </span>
    </button>
  );
}

function CompactControlGroup({
  title,
  presets,
  selectedId,
  onSelect,
}: {
  title: string;
  presets: PdpStudioControlPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <h3 className="text-sm font-semibold text-black/82">{title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.id)}
            className={`h-10 rounded-lg border px-3 text-left text-sm font-medium transition-colors ${
              preset.id === selectedId ? "border-[#3b2cf4] bg-[#f2f1ff] text-[#2f28d9]" : "border-black/10 bg-[#fbfbfc] text-black/68"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SmallToolRow({ tool, onSelect }: { tool: PdpStudioToolCard; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-3 rounded-lg border border-black/10 bg-white p-3 text-left hover:bg-[#fbfbfc]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-[#2f28d9]">
        <PdpStudioIcon name={tool.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-black/84">{tool.label}</span>
        <span className="mt-0.5 block truncate text-xs text-black/45">{tool.description}</span>
      </span>
    </button>
  );
}

function SelectedSetup({
  tool,
  background,
  model,
  pose,
  exportPreset,
}: {
  tool?: PdpStudioToolCard;
  background?: PdpStudioControlPreset;
  model?: PdpStudioControlPreset;
  pose?: PdpStudioControlPreset;
  exportPreset?: PdpStudioExportPreset;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <HomeSectionTitle title="Current setup" />
      <div className="mt-4 rounded-lg border border-dashed border-black/15 bg-[#f7f7f8] p-4">
        <div className="flex aspect-square items-center justify-center rounded-lg bg-white">
          <div className="text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-[#f2f1ff] text-[#2f28d9]">
              <PdpStudioIcon name={tool?.icon ?? "upload"} className="h-7 w-7" />
            </span>
            <p className="mt-3 text-sm font-semibold text-black/84">{tool?.label ?? "Start from product photo"}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <SetupRow label="Background" value={background?.label ?? "White"} />
        <SetupRow label="Model" value={model?.label ?? "No model"} />
        <SetupRow label="Pose" value={pose?.label ?? "Front"} />
        <SetupRow label="Export" value={exportPreset?.label ?? "Shopify PDP hero"} />
      </div>
    </div>
  );
}

function ExportRow({ item, active, onSelect }: { item: PdpStudioExportPreset; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        active ? "border-[#3b2cf4] bg-[#f2f1ff]" : "border-black/10 bg-[#fbfbfc] hover:bg-white"
      }`}
    >
      <PdpStudioIcon name={item.icon} className="h-4 w-4 shrink-0 text-[#2f28d9]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-black/84">{item.label}</span>
        <span className="block text-xs text-black/45">{item.size}</span>
      </span>
    </button>
  );
}

function ToolDetailPanel({ tool, onClose }: { tool: PdpStudioToolCard; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/[0.18] px-4">
      <div className="w-full max-w-[500px] rounded-lg bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f2f1ff] text-[#2f28d9]">
              <PdpStudioIcon name={tool.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-black/42">{tool.category}</p>
              <h3 className="mt-1 text-xl font-semibold text-black/88">{tool.label}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-black/10 px-3 text-sm font-semibold text-black/60 hover:bg-black/5">
            Close
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-black/62">{tool.description}</p>
        <div className="mt-5 flex items-center justify-between rounded-lg border border-black/10 bg-[#fbfbfc] p-3">
          <span className="text-sm font-semibold text-black/72">Status</span>
          <StatusBadge status={tool.status} />
        </div>
      </div>
    </div>
  );
}

function Swatch({ preset }: { preset: PdpStudioControlPreset }) {
  if (preset.swatch === "checker") return <span className="h-10 w-10 shrink-0 rounded-lg border border-black/10" style={checkerStyle} />;
  if (preset.swatch) return <span className="h-10 w-10 shrink-0 rounded-lg border border-black/10" style={{ background: preset.swatch }} />;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-[#2f28d9]">
      <PdpStudioIcon name={preset.icon} className="h-5 w-5" />
    </span>
  );
}

function SetupRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-2">
      <span className="text-black/45">{label}</span>
      <span className="text-right font-semibold text-black/82">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: PdpStudioBuildStatus }) {
  const label = status === "build-now" ? "Build now" : status === "next" ? "Next" : "Later";
  const className =
    status === "build-now"
      ? "bg-emerald-50 text-emerald-700"
      : status === "next"
        ? "bg-blue-50 text-blue-700"
        : "bg-black/5 text-black/55";

  return <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${className}`}>{label}</span>;
}

function toneClassName(tone: "checker" | "gallery" | "scene") {
  if (tone === "checker") return "";
  if (tone === "gallery") return "bg-[#e8edf7]";
  return "bg-[#e7efe7]";
}
