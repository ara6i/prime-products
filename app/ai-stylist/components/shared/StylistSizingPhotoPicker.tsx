"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Check,
  CloudUpload,
  LoaderCircle,
  Save,
  UserRound,
} from "lucide-react";
import { getAiSizingFields } from "@/app/onboarding/lib/ai-sizing-profile";
import type { BodyLandmarks } from "@/app/onboarding/types";
import type {
  StylistSizingChoice,
  StylistSizingPhotoStatus,
} from "@/app/ai-stylist/hooks/useStylistSizingPhoto";

interface StylistSizingPhotoPickerProps {
  gender: "female" | "male";
  source: "saved" | "new";
  sizingChoice: StylistSizingChoice;
  savedPhotoUrl: string | null;
  uploaded: {
    name: string;
    size: number;
    dataUrl: string;
    landmarks?: BodyLandmarks;
  } | null;
  status: StylistSizingPhotoStatus;
  error: string | null;
  measurements: Record<string, number>;
  unit: "cm" | "in";
  hasSavedMeasurements: boolean;
  onUseSaved: () => void;
  onUpload: (file: File) => void | Promise<void>;
  onUseSavedMeasurements: () => void;
  onGenerateMeasurements: () => void | Promise<void>;
  onSaveGeneratedProfile: () => void | Promise<void>;
}

const STATUS_COPY = {
  analyzing: "Mapping body landmarks…",
  estimating: "Calculating your measurements…",
  saving: "Saving your sizing profile…",
} as const;

const SKELETON_CONNECTIONS: Array<
  [keyof BodyLandmarks, keyof BodyLandmarks]
> = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

function LandmarkOverlay({
  landmarks,
  active,
}: {
  landmarks: BodyLandmarks;
  active: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const { imageWidth, imageHeight } = landmarks;
  const points = Object.entries(landmarks).filter(
    ([, value]) =>
      typeof value === "object" &&
      value !== null &&
      "x" in value &&
      "y" in value,
  ) as Array<[string, { x: number; y: number }]>;

  return (
    <motion.svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="stylist-pose-scan" x1="0" x2="1">
          <stop offset="0" stopColor="#7258fa" stopOpacity="0" />
          <stop offset="0.5" stopColor="#9cecff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#7258fa" stopOpacity="0" />
        </linearGradient>
      </defs>
      {SKELETON_CONNECTIONS.map(([from, to], index) => {
        const a = landmarks[from];
        const b = landmarks[to];
        if (
          typeof a !== "object" ||
          typeof b !== "object" ||
          !("x" in a) ||
          !("x" in b)
        ) {
          return null;
        }
        return (
          <motion.line
            key={`${String(from)}-${String(to)}`}
            x1={a.x * imageWidth}
            y1={a.y * imageHeight}
            x2={b.x * imageWidth}
            y2={b.y * imageHeight}
            stroke="rgba(255,255,255,.95)"
            strokeWidth={Math.max(2, imageWidth / 350)}
            strokeLinecap="round"
            initial={{
              opacity: reduceMotion ? 0.9 : 0,
              pathLength: reduceMotion ? 1 : 0,
            }}
            animate={{
              opacity: active && !reduceMotion ? [0.55, 1, 0.55] : 0.9,
              pathLength: 1,
            }}
            transition={{
              pathLength: {
                duration: reduceMotion ? 0.01 : 0.42,
                delay: reduceMotion ? 0 : index * 0.045,
              },
              opacity: {
                duration: reduceMotion ? 0.01 : 1.1,
                repeat: active && !reduceMotion ? Infinity : 0,
              },
            }}
          />
        );
      })}
      {points.map(([name, point], index) => {
        const radius = Math.max(3, imageWidth / 220);
        return (
          <motion.circle
            key={name}
            cx={point.x * imageWidth}
            cy={point.y * imageHeight}
            r={radius}
            fill="#7258fa"
            stroke="white"
            strokeWidth={Math.max(1.5, imageWidth / 500)}
            initial={{ opacity: 0, r: 0 }}
            animate={{
              opacity: 1,
              r:
                active && !reduceMotion
                  ? [radius, radius * 1.35, radius]
                  : radius,
            }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.9,
              delay: reduceMotion ? 0 : 0.12 + index * 0.035,
              repeat: active && !reduceMotion ? Infinity : 0,
            }}
          />
        );
      })}
      {active && !reduceMotion && (
        <motion.rect
          x={0}
          width={imageWidth}
          height={Math.max(3, imageHeight / 180)}
          fill="url(#stylist-pose-scan)"
          animate={{
            opacity: [0, 0.95, 0.95, 0],
            y: [imageHeight * 0.08, imageHeight * 0.92],
          }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}
    </motion.svg>
  );
}

export function StylistSizingPhotoPicker({
  gender,
  source,
  sizingChoice,
  savedPhotoUrl,
  uploaded,
  status,
  error,
  measurements,
  unit,
  hasSavedMeasurements,
  onUseSaved,
  onUpload,
  onUseSavedMeasurements,
  onGenerateMeasurements,
  onSaveGeneratedProfile,
}: StylistSizingPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy =
    status === "analyzing" ||
    status === "estimating" ||
    status === "saving";
  const focused =
    source === "new" &&
    Boolean(uploaded) &&
    sizingChoice === "generated" &&
    status !== "idle";
  const measurementFields = getAiSizingFields(gender)
    .map((field) => ({ ...field, value: measurements[field.key] }))
    .filter(
      (field): field is typeof field & { value: number } =>
        typeof field.value === "number" && Number.isFinite(field.value),
    );
  const preview =
    source === "saved" ? savedPhotoUrl : uploaded?.dataUrl ?? null;
  const showingResults =
    status === "results" || status === "saving" || status === "ready";

  return (
    <div
      data-testid="stylist-sizing-photo-picker"
      className="space-y-3"
    >
      {!focused && (
        <div className={`grid gap-2 ${savedPhotoUrl ? "grid-cols-2" : ""}`}>
          {savedPhotoUrl && (
            <button
              type="button"
              aria-pressed={source === "saved"}
              onClick={onUseSaved}
              className={`rounded-xl border p-3 text-left transition ${
                source === "saved"
                  ? "border-[#7258fa] bg-[#f3f0ff]"
                  : "border-[#dedce3] bg-white"
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-[#24212c]">
                <UserRound className="size-4 text-[#7258fa]" />
                Saved sizing photo
                {source === "saved" && (
                  <Check className="ml-auto size-4 text-[#7258fa]" />
                )}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-[#77737f]">
                Use the photo and measurements saved in your profile.
              </span>
            </button>
          )}
          <button
            type="button"
            aria-pressed={source === "new"}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={`rounded-xl border p-3 text-left transition disabled:cursor-wait ${
              source === "new"
                ? "border-[#7258fa] bg-[#f3f0ff]"
                : "border-[#dedce3] bg-white"
            }`}
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-[#24212c]">
              <CloudUpload className="size-4 text-[#7258fa]" />
              {savedPhotoUrl ? "Upload another photo" : "Upload your photo"}
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-[#77737f]">
              We map landmarks and calculate a new sizing profile.
            </span>
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onUpload(file);
          event.target.value = "";
        }}
      />

      {focused && preview ? (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-sm font-semibold text-[#24212c]">
              {status === "results" || status === "ready"
                ? "Your sizing results"
                : STATUS_COPY[status as keyof typeof STATUS_COPY]}
            </p>
            <p className="mt-1 text-[11px] text-[#77737f]">
              {status === "results"
                ? "Review the results before saving this profile."
                : status === "ready"
                  ? "This sizing profile is saved and ready to use."
                  : "Keep this screen open while we read the full-body photo."}
            </p>
          </div>

          <div
            className={`relative mx-auto w-fit max-w-full overflow-hidden rounded-2xl border border-[#dedce3] bg-[#f2f1f4] shadow-sm transition-[max-height] duration-500 ${
              showingResults ? "max-h-[24vh]" : "max-h-[48vh]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Full-body photo sizing analysis"
              className={`block w-auto max-w-full object-contain transition-[max-height] duration-500 ${
                showingResults ? "max-h-[24vh]" : "max-h-[48vh]"
              }`}
            />
            {uploaded?.landmarks ? (
              <LandmarkOverlay
                landmarks={uploaded.landmarks}
                active={status === "estimating"}
              />
            ) : (
              status === "analyzing" && (
                <span className="absolute inset-0 overflow-hidden bg-[#7258fa]/10">
                  <span className="stylist-sizing-scan absolute inset-x-0 top-0 h-0.5 bg-[#7258fa] shadow-[0_0_12px_#7258fa]" />
                </span>
              )
            )}
          </div>

          {(status === "results" ||
            status === "saving" ||
            status === "ready") &&
            measurementFields.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {measurementFields.map((field) => (
                  <div
                    key={field.key}
                    className="rounded-xl bg-[#f5f3fa] px-2 py-2 text-center"
                  >
                    <span className="block text-[10px] text-[#77737f]">
                      {field.label}
                    </span>
                    <span className="block text-xs font-semibold text-[#24212c]">
                      {field.value.toFixed(1)} {unit}
                    </span>
                  </div>
                ))}
              </div>
            )}

          {status === "results" && (
            <button
              type="button"
              onClick={() => void onSaveGeneratedProfile()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7258fa] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6249ec]"
            >
              <Save className="size-4" />
              Save sizing profile
            </button>
          )}
          {status === "saving" && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f3f0ff] px-4 py-3 text-sm font-semibold text-[#5945cb]">
              <LoaderCircle className="size-4 animate-spin" />
              Saving sizing profile…
            </div>
          )}
          {status === "ready" && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <Check className="size-4" />
              Sizing profile saved
            </div>
          )}
        </div>
      ) : preview ? (
        <div className="flex min-w-0 gap-3 rounded-xl border border-[#e2dfe7] bg-white p-3">
          <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-[#f2f1f4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={
                source === "saved"
                  ? "Saved full-body sizing photo"
                  : "New full-body sizing photo"
              }
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#24212c]">
              {source === "saved"
                ? "Your saved sizing photo"
                : uploaded?.name ?? "New sizing photo"}
            </p>
            {status === "ready" && source === "new" ? (
              <p className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <Check className="size-4" />
                Using your saved profile sizes
              </p>
            ) : (
              <p className="mt-2 text-[11px] leading-4 text-[#77737f]">
                Ready to use for your virtual try-ons.
              </p>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#aaa5b0] bg-[#f8f7fa] px-5 text-center"
        >
          <CloudUpload className="size-7 text-[#8d8794]" />
          <span className="mt-2 text-xs font-semibold text-[#24212c]">
            Upload a clear head-to-toe photo
          </span>
          <span className="mt-1 text-[11px] text-[#77737f]">
            JPG, PNG or WebP · both feet visible
          </span>
        </button>
      )}

      {source === "new" && uploaded && !busy && !sizingChoice && (
        <div className="rounded-xl border border-[#dedce3] bg-[#faf9fc] p-3">
          <p className="text-xs font-semibold text-[#24212c]">
            How should we size this photo?
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[#77737f]">
            Use your saved profile values or calculate new measurements from
            this photo.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!hasSavedMeasurements}
              onClick={onUseSavedMeasurements}
              className="rounded-lg border border-[#c9c5d0] bg-white px-3 py-2 text-left transition hover:border-[#7258fa] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="block text-[11px] font-semibold text-[#24212c]">
                Use saved profile
              </span>
              <span className="mt-0.5 block text-[10px] leading-3.5 text-[#77737f]">
                Keep your existing measurements
              </span>
            </button>
            <button
              type="button"
              onClick={() => void onGenerateMeasurements()}
              className="rounded-lg border border-[#7258fa] bg-[#f3f0ff] px-3 py-2 text-left transition hover:bg-[#ebe5ff]"
            >
              <span className="block text-[11px] font-semibold text-[#5945cb]">
                Generate new sizes
              </span>
              <span className="mt-0.5 block text-[10px] leading-3.5 text-[#6e62a4]">
                Run landmarks on this photo
              </span>
            </button>
          </div>
        </div>
      )}

      {!focused &&
        !savedPhotoUrl &&
        measurementFields.length > 0 &&
        !uploaded && (
          <p className="rounded-lg bg-[#fff7dc] px-3 py-2 text-[11px] leading-4 text-[#765200]">
            Your measurements are saved, but the previous onboarding flow did
            not store its body photo. Upload once here to save a complete
            sizing profile.
          </p>
        )}

      {!focused && measurementFields.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#77737f]">
            Your measurements
          </p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {measurementFields.map((field) => (
              <div
                key={field.key}
                className="rounded-lg bg-[#f5f3fa] px-2 py-1.5 text-center"
              >
                <span className="block text-[10px] text-[#77737f]">
                  {field.label}
                </span>
                <span className="block text-xs font-semibold text-[#24212c]">
                  {field.value.toFixed(1)} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      <style jsx>{`
        @keyframes stylist-sizing-scan {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(48vh);
          }
        }
        .stylist-sizing-scan {
          animation: stylist-sizing-scan 1.7s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .stylist-sizing-scan {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
