import type { LucideIcon } from "lucide-react";
import {
  Anvil,
  ArrowRight,
  Check,
  CircleDashed,
  Cloud,
  Cpu,
  Database,
  HardDrive,
  Images,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/app/shared/lib/utils";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { TrainingProgressPanel } from "./components/TrainingProgressPanel";
import {
  getModelForgeSnapshot,
  type ModelForgeStageStatus,
} from "./lib/modelForgeProgress";

export const metadata = {
  title: "Model Forge — PrimeStyleAI",
};

export const dynamic = "force-dynamic";

const STAGE_ICONS: LucideIcon[] = [
  Database,
  Cloud,
  ScanLine,
  Images,
  ShieldCheck,
  Cpu,
  UploadCloud,
  Cpu,
  Sparkles,
  Smartphone,
];

const PILOT_IMAGE_VIEWS = [
  {
    view: "render",
    title: "Front render",
    detail: "The 3D mesh turned into the same kind of 2D view the model will study.",
  },
  {
    view: "overlay",
    title: "Checked labels",
    detail: "Colored body rows plus shoulder, sleeve, and inseam guides from WEAR data.",
  },
  {
    view: "mask",
    title: "Old pilot mask",
    detail: "Used only by the retired 100-body baseline. Current v6 learns WEAR edges from RGB without a runtime mask.",
  },
] as const;

const STATUS_STYLES: Record<ModelForgeStageStatus, {
  icon: LucideIcon;
  label: string;
  badge: string;
  dot: string;
}> = {
  complete: {
    icon: Check,
    label: "Done",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "border-emerald-200 bg-emerald-500 text-white",
  },
  active: {
    icon: Anvil,
    label: "Working now",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "border-blue-200 bg-brand-blue text-white",
  },
  waiting: {
    icon: CircleDashed,
    label: "Waiting",
    badge: "border-gray-200 bg-gray-50 text-gray-600",
    dot: "border-gray-200 bg-white text-gray-400",
  },
};

function SummaryCard({
  eyebrow,
  value,
  detail,
  icon: Icon,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-secondary">{eyebrow}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-text-primary">{value}</p>
        </div>
        <span className="rounded-xl bg-blue-50 p-2.5 text-brand-blue">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{detail}</p>
    </div>
  );
}

function DataFlowStep({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <Icon className="size-5 text-blue-300" aria-hidden="true" />
      <p className="mt-3 font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-300">{detail}</p>
    </div>
  );
}

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();

  const snapshot = await getModelForgeSnapshot();
  const checkedAt = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(snapshot.generatedAt));
  const openProofRows = snapshot.proof.rows
    .filter((row) => row.closed === false)
    .map((row) => row.label);
  const reconstructedProofRows = snapshot.proof.rows
    .filter((row) => row.reconstructed)
    .map((row) => row.label);
  const paidComputeActive = snapshot.training.state === "running" || snapshot.training.state === "preparing";
  const usbSafe = snapshot.aws.uploadCompleted;

  return (
    <div className="min-h-screen bg-gray-50">
      <TabNav />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8" data-testid="model-forge-page">
        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-200">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.3fr_0.7fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                <Anvil className="size-3.5" aria-hidden="true" />
                WEAR 3D training tracker
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">Model Forge</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                We use the 3D bodies as the teacher. The finished model must work from one normal 2D user photo.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Current truth</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                  <Anvil className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">
                    {snapshot.training.state === "complete"
                      ? "Synthetic photo model: trained"
                      : snapshot.training.state === "waiting"
                        ? "CPU preparation saved · GPU waiting"
                        : "Full training pipeline: started"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{snapshot.training.currentStageLabel}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
                <div>
                  <p className="text-xl font-bold text-emerald-300">{snapshot.counts.complete}</p>
                  <p className="text-xs text-slate-400">done</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-300">{snapshot.counts.active}</p>
                  <p className="text-xs text-slate-400">active</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-300">{snapshot.counts.waiting}</p>
                  <p className="text-xs text-slate-400">waiting</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.03] px-6 py-6 sm:px-8 lg:px-10">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">How 3D helps a 2D photo</p>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <DataFlowStep icon={Database} title="WEAR 3D teacher" detail="Body shape, landmarks, and real measurements." />
              <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-slate-600 lg:rotate-0" aria-hidden="true" />
              <DataFlowStep icon={Images} title="Labeled 2D views" detail="Front renders with exact body rows and measurements." />
              <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-slate-600 lg:rotate-0" aria-hidden="true" />
              <DataFlowStep icon={Cpu} title="Photo model" detail="Learns visual patterns that predict rows and body size." />
              <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-slate-600 lg:rotate-0" aria-hidden="true" />
              <DataFlowStep icon={Smartphone} title="SDK result" detail="One photo in; size, measurements, and confidence out." />
            </div>
          </div>
        </section>

        <TrainingProgressPanel initialStatus={snapshot.training} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Model Forge summary">
          <SummaryCard
            eyebrow="WEAR inventory"
            value={`${snapshot.inventory.usableStandingBodies.toLocaleString("en-US")} usable`}
            detail={`${snapshot.inventory.meshFiles.toLocaleString("en-US")} meshes · ${snapshot.inventory.landmarkFiles.toLocaleString("en-US")} landmark files`}
            icon={Database}
          />
          <SummaryCard
            eyebrow="Pilot set"
            value={`${snapshot.pilot.selected}/100 selected`}
            detail={`${snapshot.pilot.train} train · ${snapshot.pilot.validation} validation · ${snapshot.pilot.test} test · ${snapshot.pilot.regions} regions`}
            icon={ScanLine}
          />
          <SummaryCard
            eyebrow="Label proof"
            value={`${snapshot.pilot.rendered}/100 rendered`}
            detail={`${snapshot.pilot.reviewed} reviewed · ${snapshot.pilot.openTorsoContours} open · ${snapshot.pilot.reconstructedTorsoContours} reconstructed torso contours`}
            icon={Images}
          />
          <SummaryCard
            eyebrow="Local pilot model"
            value={snapshot.maskPilot.ready ? `${snapshot.maskPilot.testSubjects} unseen tested` : "Not trained"}
            detail={snapshot.maskPilot.ready
              ? `${snapshot.maskPilot.modelKilobytes} KB · synthetic bodies only · real photos still required`
              : `Waiting for label approval · ${snapshot.aws.gpuJobs} paid GPU jobs`}
            icon={Cpu}
          />
        </section>

        {snapshot.maskPilot.ready ? (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 sm:p-8" data-testid="wear3d-mask-pilot-result">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">First local model test</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-blue-950">
                  It learned useful body patterns from the pilot
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-900">
                  Error below is from synthetic WEAR bodies the model never saw during training. It is encouraging, but it is not real-photo accuracy.
                </p>
              </div>
              <span className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-800">
                Local pilot · $0 cloud cost
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["Chest", snapshot.maskPilot.circumferenceMaeCm.chest],
                ["Under-bust", snapshot.maskPilot.circumferenceMaeCm.underbust],
                ["Waist", snapshot.maskPilot.circumferenceMaeCm.waist],
                ["Hips", snapshot.maskPilot.circumferenceMaeCm.hips],
              ] as const).map(([label, mae]) => (
                <div key={label} className="rounded-2xl border border-blue-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-blue-950">{mae === null ? "—" : `${mae.toFixed(1)} cm`}</p>
                  <p className="mt-1 text-xs text-blue-700">mean synthetic error</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <span className="font-bold">Retired baseline only.</span> The current v6 adds fitted-clothing appearance, camera variation, and mask-free RGB learning. It still cannot ship until the separate real-photo test passes.
            </div>
          </section>
        ) : null}

        {snapshot.proof.available ? (
          <section
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
            data-testid="wear3d-pilot-proof"
          >
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">First real pilot proof</p>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    Saved on this Mac
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                  One 3D body became training material
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                  This is real WEAR pilot data. It proves the conversion and labels; it is not a trained-model prediction yet.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">{snapshot.proof.landmarkCount} landmarks</span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">{snapshot.proof.measurementCount} measurements</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">{snapshot.pilot.reviewed} bodies reviewed</span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="grid gap-4 sm:grid-cols-3">
                {PILOT_IMAGE_VIEWS.map((item) => (
                  <figure key={item.view} className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    <div className="border-b border-gray-200 bg-slate-950 p-3">
                      <Image
                        src={`/api/try-on-test/model-forge/proof-image?view=${item.view}`}
                        alt={`${snapshot.proof.label}: ${item.title.toLowerCase()}`}
                        width={384}
                        height={512}
                        unoptimized
                        className="aspect-[3/4] w-full rounded-xl object-contain"
                      />
                    </div>
                    <figcaption className="p-4">
                      <p className="text-sm font-bold text-text-primary">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">{item.detail}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>

              <aside className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-text-primary">Known truth for this body</p>
                    <p className="mt-1 text-xs capitalize text-text-secondary">
                      {snapshot.proof.gender ?? "Unknown"} · {snapshot.proof.heightCm ?? "—"} cm · {snapshot.proof.weightKg ?? "—"} kg
                    </p>
                  </div>
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                    BMI {snapshot.proof.bmi?.toFixed(1) ?? "—"}
                  </span>
                </div>

                <div className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
                  {snapshot.proof.rows.map((row) => (
                    <div key={row.key} className="grid grid-cols-[1fr_auto] gap-3 py-3 text-xs">
                      <div>
                        <p className="font-bold text-text-primary">{row.label}</p>
                        <p className="mt-1 text-text-secondary">
                          Front {row.widthCm ?? "—"} cm · depth {row.depthCm ?? "—"} cm
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-text-primary">{row.circumferenceCm ?? "—"} cm around</p>
                        <p className={cn(
                          "mt-1 font-semibold",
                          row.closed === false || row.reconstructed ? "text-amber-700" : row.closed ? "text-emerald-700" : "text-gray-500",
                        )}>
                          {row.closed === false
                            ? "Loop needs fix"
                            : row.reconstructed
                              ? `Body-only outline${row.perimeterDeltaPct === null ? "" : ` · ${row.perimeterDeltaPct.toFixed(1)}% mesh/tape gap`}`
                              : row.closed ? "Closed loop" : "Not checked"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {openProofRows.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    <p className="font-bold">Pilot paused before body 2</p>
                    <p className="mt-1">
                      {openProofRows.join(" and ")} still have open torso loops. We must fix those labels before rendering all 100.
                    </p>
                  </div>
                ) : reconstructedProofRows.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                    <p className="font-bold">Body-only lines checked</p>
                    <p className="mt-1">
                      {reconstructedProofRows.join(", ")} use a closed central-torso outline because the raw scan has gaps. The real WEAR tape number stays a separate training answer; we do not force the mesh into an ellipse.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    All five measurement loops are closed for this proof.
                  </div>
                )}

                <Link
                  href="/try-on-test/sizing-lab"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-blue hover:text-blue-700"
                >
                  Test it in AI Sizing Lab
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="mt-1 text-[11px] leading-4 text-text-secondary">
                  Select “WEAR 3D pilot 001” from the dataset menu.
                </p>
              </aside>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">Real pipeline</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">What happens next</h2>
              </div>
              <p className="text-xs text-text-secondary">Checked from this Mac at {checkedAt}</p>
            </div>

            <ol className="mt-7 space-y-1">
              {snapshot.stages.map((stage, index) => {
                const tone = STATUS_STYLES[stage.status];
                const StatusIcon = tone.icon;
                const StageIcon = STAGE_ICONS[index] ?? CircleDashed;
                return (
                  <li key={stage.title} className="relative grid grid-cols-[2.75rem_1fr] gap-4 pb-6 last:pb-0">
                    {index < snapshot.stages.length - 1 && (
                      <span className="absolute bottom-0 left-[1.34rem] top-11 w-px bg-gray-200" aria-hidden="true" />
                    )}
                    <span className={cn("z-10 flex size-11 items-center justify-center rounded-full border", tone.dot)}>
                      <StageIcon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-text-primary">{index + 1}. {stage.title}</p>
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold", tone.badge)}>
                          <StatusIcon className="size-3" aria-hidden="true" />
                          {tone.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-text-secondary">{stage.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="flex flex-col gap-4">
            <div className={cn(
              "rounded-3xl border p-6",
              snapshot.usbConnected || usbSafe
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50",
            )}>
              <div className="flex items-start gap-3">
                <span className={cn(
                  "rounded-xl p-2.5",
                  snapshot.usbConnected || usbSafe ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                )}>
                  {snapshot.usbConnected || usbSafe
                    ? <HardDrive className="size-5" aria-hidden="true" />
                    : <TriangleAlert className="size-5" aria-hidden="true" />}
                </span>
                <div>
                  <h2 className={cn("font-bold", snapshot.usbConnected || usbSafe ? "text-emerald-950" : "text-amber-950")}>
                    {usbSafe ? "USB no longer needed" : `USB ${snapshot.usbConnected ? "connected" : "not connected"}`}
                  </h2>
                  <p className={cn("mt-2 text-sm leading-6", snapshot.usbConnected || usbSafe ? "text-emerald-800" : "text-amber-800")}>
                    {usbSafe
                      ? "S3 file count and byte count match. The AWS job now runs without the flash drive or this Mac."
                      : snapshot.usbConnected
                        ? "Upload is still running. Keep the USB connected until the S3 file count matches."
                        : "Reconnect the USB so the protected upload can resume."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-blue-50 p-2.5 text-brand-blue">
                  <LockKeyhole className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold text-text-primary">AWS safety gate</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {paidComputeActive
                      ? `The protected copy is verified. One ${snapshot.training.aws.instanceType ?? "AWS"} worker is active and has a ${snapshot.training.aws.maxRuntimeHours}-hour hard stop.`
                      : snapshot.aws.uploadCompleted
                      ? "The protected S3 copy passed file-count and byte-count verification."
                      : "The protected upload is running through a temporary bounded worker role. No paid worker is running."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Vault ready</span>
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      snapshot.aws.uploadCompleted
                        ? "bg-emerald-50 text-emerald-700"
                        : snapshot.aws.uploadState === "needs_resume"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700",
                    )}>
                      {snapshot.aws.uploadCompleted
                        ? "Upload verified"
                        : snapshot.aws.uploadState === "needs_resume" ? "Resume needed" : "Upload running"}
                    </span>
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      paidComputeActive ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600",
                    )}>
                      {paidComputeActive
                        ? `1 capped ${snapshot.training.aws.instanceType ?? "AWS"} worker active`
                        : "No paid worker active"}
                    </span>
                  </div>
                  {snapshot.aws.uploadedBytes > 0 && !snapshot.aws.uploadCompleted ? (
                    <p className="mt-3 text-xs font-semibold text-blue-700">
                      Last measured {(snapshot.aws.uploadedBytes / 1_000_000_000).toFixed(1)} of {(snapshot.aws.targetBytes / 1_000_000_000).toFixed(1)} GB. Copy continues in the background.
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-gray-400">AWS setup last verified {snapshot.aws.lastVerifiedOn}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="font-bold text-text-primary">What the first SDK should learn</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="font-semibold text-text-primary">User gives</p>
                  <p className="mt-1 leading-6 text-text-secondary">Front photo · height · weight · gender · women&apos;s bust size when known</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="font-semibold text-blue-950">Model returns</p>
                  <p className="mt-1 leading-6 text-blue-800">WEAR rows · direct measurements · confidence or retake message</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-text-secondary">
                Neck, shoulder, sleeve, inseam, and every other eligible WEAR target are included in v6. The SDK will expose only targets that pass held-out and real-photo checks; garment size is then matched against each merchant&apos;s size chart.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
