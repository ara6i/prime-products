"use client";

import { Check, CircleAlert, Cpu, LoaderCircle, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/app/shared/lib/utils";

interface CpuStatus {
  ok: true;
  pipelineId: string;
  state: string;
  overallPercent: number;
  currentStage: string;
  currentStageLabel: string;
  detail: string;
  startedAt: string | null;
  updatedAt: string;
  dataset: {
    subjects: number;
    completedPeople: number;
    targetCards: number;
    completedCards: number;
    failedCards: number;
  };
  cpu: {
    instanceId: string | null;
    instanceType: string | null;
    region: string;
    state: string;
    systemStatus: string;
    instanceStatus: string;
  };
  model: { gpuStarted: false; trainingStarted: boolean; sdkReady: boolean };
  stages: Array<{
    key: string;
    label: string;
    explanation: string;
    state: "complete" | "running" | "queued" | "failed" | "blocked";
    percent: number;
  }>;
}

type RowKind = "neck" | "chest" | "underbust" | "waist" | "hips";

interface TeacherRow {
  kind: RowKind;
  label: string;
  accepted: boolean;
  leftPercent: number;
  rightPercent: number;
  yPercent: number;
  widthCm: number | null;
  depthCm: number | null;
  shapeCircumferenceCm: number | null;
  recordedTapeCm: number | null;
  contourPointsNormalized: Array<[number, number]>;
  tapeTargetValid: boolean;
  perimeterDeltaPercent: number | null;
  geometrySource: string;
  measurementProtocol: string;
  meshPlaneProtocol: string;
  reasons: string[];
}

interface TeacherCard {
  sampleId: string;
  scanId: string;
  subjectId: string;
  role: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  chunkId: string;
  imageKey: string;
  rows: TeacherRow[];
  acceptedRows: number;
  tapeConnectedRows: number;
  rejectedRows: number;
}

const ROW_COLOURS: Record<RowKind, string> = {
  neck: "#c084fc",
  chest: "#60a5fa",
  underbust: "#f59e0b",
  waist: "#22d3ee",
  hips: "#22c55e",
};

function readableTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "not available"
    : new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(date);
}

function fixed(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)} cm`;
}

function ShapePreview({ row }: { row: TeacherRow }) {
  const points = row.contourPointsNormalized
    .map(([x, y]) => `${75 + x * 58},${58 + y * 42}`)
    .join(" ");
  const stroke = row.accepted ? "#a78bfa" : "#ef4444";

  return (
    <div className="rounded-xl border border-slate-700 bg-[#020617] p-2">
      <svg
        viewBox="0 0 150 116"
        role="img"
        aria-label={`${row.label} ${row.accepted ? "certified" : "rejected diagnostic"} 32-point cross-section`}
        className="h-28 w-full"
      >
        <line x1="12" y1="58" x2="138" y2="58" stroke="#334155" strokeWidth="1" />
        <line x1="75" y1="8" x2="75" y2="108" stroke="#334155" strokeWidth="1" />
        {points ? (
          <polygon
            points={points}
            fill={row.accepted ? "rgba(139,92,246,.16)" : "rgba(239,68,68,.10)"}
            stroke={stroke}
            strokeWidth="2.5"
            strokeDasharray={row.accepted ? undefined : "6 4"}
            strokeLinejoin="round"
          />
        ) : (
          <text x="75" y="62" textAnchor="middle" fill="#94a3b8" fontSize="11">No valid shape</text>
        )}
      </svg>
      <p className={cn(
        "text-center text-xs font-black uppercase tracking-wide",
        row.accepted ? "text-violet-300" : "text-red-300",
      )}>
        {row.accepted ? "Exact 32-point teacher" : "Rejected diagnostic shape"}
      </p>
    </div>
  );
}

function TeacherCardView({ card }: { card: TeacherCard }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div>
          <p className="text-lg font-black tracking-tight">{card.scanId}</p>
          <p className="mt-1 text-sm text-slate-400">
            {card.gender} · {card.heightCm.toFixed(1)} cm · {card.weightKg.toFixed(1)} kg · {card.role}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className={cn(
            "rounded-full px-3 py-1 text-sm font-bold",
            card.rejectedRows === 0
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-amber-400/15 text-amber-200",
          )}>
            {card.acceptedRows}/5 geometry rows
          </span>
          <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-sm font-bold text-cyan-200">
            {card.tapeConnectedRows}/5 connected to tape
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(380px,0.72fr)_minmax(620px,1.28fr)]">
        <div className="border-b border-slate-800 bg-[#020617] p-5 lg:border-b-0 lg:border-r">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[390px] overflow-hidden rounded-2xl border border-slate-700 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/try-on-test/wear-cpu-progress/card?key=${encodeURIComponent(card.imageKey)}`}
              alt={`${card.scanId} completed WEAR mesh teacher card`}
              className="absolute inset-0 h-full w-full object-contain"
            />
            {card.rows.map((row) => (
              <div key={row.kind} className="pointer-events-none absolute inset-0">
                <div
                  className="absolute h-0 border-t-[4px]"
                  style={{
                    left: `${row.leftPercent}%`,
                    top: `${row.yPercent}%`,
                    width: `${Math.max(0, row.rightPercent - row.leftPercent)}%`,
                    borderColor: row.accepted ? ROW_COLOURS[row.kind] : "#ef4444",
                    borderTopStyle: row.accepted ? "solid" : "dashed",
                    filter: "drop-shadow(0 0 3px rgba(0,0,0,.9))",
                  }}
                />
                <span
                  className={cn(
                    "absolute -translate-y-1/2 rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-black uppercase",
                    row.accepted ? "text-white" : "text-red-200",
                  )}
                  style={{ left: `${Math.min(82, Math.max(2, row.rightPercent + 1))}%`, top: `${row.yPercent}%` }}
                >
                  {row.label}
                </span>
              </div>
            ))}
            <div className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-1 text-xs font-bold text-slate-200">
              Exact Blender mesh card · {card.chunkId}
            </div>
          </div>
        </div>

        <div className="grid content-start gap-4 p-4 sm:p-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5 xl:col-span-2">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-300">One connected target</p>
            <p className="mt-2 text-lg font-black leading-7 text-white">
              Row → A–B + C–D + 32-point shape → walked circumference → tape loss
            </p>
            <p className="mt-2 text-sm font-bold text-amber-300">
              Rejected geometry is still shown for diagnosis, but never enters GPU training.
            </p>
          </div>
          {card.rows.map((row) => (
            <div
              key={row.kind}
              className={cn(
                "rounded-2xl border p-5",
                row.accepted
                  ? "border-slate-700 bg-slate-900"
                  : "border-red-500/50 bg-red-950/35",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: row.accepted ? ROW_COLOURS[row.kind] : "#ef4444" }} />
                  <p className="font-bold">{row.label}</p>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black",
                  row.accepted ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-200",
                )}>
                  {row.accepted ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  {row.accepted ? "Geometry pass" : "Blocked from training"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-base">
                <div><p className="text-sm text-slate-400">A–B width</p><p className="mt-1 font-black tabular-nums">{fixed(row.widthCm)}</p></div>
                <div><p className="text-sm text-slate-400">C–D depth</p><p className="mt-1 font-black tabular-nums">{fixed(row.depthCm)}</p></div>
                <div><p className="text-sm text-slate-400">Walked shape</p><p className="mt-1 font-black tabular-nums">{fixed(row.shapeCircumferenceCm)}</p></div>
                <div><p className="text-sm text-amber-300">Recorded WEAR tape</p><p className="mt-1 font-black tabular-nums text-amber-200">{fixed(row.recordedTapeCm)}</p></div>
              </div>
              <div className="mt-4">
                <ShapePreview row={row} />
              </div>
              <div className={cn(
                "mt-3 rounded-xl border px-3 py-2 text-sm font-black",
                row.tapeTargetValid
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-200",
              )}>
                {row.tapeTargetValid
                  ? `Tape loss connected${row.perimeterDeltaPercent === null ? "" : ` · mesh/tape Δ ${row.perimeterDeltaPercent.toFixed(2)}%`}`
                  : "Tape loss blocked — this row cannot teach circumference"}
              </div>
              {!row.accepted ? (
                <p className="mt-3 text-sm leading-5 text-red-200">
                  {row.reasons.length ? row.reasons.join(" · ") : "This geometry row failed its teacher safety checks."}
                </p>
              ) : null}
              <details className="mt-3 text-sm text-slate-300">
                <summary className="cursor-pointer font-bold text-slate-400">Exact WEAR source protocol</summary>
                <dl className="mt-2 space-y-2 rounded-xl bg-slate-950 p-3">
                  <div><dt className="text-xs uppercase text-slate-500">PLY section</dt><dd className="mt-0.5 break-words">{row.geometrySource}</dd></div>
                  <div><dt className="text-xs uppercase text-slate-500">Row definition</dt><dd className="mt-0.5 break-words">{row.meshPlaneProtocol}</dd></div>
                  <div><dt className="text-xs uppercase text-slate-500">Recorded measurement</dt><dd className="mt-0.5 break-words">{row.measurementProtocol}</dd></div>
                </dl>
              </details>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function WearCpuProgressLab() {
  const [status, setStatus] = useState<CpuStatus | null>(null);
  const [cards, setCards] = useState<TeacherCard[]>([]);
  const [statusError, setStatusError] = useState("");
  const [cardsError, setCardsError] = useState("");
  const [loadingCards, setLoadingCards] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/try-on-test/wear-cpu-progress/status", { cache: "no-store" });
      const payload = await response.json() as CpuStatus | { ok: false; error?: string };
      if (!response.ok || !payload.ok) throw new Error("error" in payload ? payload.error : "CPU status unavailable");
      setStatus(payload);
      setStatusError("");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "CPU status unavailable");
    }
  }, []);

  const randomizeCards = useCallback(async () => {
    setLoadingCards(true);
    setCardsError("");
    try {
      const response = await fetch(`/api/try-on-test/wear-cpu-progress/cards?count=4&random=${Date.now()}`, { cache: "no-store" });
      const payload = await response.json() as { ok: boolean; cards?: TeacherCard[]; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Completed cards unavailable");
      setCards(payload.cards ?? []);
    } catch (error) {
      setCardsError(error instanceof Error ? error.message : "Completed cards unavailable");
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refreshStatus();
      void randomizeCards();
    }, 0);
    const timer = window.setInterval(refreshStatus, 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [randomizeCards, refreshStatus]);

  const renderPercent = useMemo(() => {
    const render = status?.stages.find((stage) => stage.key === "render-v8");
    return Math.max(0, Math.min(100, render?.percent ?? 0));
  }, [status]);
  const healthy = status?.cpu.state === "running";

  return (
    <main className="mx-auto w-full max-w-[1500px] px-5 pb-16 pt-8 sm:px-8">
      <section className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">
        <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1.5 text-sm font-black text-cyan-900">
                <Cpu className="size-4" /> CPU teacher factory
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
                <ShieldCheck className="size-4" /> Private · GPU off · not published
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">WEAR CPU progress</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
              Live certified Blender cards. A bad body row is shown in red and blocked before GPU training.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { void refreshStatus(); void randomizeCards(); }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800"
          >
            <RefreshCw className={cn("size-4", loadingCards && "animate-spin")} /> Refresh everything
          </button>
        </div>

        {status ? (
          <div className="border-t border-slate-200 bg-slate-50 p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-bold text-slate-500">People completed</p><p className="mt-2 text-3xl font-black tabular-nums text-slate-950">{status.dataset.completedPeople.toLocaleString()} <span className="text-base text-slate-400">/ {status.dataset.subjects.toLocaleString()}</span></p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-bold text-slate-500">Cards completed</p><p className="mt-2 text-3xl font-black tabular-nums text-slate-950">{status.dataset.completedCards.toLocaleString()} <span className="text-base text-slate-400">/ {status.dataset.targetCards.toLocaleString()}</span></p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-bold text-slate-500">Render errors</p><p className={cn("mt-2 text-3xl font-black tabular-nums", status.dataset.failedCards ? "text-red-600" : "text-emerald-600")}>{status.dataset.failedCards.toLocaleString()}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-bold text-slate-500">CPU worker</p><p className={cn("mt-2 text-xl font-black", healthy ? "text-emerald-600" : "text-amber-600")}>{healthy ? "Running · reporting" : `${status.cpu.state} · report stale`}</p><p className="mt-1 text-xs text-slate-500">{status.cpu.instanceType} · Virginia</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-bold text-slate-500">GPU training</p><p className="mt-2 text-xl font-black text-slate-950">Not started</p><p className="mt-1 text-xs text-slate-500">Waiting for certified cards</p></div>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-200 bg-white p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-sm font-black uppercase tracking-wider text-cyan-700">Current stage</p><p className="mt-1 text-xl font-black text-slate-950">{status.currentStageLabel}</p></div>
                <p className="text-3xl font-black tabular-nums text-cyan-700">{renderPercent.toFixed(1)}%</p>
              </div>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-[width] duration-700" style={{ width: `${renderPercent}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-slate-600"><span>{status.detail}</span><span>Updated {readableTime(status.updatedAt)}</span></div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-48 items-center justify-center border-t border-slate-200 bg-slate-50 p-8">
            {statusError ? <p className="inline-flex items-center gap-2 font-bold text-red-600"><CircleAlert className="size-5" /> {statusError}</p> : <LoaderCircle className="size-8 animate-spin text-cyan-700" />}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">Random completed proof</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Random CPU flash cards</h2>
            <p className="mt-2 text-base text-slate-600">Solid colored line = accepted teacher. Red dashed line = rejected and excluded from training.</p>
          </div>
          <button
            type="button"
            onClick={() => void randomizeCards()}
            disabled={loadingCards}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={cn("size-4", loadingCards && "animate-spin")} /> Show different random cards
          </button>
        </div>

        {cardsError ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{cardsError}</p> : null}
        {loadingCards && !cards.length ? (
          <div className="mt-6 flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white"><LoaderCircle className="size-9 animate-spin text-cyan-700" /></div>
        ) : (
          <div className="mt-6 grid gap-8">
            {cards.map((card) => <TeacherCardView key={`${card.chunkId}-${card.sampleId}`} card={card} />)}
          </div>
        )}
      </section>
    </main>
  );
}
