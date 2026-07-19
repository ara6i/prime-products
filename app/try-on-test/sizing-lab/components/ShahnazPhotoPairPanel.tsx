"use client";

import type { GeminiBodyGuide, GeminiGuideLine } from "../lib/geminiGuide";

type PhotoKey = "tape" | "second";

interface Props {
  tapeImageUrl: string;
  secondImageUrl: string;
  tapeImageWidth: number;
  tapeImageHeight: number;
  secondImageWidth: number;
  secondImageHeight: number;
  tapeGuide: GeminiBodyGuide;
  secondGuide: GeminiBodyGuide;
  activePhoto: PhotoKey;
  switchStatus: "idle" | "loading" | "ready" | "error";
  switchError: string | null;
  onSelectPhoto: (photo: PhotoKey) => void;
  large?: boolean;
}

const ROWS: Array<{
  kind: "waist" | "trouserWaist" | "hips";
  label: string;
  color: string;
}> = [
  { kind: "waist", label: "waist", color: "#ef4444" },
  { kind: "trouserWaist", label: "trouser", color: "#f97316" },
  { kind: "hips", label: "hips", color: "#e11d48" },
];

export function ShahnazPhotoPairPanel({
  tapeImageUrl,
  secondImageUrl,
  tapeImageWidth,
  tapeImageHeight,
  secondImageWidth,
  secondImageHeight,
  tapeGuide,
  secondGuide,
  activePhoto,
  switchStatus,
  switchError,
  onSelectPhoto,
  large = false,
}: Props) {
  const isSwitching = switchStatus === "loading";

  return (
    <section data-testid="shahnaz-photo-pair" className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-slate-900">
      <div className="flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">1</span>
        <div>
          <h4 className="text-sm font-semibold text-indigo-950">Choose the photo that does the calculation</h4>
          <p className="mt-1 text-[11px] leading-4 text-indigo-900">
            Both photos keep matching red body rows. Click one photo: only that photo sends pixels to Apple Vision, Depth Pro and the circumference calculation.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PhotoChoice
          photoKey="tape"
          title="Photo 1 · tape reference"
          detail="Saved Shahnaz 2 photo"
          imageUrl={tapeImageUrl}
          imageWidth={tapeImageWidth}
          imageHeight={tapeImageHeight}
          guide={tapeGuide}
          active={activePhoto === "tape"}
          disabled={isSwitching}
          large={large}
          onSelect={onSelectPhoto}
        />
        <PhotoChoice
          photoKey="second"
          title="Photo 2 · IMG_8444 · no tape"
          detail="Tape-free photo · matching body rows"
          imageUrl={secondImageUrl}
          imageWidth={secondImageWidth}
          imageHeight={secondImageHeight}
          guide={secondGuide}
          active={activePhoto === "second"}
          disabled={isSwitching}
          large={large}
          onSelect={onSelectPhoto}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-3">
        <SimpleStep number="1" text="Pick a photo above." />
        <SimpleStep number="2" text="The red rows belong to that photo." />
        <SimpleStep number="3" text="Read that photo's result below." />
      </div>

      <div className="mt-2 rounded-lg border border-indigo-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-indigo-900">
        The second rows were transferred by matching the two photos, then placed on the same waist, trouser-waist and hip locations. We did not reuse one flat pixel span.
      </div>
      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] leading-4 text-emerald-900">
        IMG_8444 has no tape. Click it to make this tape-free photo own the calculation on the right.
      </div>

      {isSwitching ? (
        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] font-medium text-blue-900" aria-live="polite">
          Switching active photo and detecting Shahnaz…
        </div>
      ) : null}
      {switchStatus === "error" ? (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-800" role="alert">
          Could not activate this photo: {switchError ?? "unknown error"}
        </div>
      ) : null}
    </section>
  );
}

function PhotoChoice({
  photoKey,
  title,
  detail,
  imageUrl,
  imageWidth,
  imageHeight,
  guide,
  active,
  disabled,
  large,
  onSelect,
}: {
  photoKey: PhotoKey;
  title: string;
  detail: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  guide: GeminiBodyGuide;
  active: boolean;
  disabled: boolean;
  large: boolean;
  onSelect: (photo: PhotoKey) => void;
}) {
  return (
    <button
      type="button"
      data-photo-key={photoKey}
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onSelect(photoKey)}
      className={`overflow-hidden rounded-xl border-2 bg-white text-left transition disabled:cursor-wait disabled:opacity-70 ${active
        ? "border-indigo-600 ring-2 ring-indigo-200"
        : "border-slate-200 hover:border-indigo-300"}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div>
          <div className="text-xs font-semibold text-slate-950">{title}</div>
          <div className="text-[9px] text-slate-500">{detail}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${active
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 text-slate-600"}`}>
          {active ? "ACTIVE CALCULATION" : "USE THIS PHOTO"}
        </span>
      </div>
      <div className="bg-black">
        <div className={large ? "relative mx-auto w-fit" : "relative"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title}
            className={large ? "block max-h-[62vh] max-w-full object-contain" : "block h-auto w-full"}
            draggable={false}
          />
          <svg
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {ROWS.map((row) => (
              <GuideLine key={row.kind} line={guide[row.kind]} label={row.label} color={row.color} imageWidth={imageWidth} />
            ))}
          </svg>
        </div>
      </div>
    </button>
  );
}

function GuideLine({
  line,
  label,
  color,
  imageWidth,
}: {
  line: GeminiGuideLine | undefined;
  label: string;
  color: string;
  imageWidth: number;
}) {
  const points = linePoints(line);
  if (!points) return null;
  const strokeWidth = imageWidth * 0.004;
  const radius = strokeWidth * 1.2;
  const fontSize = imageWidth * 0.013;
  return (
    <g>
      <line x1={points.leftX} y1={points.y} x2={points.rightX} y2={points.y} stroke="rgba(255,255,255,0.95)" strokeWidth={strokeWidth * 1.7} strokeLinecap="round" />
      <line x1={points.leftX} y1={points.y} x2={points.rightX} y2={points.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx={points.leftX} cy={points.y} r={radius} fill="white" stroke={color} strokeWidth={strokeWidth * 0.45} />
      <circle cx={points.rightX} cy={points.y} r={radius} fill="white" stroke={color} strokeWidth={strokeWidth * 0.45} />
      <text
        x={points.leftX}
        y={Math.max(fontSize, points.y - fontSize * 0.45)}
        fill={color}
        stroke="white"
        strokeWidth={fontSize * 0.12}
        paintOrder="stroke"
        fontSize={fontSize}
        fontWeight="700"
      >
        {label}
      </text>
    </g>
  );
}

function linePoints(line: GeminiGuideLine | undefined): { leftX: number; rightX: number; y: number } | null {
  if (!line) return null;
  const leftX = Number(line.left_x_px ?? line.points?.[0]?.x_px);
  const rightX = Number(line.right_x_px ?? line.points?.[line.points.length - 1]?.x_px);
  const y = Number(line.y_px ?? line.points?.[0]?.y_px);
  if (![leftX, rightX, y].every(Number.isFinite) || rightX <= leftX) return null;
  return { leftX, rightX, y };
}

function SimpleStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-2 py-2 text-slate-700">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-800">{number}</span>
      <span>{text}</span>
    </div>
  );
}
