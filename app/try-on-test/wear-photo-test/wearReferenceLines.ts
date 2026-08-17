export type WearReviewRowKind = "neck" | "chest" | "underbust" | "waist" | "hips";
export type WearReferenceLineKind = WearReviewRowKind | "trouserWaist";

export interface NormalizedReferenceLine {
  kind: WearReferenceLineKind;
  label: string;
  leftX: number;
  rightX: number;
  y: number;
}

export interface WearReferenceSet {
  label: string;
  lines: Partial<Record<WearReferenceLineKind, NormalizedReferenceLine>>;
  note: string;
}

interface PixelLine {
  yPx: number;
  leftXPx: number;
  rightXPx: number;
}

interface PixelPreset {
  sourceImageWidth: number;
  sourceImageHeight: number;
  waist?: PixelLine;
  trouserWaist?: PixelLine;
  hips?: PixelLine;
}

const PRESETS: Record<string, PixelPreset> = {
  "negar-2": {
    sourceImageWidth: 1200,
    sourceImageHeight: 1600,
    waist: { yPx: 644, leftXPx: 498, rightXPx: 711 },
    hips: { yPx: 816, leftXPx: 458, rightXPx: 733 },
  },
  "negar-4": {
    sourceImageWidth: 1136,
    sourceImageHeight: 2048,
    waist: { yPx: 774, leftXPx: 282, rightXPx: 654 },
    hips: { yPx: 1050, leftXPx: 240, rightXPx: 680 },
  },
  shane: {
    sourceImageWidth: 5712,
    sourceImageHeight: 4284,
    waist: { yPx: 2384, leftXPx: 2215, rightXPx: 2781 },
    hips: { yPx: 2593, leftXPx: 2176, rightXPx: 2791 },
  },
  "shane-2": {
    sourceImageWidth: 4032,
    sourceImageHeight: 3024,
    waist: { yPx: 1358, leftXPx: 1919, rightXPx: 2238 },
    hips: { yPx: 1698, leftXPx: 1886, rightXPx: 2247 },
  },
  "shahnaz-2-tape": {
    sourceImageWidth: 4284,
    sourceImageHeight: 5712,
    waist: { yPx: 2235, leftXPx: 1730, rightXPx: 2778 },
    hips: { yPx: 3077, leftXPx: 1676, rightXPx: 2828 },
  },
  "shahnaz-2-second": {
    sourceImageWidth: 1200,
    sourceImageHeight: 1600,
    waist: { yPx: 630, leftXPx: 451, rightXPx: 759 },
    hips: { yPx: 879, leftXPx: 437, rightXPx: 765 },
  },
  nadia: {
    sourceImageWidth: 3072,
    sourceImageHeight: 4080,
    waist: { yPx: 1699, leftXPx: 1412, rightXPx: 1901 },
    hips: { yPx: 2067, leftXPx: 1323, rightXPx: 1991 },
  },
  "delaram-2": {
    sourceImageWidth: 1920,
    sourceImageHeight: 2560,
    waist: { yPx: 1075, leftXPx: 750, rightXPx: 1159 },
    trouserWaist: { yPx: 1326, leftXPx: 697, rightXPx: 1211 },
    hips: { yPx: 1430, leftXPx: 686, rightXPx: 1221 },
  },
};

function normalizedLine(
  kind: WearReferenceLineKind,
  preset: PixelPreset,
  line: PixelLine,
): NormalizedReferenceLine {
  return {
    kind,
    label: kind === "waist"
      ? "Saved natural waist"
      : kind === "trouserWaist"
        ? "Saved lower waist"
        : "Saved hips",
    leftX: line.leftXPx / preset.sourceImageWidth,
    rightX: line.rightXPx / preset.sourceImageWidth,
    y: line.yPx / preset.sourceImageHeight,
  };
}

export function getWearReferenceSet(setId: string, imageUrl: string): WearReferenceSet | null {
  let presetKey = setId;
  if (setId === "negar") presetKey = "negar-2";
  if (setId === "shahnaz-2") {
    presetKey = imageUrl.includes("no-tape") ? "shahnaz-2-second" : "shahnaz-2-tape";
  }
  const preset = PRESETS[presetKey];
  if (!preset) {
    return setId === "bahar"
      ? {
          label: "Bahar saved review",
          lines: {},
          note: "Bahar has saved row heights, but no saved left/right endpoints. A red width line would be invented, so it is not drawn.",
        }
      : null;
  }

  const lines: WearReferenceSet["lines"] = {};
  if (preset.waist) lines.waist = normalizedLine("waist", preset, preset.waist);
  if (preset.trouserWaist) lines.trouserWaist = normalizedLine("trouserWaist", preset, preset.trouserWaist);
  if (preset.hips) lines.hips = normalizedLine("hips", preset, preset.hips);
  return {
    label: `${setId.replaceAll("-", " ")} saved review`,
    lines,
    note: "These red endpoints were saved in the older manual review. They are reference labels, not WEAR model predictions.",
  };
}
