"use client";

import {
  ArrowRight,
  BrainCircuit,
  Camera,
  Database,
  Ruler,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import type { LocalMlModelStage, LocalMlRunStatus } from "../lib/localMlSizing";

interface Props {
  status: LocalMlRunStatus;
  checkpointReady: boolean;
  rowPriorReady: boolean;
  fullCheckpointReady: boolean;
  activeStage: LocalMlModelStage | null;
  message: string | null;
}

export function LocalMlTrainingDiagram({
  status,
  checkpointReady,
  rowPriorReady,
  fullCheckpointReady,
  activeStage,
  message,
}: Props) {
  const statusLabel = status === "ready"
    ? "Prediction ready"
    : fullCheckpointReady
      ? "Rows + depth checkpoint ready"
      : rowPriorReady
        ? "1D rows ready · 3D pending"
        : "Waiting for training data";

  return (
    <section data-testid="local-ml-training-diagram" className="mt-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4 text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-slate-950">Local ML · completely separate mode</h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
            Manual Coordinate remains the labeling and proof tool. The active WEAR stage predicts only vertical rows; it does not change saved manual coordinates.
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${checkpointReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {statusLabel}
        </span>
      </div>

      <DiagramLane
        title="Training stages · done locally"
        nodes={[
          { icon: Database, title: "WEAR 1D · ready", detail: "Height, weight, gender and standing anatomical heights teach the three vertical rows" },
          { icon: BrainCircuit, title: "Row model · ready", detail: "Predicts waist, abdominal-extension proxy and buttock row Y positions" },
          { icon: Camera, title: "Photo labels · next", detail: "Reviewed red endpoints teach where the visible body line starts and ends" },
          { icon: ScanLine, title: "3D scans · later", detail: "Body surfaces teach true front-to-back depth and circumference" },
          { icon: ShieldCheck, title: "Held-out test", detail: "Each person belongs to training or validation, never both" },
        ]}
      />

      <DiagramLane
        title="What runs now for one front photo"
        nodes={[
          { icon: Camera, title: "Front photo", detail: "MediaPipe finds the visible person; known height, weight and gender enter the row model" },
          { icon: BrainCircuit, title: "WEAR picks row Y", detail: "The model places natural waist, trouser proxy and hip height" },
          { icon: ScanLine, title: "Mask draws endpoints", detail: "Temporary left and right edges come from the visible person mask" },
          { icon: Ruler, title: "Apple scale remains available", detail: "It can inspect the front-line pixel width, but it cannot invent hidden depth" },
          { icon: ShieldCheck, title: "Stop before circumference", detail: "The app waits for 3D training instead of showing a fake final value" },
        ]}
      />

      <div className="mt-4 grid gap-2 text-[11px] leading-4 sm:grid-cols-3">
        <Fact label="Current ML responsibility" value="Predict the three vertical anatomical rows" />
        <Fact label="Temporary endpoints" value="Visible MediaPipe mask edges at each predicted row" />
        <Fact label="Manual Coordinate" value="Create labels, inspect errors and remain unchanged" />
      </div>

      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[11px] leading-4 text-amber-800">
        WEAR 1D cannot make these rows exact on a photo. Shane 2 and Nadia remain honest checks unless you explicitly move them into training.
      </p>
      <p className="mt-2 text-[10px] text-slate-500">
        Active stage: {activeStage ?? "none"}{checkpointReady ? " · local checkpoint found" : ""}
      </p>
      {message ? <p className="mt-2 text-[11px] text-slate-600">{message}</p> : null}
    </section>
  );
}

function DiagramLane({
  title,
  nodes,
}: {
  title: string;
  nodes: Array<{ icon: typeof Database; title: string; detail: string }>;
}) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-medium text-slate-700">{title}</div>
      <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-stretch">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          return (
            <div key={node.title} className="contents">
              <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-900">
                  <Icon className="h-4 w-4 text-violet-600" aria-hidden />
                  {node.title}
                </div>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">{node.detail}</p>
              </div>
              {index < nodes.length - 1 ? (
                <div className="flex items-center justify-center text-slate-400" aria-hidden>
                  <ArrowRight className="h-4 w-4 rotate-90 lg:rotate-0" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="text-slate-500">{label}</div>
      <div className="mt-1 text-slate-900">{value}</div>
    </div>
  );
}
