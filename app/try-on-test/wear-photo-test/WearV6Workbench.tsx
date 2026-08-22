"use client";

import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Maximize2,
  Move,
  RotateCcw,
  ScanLine,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/app/shared/lib/utils";
import {
  getWearReferenceSet,
  type NormalizedReferenceLine,
  type WearReferenceLineKind,
} from "./wearReferenceLines";
import type {
  WearV6Line,
  WearV6MetaStatus,
  WearV6Prediction,
  WearV6RowKind,
  WearV6WidthMethod,
} from "./wearV6Types";

type EdgeMode = "wear-rgb" | "mask-assisted" | "meta-3d";
type DragPart = "left" | "right" | "row";
type ResultUnit = "cm" | "in";
type DepthControlMode = "ratio" | "cm";
type WearAuxiliaryLineKind =
  | "head"
  | "armscye"
  | "chest-scye"
  | "hand"
  | "vertical-trunk"
  | "thigh"
  | "maximum-seated-thigh"
  | "ankle";

interface WearAuxiliaryLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface WearAuxiliaryDragState {
  kind: WearAuxiliaryLineKind;
  part: "start" | "end" | "row";
  start: { x: number; y: number };
  initial: WearAuxiliaryLine;
}

const MIN_DEPTH_RATIO = 0.35;
const MAX_DEPTH_RATIO = 1.1;
const DEFAULT_DEPTH_CONTROL_MODES: Record<WearV6RowKind, DepthControlMode> = {
  neck: "ratio",
  chest: "ratio",
  underbust: "ratio",
  waist: "ratio",
  hips: "ratio",
};

interface DragState {
  kind: WearV6RowKind;
  part: DragPart;
  start: { x: number; y: number };
  initial: WearV6Line;
}

interface ReferenceDragState {
  kind: WearReferenceLineKind;
  part: DragPart;
  start: { x: number; y: number };
  initial: NormalizedReferenceLine;
}

interface WearV6WorkbenchProps {
  imageUrl: string;
  imageSize: { width: number; height: number };
  selectedDatasetId: string;
  prediction: WearV6Prediction;
  maskLines: Partial<Record<WearV6RowKind, WearV6Line>>;
  metaLines: Partial<Record<WearV6RowKind, WearV6Line>>;
  metaStatus: WearV6MetaStatus;
  actuals: Partial<Record<WearV6RowKind, number | null>>;
  widthMethod: WearV6WidthMethod;
  appleVisionWidths: Partial<Record<WearV6RowKind, number>>;
  appleDepthWidths: Partial<Record<WearV6RowKind, number>>;
  appleState: "idle" | "loading" | "ready" | "error";
  appleDetail: string;
  appleDepthState: "idle" | "loading" | "ready" | "error";
  appleDepthDetail: string;
  onRecalculate: (lines: Partial<Record<WearV6RowKind, WearV6Line>>) => Promise<void>;
  onRunMeta: (lines: Partial<Record<WearV6RowKind, WearV6Line>>) => Promise<Partial<Record<WearV6RowKind, WearV6Line>>>;
  onWidthMethodChange: (method: WearV6WidthMethod, lines: Partial<Record<WearV6RowKind, WearV6Line>>) => Promise<void>;
  onClearPrediction: () => void;
}

const ORDER: WearV6RowKind[] = ["waist", "hips", "neck", "chest", "underbust"];

const OTHER_WEAR_CIRCUMFERENCE_LINES = [
  { kind: "head", label: "Head circumference", detail: "Tragion-to-tragion WEAR landmark guide", measurementKey: "measurements_mm.head_circumference_mm", standingModelTarget: true },
  { kind: "armscye", label: "Armscye circumference", detail: "Acromion-to-axilla WEAR landmark guide", measurementKey: "measurements_mm.armscye_circumference_mm", standingModelTarget: true },
  { kind: "chest-scye", label: "Chest at scye", detail: "WEAR axilla-height torso guide", measurementKey: "measurements_mm.chest_scye_circumference_mm", standingModelTarget: true },
  { kind: "hand", label: "Hand circumference", detail: "WEAR metacarpal landmark guide", measurementKey: "measurements_mm.hand_circumference_mm", standingModelTarget: true },
  { kind: "vertical-trunk", label: "Vertical trunk circumference", detail: "Suprasternale-to-crotch WEAR landmark guide", measurementKey: "measurements_mm.vertical_trunk_circumference_mm", standingModelTarget: true },
  { kind: "thigh", label: "Thigh circumference", detail: "WEAR crotch/trochanterion standing guide", measurementKey: "measurements_mm.thigh_circumference_mm", standingModelTarget: true },
  { kind: "maximum-seated-thigh", label: "Maximum seated thigh", detail: "Seated-source guide; not a standing-model target", measurementKey: null, standingModelTarget: false },
  { kind: "ankle", label: "Ankle circumference", detail: "WEAR medial/lateral malleolus guide", measurementKey: "measurements_mm.ankle_circumference_mm", standingModelTarget: true },
] as const;

const AUXILIARY_ORDER = OTHER_WEAR_CIRCUMFERENCE_LINES.map((line) => line.kind) as WearAuxiliaryLineKind[];

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function rowLabel(kind: WearV6RowKind, gender: "female" | "male") {
  if (kind === "underbust") return "Under-bust";
  if (kind === "waist") return "Natural waist";
  if (kind === "neck") return "Neck base";
  if (kind === "chest" && gender === "female") return "Bust / chest";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function formatLength(valueCm: number | null | undefined, unit: ResultUnit) {
  if (!Number.isFinite(valueCm)) return "—";
  return unit === "in" ? `${(Number(valueCm) / 2.54).toFixed(1)} in` : `${Number(valueCm).toFixed(1)} cm`;
}

function formatSignedLength(valueCm: number | null | undefined, unit: ResultUnit) {
  if (!Number.isFinite(valueCm)) return "—";
  return `${Number(valueCm) >= 0 ? "+" : ""}${formatLength(valueCm, unit)}`;
}

function scaleCrossSection(
  points: Array<{ breadthNorm: number; depthNorm: number }>,
  breadthCm: number,
  depthCm: number,
) {
  if (points.length < 3 || breadthCm <= 0 || depthCm <= 0) return [];
  const breadths = points.map((point) => point.breadthNorm);
  const depths = points.map((point) => point.depthNorm);
  const minimumBreadth = Math.min(...breadths);
  const maximumBreadth = Math.max(...breadths);
  const minimumDepth = Math.min(...depths);
  const maximumDepth = Math.max(...depths);
  const breadthSpan = maximumBreadth - minimumBreadth;
  const depthSpan = maximumDepth - minimumDepth;
  if (breadthSpan <= 1e-6 || depthSpan <= 1e-6) return [];
  return points.map((point) => ({
    x: (((point.breadthNorm - minimumBreadth) / breadthSpan) - 0.5) * breadthCm,
    y: (((point.depthNorm - minimumDepth) / depthSpan) - 0.5) * depthCm,
  }));
}

function crossSectionPerimeterCm(
  points: Array<{ breadthNorm: number; depthNorm: number }>,
  breadthCm: number,
  depthCm: number,
) {
  const scaled = scaleCrossSection(points, breadthCm, depthCm);
  if (scaled.length < 3) return null;
  return scaled.reduce((total, point, index) => {
    const next = scaled[(index + 1) % scaled.length]!;
    return total + Math.hypot(next.x - point.x, next.y - point.y);
  }, 0);
}

function depthForTargetCircumferenceCm(
  points: Array<{ breadthNorm: number; depthNorm: number }>,
  breadthCm: number,
  targetCircumferenceCm: number | null,
) {
  if (!Number.isFinite(targetCircumferenceCm) || targetCircumferenceCm == null || targetCircumferenceCm <= 0 || breadthCm <= 0) return null;
  let low = breadthCm * 0.02;
  let high = breadthCm * 2.5;
  const lowPerimeter = crossSectionPerimeterCm(points, breadthCm, low);
  const highPerimeter = crossSectionPerimeterCm(points, breadthCm, high);
  if (lowPerimeter == null || highPerimeter == null || targetCircumferenceCm < lowPerimeter || targetCircumferenceCm > highPerimeter) return null;
  for (let index = 0; index < 60; index += 1) {
    const middle = (low + high) / 2;
    const perimeter = crossSectionPerimeterCm(points, breadthCm, middle);
    if (perimeter == null) return null;
    if (perimeter < targetCircumferenceCm) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

function crossSectionPreviewPoints(
  points: Array<{ breadthNorm: number; depthNorm: number }>,
  breadthCm: number,
  depthCm: number,
) {
  const scaled = scaleCrossSection(points, breadthCm, depthCm);
  if (!scaled.length) return "";
  const fitScale = 76 / Math.max(breadthCm, depthCm);
  return [...scaled, scaled[0]!]
    .map((point) => `${50 + point.x * fitScale},${50 - point.y * fitScale}`)
    .join(" ");
}

function lineSignature(lines: Partial<Record<WearV6RowKind, WearV6Line>>) {
  return ORDER.map((kind) => {
    const line = lines[kind];
    return line ? `${kind}:${line.leftX.toFixed(5)}:${line.rightX.toFixed(5)}:${line.y.toFixed(5)}` : `${kind}:-`;
  }).join("|");
}

function lineChanged(left: WearV6Line | undefined, right: WearV6Line | undefined) {
  if (!left || !right) return left !== right;
  return Math.abs(left.leftX - right.leftX) > 0.0001
    || Math.abs(left.rightX - right.rightX) > 0.0001
    || Math.abs(left.y - right.y) > 0.0001;
}

function auxiliaryLineChanged(left: WearAuxiliaryLine | undefined, right: WearAuxiliaryLine | undefined) {
  if (!left || !right) return left !== right;
  return Math.abs(left.start.x - right.start.x) > 0.0001
    || Math.abs(left.start.y - right.start.y) > 0.0001
    || Math.abs(left.end.x - right.end.x) > 0.0001
    || Math.abs(left.end.y - right.end.y) > 0.0001;
}

function buildAuxiliaryWearLines(
  prediction: WearV6Prediction,
  coreLines: Partial<Record<WearV6RowKind, WearV6Line>>,
) {
  const landmarks = new Map(prediction.landmarks.map((landmark) => [landmark.name, landmark.photo]));
  const point = (...names: string[]) => names.map((name) => landmarks.get(name)).find(Boolean);
  const segment = (
    start: { x: number; y: number } | undefined,
    end: { x: number; y: number } | undefined,
  ): WearAuxiliaryLine | null => {
    if (!start || !end || Math.hypot(end.x - start.x, end.y - start.y) < 0.005) return null;
    return {
      start: { x: clamp(start.x), y: clamp(start.y) },
      end: { x: clamp(end.x), y: clamp(end.y) },
    };
  };
  const horizontalTorsoLine = (y: number, preferred: WearV6RowKind): WearAuxiliaryLine | null => {
    const preferredLine = coreLines[preferred];
    const fallback = preferredLine ?? Object.values(coreLines)
      .filter((line): line is WearV6Line => Boolean(line))
      .sort((left, right) => Math.abs(left.y - y) - Math.abs(right.y - y))[0];
    return fallback ? segment({ x: fallback.leftX, y }, { x: fallback.rightX, y }) : null;
  };
  const upperThighLine = () => {
    const crotch = point("Crotch");
    const trochanter = point("Rt. Trochanterion", "Lt. Trochanterion");
    const knee = point("Rt. Knee Crease", "Lt. Knee Crease");
    if (!crotch || !trochanter) return null;
    const y = knee ? crotch.y + (knee.y - crotch.y) * 0.12 : Math.max(crotch.y, trochanter.y) + 0.02;
    const outsideX = trochanter.x;
    const insideX = crotch.x + (trochanter.x - crotch.x) * 0.08;
    return segment({ x: insideX, y }, { x: outsideX, y });
  };

  const leftAxilla = point("Lt. Axilla, Ant", "Lt. Axilla, Post.");
  const rightAxilla = point("Rt. Axilla, Ant", "Rt. Axilla, Post.");
  const scyeY = leftAxilla && rightAxilla
    ? (leftAxilla.y + rightAxilla.y) / 2
    : coreLines.chest?.y ?? 0.35;
  const thigh = upperThighLine();

  return {
    head: segment(point("Lt. Tragion", "Lt. Infraorbitale"), point("Rt. Tragion", "Rt. Infraorbitale")),
    armscye: segment(point("Rt. Acromion", "Lt. Acromion"), point("Rt. Axilla, Ant", "Lt. Axilla, Ant")),
    "chest-scye": horizontalTorsoLine(scyeY, "chest"),
    hand: segment(
      point("Rt. Metacarpal Phal. II", "Lt. Metacarpal-Phal. II"),
      point("Rt. Metacarpal-Phal. V", "Lt. Metacarpal-Phal. V"),
    ),
    "vertical-trunk": segment(point("Suprasternale"), point("Crotch")),
    thigh,
    "maximum-seated-thigh": thigh ? {
      start: { x: thigh.start.x, y: clamp(thigh.start.y + 0.018) },
      end: { x: thigh.end.x, y: clamp(thigh.end.y + 0.018) },
    } : null,
    ankle: segment(
      point("Rt. Medial Malleolus", "Lt. Medial Malleolus"),
      point("Rt. Lateral Malleolus", "Lt. Lateral Malleolus"),
    ),
  } satisfies Record<WearAuxiliaryLineKind, WearAuxiliaryLine | null>;
}

export function WearV6Workbench({
  imageUrl,
  imageSize,
  selectedDatasetId,
  prediction,
  maskLines,
  metaLines,
  metaStatus,
  actuals,
  widthMethod,
  appleVisionWidths,
  appleDepthWidths,
  appleState,
  appleDetail,
  appleDepthState,
  appleDepthDetail,
  onRecalculate,
  onRunMeta,
  onWidthMethodChange,
  onClearPrediction,
}: WearV6WorkbenchProps) {
  const wearLines = useMemo(() => Object.fromEntries(prediction.rows.map((row) => [row.kind, {
    leftX: Math.min(row.photo.left.x, row.photo.right.x),
    rightX: Math.max(row.photo.left.x, row.photo.right.x),
    y: (row.photo.left.y + row.photo.right.y) / 2,
  }])) as Partial<Record<WearV6RowKind, WearV6Line>>, [prediction.rows]);
  const availableKinds = ORDER.filter((kind) => wearLines[kind]);
  const auxiliarySourceLines = useMemo(
    () => buildAuxiliaryWearLines(prediction, wearLines),
    [prediction, wearLines],
  );
  const availableAuxiliaryKinds = AUXILIARY_ORDER.filter((kind) => auxiliarySourceLines[kind]);
  const auxiliaryMeasurementValues = useMemo(() => new Map(
    prediction.allPredictions.map((item) => [item.key, item.value]),
  ), [prediction.allPredictions]);
  const [activeKind, setActiveKind] = useState<WearV6RowKind>(() => availableKinds.includes("waist") ? "waist" : availableKinds[0] ?? "chest");
  const [activeAuxiliaryKind, setActiveAuxiliaryKind] = useState<WearAuxiliaryLineKind | null>(null);
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("wear-rgb");
  const [linesByMode, setLinesByMode] = useState<Record<EdgeMode, Partial<Record<WearV6RowKind, WearV6Line>>>>({
    "wear-rgb": wearLines,
    "mask-assisted": { ...wearLines, ...maskLines },
    "meta-3d": { ...wearLines, ...metaLines },
  });
  const [auxiliaryLines, setAuxiliaryLines] = useState<Partial<Record<WearAuxiliaryLineKind, WearAuxiliaryLine>>>(() => Object.fromEntries(
    Object.entries(auxiliarySourceLines).filter((entry): entry is [WearAuxiliaryLineKind, WearAuxiliaryLine] => Boolean(entry[1])),
  ));
  const [lineVisibility, setLineVisibility] = useState<Record<WearV6RowKind, boolean>>({
    neck: false,
    chest: prediction.profile.gender === "male",
    underbust: false,
    waist: true,
    hips: true,
  });
  const [auxiliaryLineVisibility, setAuxiliaryLineVisibility] = useState<Record<WearAuxiliaryLineKind, boolean>>({
    head: false,
    armscye: false,
    "chest-scye": false,
    hand: false,
    "vertical-trunk": false,
    thigh: false,
    "maximum-seated-thigh": false,
    ankle: false,
  });
  const [showReferences, setShowReferences] = useState(false);
  const [showOptionalResults, setShowOptionalResults] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(0.5);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [auxiliaryDrag, setAuxiliaryDrag] = useState<WearAuxiliaryDragState | null>(null);
  const [referenceDrag, setReferenceDrag] = useState<ReferenceDragState | null>(null);
  const [referenceLineEdits, setReferenceLineEdits] = useState<Record<string, Partial<Record<WearReferenceLineKind, NormalizedReferenceLine>>>>({});
  const [editRevision, setEditRevision] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculateError, setRecalculateError] = useState<string | null>(null);
  const [widthSwitching, setWidthSwitching] = useState(false);
  const [widthSwitchError, setWidthSwitchError] = useState<string | null>(null);
  const [resultUnit, setResultUnit] = useState<ResultUnit>("cm");
  const [depthControlModes, setDepthControlModes] = useState<Record<WearV6RowKind, DepthControlMode>>(DEFAULT_DEPTH_CONTROL_MODES);
  const [depthRatioOverrides, setDepthRatioOverrides] = useState<Partial<Record<WearV6RowKind, number>>>({});
  const lastSubmittedRef = useRef("");
  const maskAvailable = Object.keys(maskLines).length > 0;
  const metaAvailable = metaStatus.state === "ready" && Object.keys(metaLines).length > 0;
  const modelLabel = prediction.model.version.match(/v6r\d+/)?.[0] ?? "v6";
  const usesRgbBodyShape = prediction.model.coreMeasurementMethod.includes("mask-free-RGB");
  const sourceLines = edgeMode === "wear-rgb"
    ? wearLines
    : edgeMode === "mask-assisted"
      ? { ...wearLines, ...maskLines }
      : { ...wearLines, ...metaLines };
  const editableLines = linesByMode[edgeMode];
  const referenceSet = useMemo(
    () => getWearReferenceSet(selectedDatasetId, imageUrl),
    [imageUrl, selectedDatasetId],
  );
  const referenceKey = selectedDatasetId || imageUrl.slice(0, 120);
  const editableReferenceLines = referenceLineEdits[referenceKey] ?? referenceSet?.lines ?? {};
  const referenceLinesEdited = Object.values(editableReferenceLines).some((line) => (
    line ? lineChanged(line, referenceSet?.lines[line.kind]) : false
  ));
  const defaultResultKinds = availableKinds.filter((kind) => (
    kind === "waist"
    || kind === "hips"
    || (prediction.profile.gender === "male" && kind === "chest")
  ));
  const optionalResultKinds = availableKinds.filter((kind) => !defaultResultKinds.includes(kind));
  const visibleResultKinds = showOptionalResults
    ? [...defaultResultKinds, ...optionalResultKinds]
    : defaultResultKinds;

  const selectCoreLine = (kind: WearV6RowKind) => {
    setActiveKind(kind);
    setActiveAuxiliaryKind(null);
  };

  const selectAuxiliaryLine = (kind: WearAuxiliaryLineKind) => {
    setActiveAuxiliaryKind(kind);
    setAuxiliaryLineVisibility((current) => ({ ...current, [kind]: true }));
  };

  const openFullScreen = () => {
    setZoom(1.5);
    setExpanded(true);
  };

  const closeFullScreen = () => {
    setZoom(0.5);
    setExpanded(false);
  };

  const switchWidthMethod = async (method: WearV6WidthMethod) => {
    if (method === widthMethod || widthSwitching) return;
    setWidthSwitching(true);
    setWidthSwitchError(null);
    try {
      await onWidthMethodChange(method, editableLines);
    } catch (error) {
      setWidthSwitchError(error instanceof Error ? error.message : "Width method switch failed.");
    } finally {
      setWidthSwitching(false);
    }
  };

  useEffect(() => {
    if (!expanded) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setZoom(0.5);
      setExpanded(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [expanded]);

  useEffect(() => {
    if (editRevision === 0) return;
    const signature = lineSignature(editableLines);
    if (signature === lastSubmittedRef.current) return;
    const timer = window.setTimeout(() => {
      lastSubmittedRef.current = signature;
      setRecalculating(true);
      setRecalculateError(null);
      void onRecalculate(editableLines)
        .catch((error) => setRecalculateError(error instanceof Error ? error.message : "Recalculation failed."))
        .finally(() => setRecalculating(false));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [editRevision, editableLines, onRecalculate]);

  const pointerPosition = (event: ReactPointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / Math.max(1, bounds.width)),
      y: clamp((event.clientY - bounds.top) / Math.max(1, bounds.height)),
    };
  };

  const beginDrag = (
    event: ReactPointerEvent<SVGElement>,
    part: DragPart,
    kind: WearV6RowKind,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const line = editableLines[kind] ?? sourceLines[kind];
    const svg = event.currentTarget.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();
    if (!line || !svg || !bounds) return;
    svg.setPointerCapture(event.pointerId);
    selectCoreLine(kind);
    setDrag({
      kind,
      part,
      initial: line,
      start: {
        x: clamp((event.clientX - bounds.left) / Math.max(1, bounds.width)),
        y: clamp((event.clientY - bounds.top) / Math.max(1, bounds.height)),
      },
    });
  };

  const beginAuxiliaryDrag = (
    event: ReactPointerEvent<SVGElement>,
    part: WearAuxiliaryDragState["part"],
    kind: WearAuxiliaryLineKind,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const line = auxiliaryLines[kind] ?? auxiliarySourceLines[kind];
    const svg = event.currentTarget.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();
    if (!line || !svg || !bounds) return;
    svg.setPointerCapture(event.pointerId);
    selectAuxiliaryLine(kind);
    setAuxiliaryDrag({
      kind,
      part,
      initial: line,
      start: {
        x: clamp((event.clientX - bounds.left) / Math.max(1, bounds.width)),
        y: clamp((event.clientY - bounds.top) / Math.max(1, bounds.height)),
      },
    });
  };

  const beginReferenceDrag = (
    event: ReactPointerEvent<SVGElement>,
    part: DragPart,
    kind: WearReferenceLineKind,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const line = editableReferenceLines[kind];
    const svg = event.currentTarget.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();
    if (!line || !svg || !bounds) return;
    svg.setPointerCapture(event.pointerId);
    setReferenceDrag({
      kind,
      part,
      initial: line,
      start: {
        x: clamp((event.clientX - bounds.left) / Math.max(1, bounds.width)),
        y: clamp((event.clientY - bounds.top) / Math.max(1, bounds.height)),
      },
    });
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = pointerPosition(event);
    if (referenceDrag) {
      setReferenceLineEdits((current) => {
        const currentLines = current[referenceKey] ?? referenceSet?.lines ?? {};
        const existing = currentLines[referenceDrag.kind] ?? referenceSet?.lines[referenceDrag.kind];
        if (!existing) return current;
        let next: NormalizedReferenceLine;
        if (referenceDrag.part === "left") {
          next = { ...existing, leftX: clamp(Math.min(point.x, existing.rightX - 0.01)) };
        } else if (referenceDrag.part === "right") {
          next = { ...existing, rightX: clamp(Math.max(point.x, existing.leftX + 0.01)) };
        } else {
          const requestedDx = point.x - referenceDrag.start.x;
          const dx = clamp(requestedDx, -referenceDrag.initial.leftX, 1 - referenceDrag.initial.rightX);
          next = {
            ...existing,
            leftX: referenceDrag.initial.leftX + dx,
            rightX: referenceDrag.initial.rightX + dx,
            y: clamp(referenceDrag.initial.y + point.y - referenceDrag.start.y),
          };
        }
        return { ...current, [referenceKey]: { ...currentLines, [referenceDrag.kind]: next } };
      });
      return;
    }
    if (auxiliaryDrag) {
      setAuxiliaryLines((current) => {
        const existing = current[auxiliaryDrag.kind] ?? auxiliarySourceLines[auxiliaryDrag.kind];
        if (!existing) return current;
        let next: WearAuxiliaryLine;
        if (auxiliaryDrag.part === "start") {
          next = { ...existing, start: point };
        } else if (auxiliaryDrag.part === "end") {
          next = { ...existing, end: point };
        } else {
          const requestedDx = point.x - auxiliaryDrag.start.x;
          const requestedDy = point.y - auxiliaryDrag.start.y;
          const minimumX = Math.min(auxiliaryDrag.initial.start.x, auxiliaryDrag.initial.end.x);
          const maximumX = Math.max(auxiliaryDrag.initial.start.x, auxiliaryDrag.initial.end.x);
          const minimumY = Math.min(auxiliaryDrag.initial.start.y, auxiliaryDrag.initial.end.y);
          const maximumY = Math.max(auxiliaryDrag.initial.start.y, auxiliaryDrag.initial.end.y);
          const dx = clamp(requestedDx, -minimumX, 1 - maximumX);
          const dy = clamp(requestedDy, -minimumY, 1 - maximumY);
          next = {
            start: { x: auxiliaryDrag.initial.start.x + dx, y: auxiliaryDrag.initial.start.y + dy },
            end: { x: auxiliaryDrag.initial.end.x + dx, y: auxiliaryDrag.initial.end.y + dy },
          };
        }
        return { ...current, [auxiliaryDrag.kind]: next };
      });
      return;
    }
    if (!drag) return;
    setLinesByMode((current) => {
      const currentLines = current[edgeMode];
      const existing = currentLines[drag.kind] ?? sourceLines[drag.kind];
      if (!existing) return current;
      let next: WearV6Line;
      if (drag.part === "left") {
        next = { ...existing, leftX: clamp(Math.min(point.x, existing.rightX - 0.01)) };
      } else if (drag.part === "right") {
        next = { ...existing, rightX: clamp(Math.max(point.x, existing.leftX + 0.01)) };
      } else {
        const requestedDx = point.x - drag.start.x;
        const dx = clamp(requestedDx, -drag.initial.leftX, 1 - drag.initial.rightX);
        next = {
          leftX: drag.initial.leftX + dx,
          rightX: drag.initial.rightX + dx,
          y: clamp(drag.initial.y + point.y - drag.start.y),
        };
      }
      return { ...current, [edgeMode]: { ...currentLines, [drag.kind]: next } };
    });
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag && !auxiliaryDrag && !referenceDrag) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const completedWearDrag = drag != null;
    setDrag(null);
    setAuxiliaryDrag(null);
    setReferenceDrag(null);
    if (completedWearDrag) setEditRevision((value) => value + 1);
  };

  const resetLine = (kind: WearV6RowKind) => {
    const source = sourceLines[kind];
    if (!source) return;
    setLinesByMode((current) => ({
      ...current,
      [edgeMode]: { ...current[edgeMode], [kind]: source },
    }));
    setEditRevision((value) => value + 1);
  };

  const resetAuxiliaryLine = (kind: WearAuxiliaryLineKind) => {
    const source = auxiliarySourceLines[kind];
    if (!source) return;
    setAuxiliaryLines((current) => ({ ...current, [kind]: source }));
  };

  const resetAll = () => {
    setLinesByMode((current) => ({ ...current, [edgeMode]: sourceLines }));
    setAuxiliaryLines(Object.fromEntries(
      Object.entries(auxiliarySourceLines).filter((entry): entry is [WearAuxiliaryLineKind, WearAuxiliaryLine] => Boolean(entry[1])),
    ));
    setEditRevision((value) => value + 1);
  };

  const resetReferenceLines = () => {
    setReferenceLineEdits((current) => {
      const next = { ...current };
      delete next[referenceKey];
      return next;
    });
  };

  const nudgeReferenceLine = (kind: WearReferenceLineKind, deltaX: number, deltaY: number) => {
    setReferenceLineEdits((current) => {
      const currentLines = current[referenceKey] ?? referenceSet?.lines ?? {};
      const existing = currentLines[kind] ?? referenceSet?.lines[kind];
      if (!existing) return current;
      const width = existing.rightX - existing.leftX;
      const nextLeft = clamp(existing.leftX + deltaX, 0, 1 - width);
      return {
        ...current,
        [referenceKey]: {
          ...currentLines,
          [kind]: {
            ...existing,
            leftX: nextLeft,
            rightX: nextLeft + width,
            y: clamp(existing.y + deltaY),
          },
        },
      };
    });
  };

  const runMetaComparison = async () => {
    try {
      const projected = await onRunMeta(wearLines);
      setLinesByMode((current) => ({
        ...current,
        "meta-3d": { ...wearLines, ...projected },
      }));
      setEdgeMode("meta-3d");
    } catch {
      // The parent exposes the exact provider error in the Meta card.
    }
  };

  const renderToolbar = (allowExpand: boolean) => (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-white p-2 text-slate-900">
      <button aria-label="Zoom out" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45" disabled={zoom <= 0.5} onClick={() => setZoom((value) => clamp(value - 0.1, 0.5, 2.5))} type="button"><ZoomOut className="size-4" /></button>
      <input aria-label="Photo zoom" className="h-2 min-w-36 flex-1 accent-red-600" max="2.5" min="0.5" onChange={(event) => setZoom(Number(event.target.value))} step="0.05" type="range" value={zoom} />
      <button aria-label="Zoom in" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45" disabled={zoom >= 2.5} onClick={() => setZoom((value) => clamp(value + 0.1, 0.5, 2.5))} type="button"><ZoomIn className="size-4" /></button>
      <button aria-label="Reset zoom" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45" disabled={zoom === 0.5} onClick={() => setZoom(0.5)} type="button"><RotateCcw className="size-4" /></button>
      <span className="min-w-12 text-right font-mono text-[11px] font-semibold text-red-900">{Math.round(zoom * 100)}%</span>
      <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
        {availableKinds.map((kind) => (
          <button
            className={cn("rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-50", activeAuxiliaryKind == null && activeKind === kind ? "bg-red-50 ring-1 ring-red-300" : "bg-white", !lineVisibility[kind] && "opacity-45")}
            key={kind}
            onClick={() => {
              selectCoreLine(kind);
              setLineVisibility((current) => ({ ...current, [kind]: true }));
            }}
            type="button"
          >
            {rowLabel(kind, prediction.profile.gender)}
          </button>
        ))}
        {allowExpand ? (
          <button className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-[11px] font-semibold text-red-800 hover:bg-red-50" onClick={openFullScreen} type="button">
            <Maximize2 className="size-3.5" /> Full screen
          </button>
        ) : null}
      </div>
    </div>
  );

  const renderViewport = (mode: "normal" | "fullscreen") => (
    <div className={cn("overflow-auto rounded-lg border border-red-200 bg-black", mode === "fullscreen" ? "min-h-0 flex-1" : "max-h-[62vh]")}>
      <div className="relative min-w-0 bg-black" style={{ width: `${zoom * 100}%` }}>
        {/* Test Lab supports data/blob URLs, so a normal image element is required. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Person with editable WEAR v6 body lines" className="block h-auto w-full select-none" draggable={false} src={imageUrl} />
        <svg
          aria-label="Editable WEAR v6 body lines"
          className="absolute inset-0 size-full touch-none"
          onPointerCancel={endDrag}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          preserveAspectRatio="none"
          viewBox="0 0 1000 1000"
        >
          {showSegments ? prediction.segments.map((segment) => (
            <polyline fill="none" key={segment.kind} points={segment.photo.map((point) => `${point.x * 1000},${point.y * 1000}`).join(" ")} pointerEvents="none" stroke="#22c55e" strokeLinecap="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          )) : null}
          {showLandmarks ? prediction.landmarks.map((landmark) => (
            <circle cx={landmark.photo.x * 1000} cy={landmark.photo.y * 1000} fill="#f8fafc" key={landmark.name} pointerEvents="none" r="2.5" stroke="#0891b2" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          )) : null}
          {availableKinds.filter((kind) => lineVisibility[kind]).map((kind) => {
            const line = editableLines[kind] ?? sourceLines[kind];
            if (!line) return null;
            const selected = activeAuxiliaryKind == null && activeKind === kind;
            const edited = lineChanged(line, sourceLines[kind]);
            const color = edgeMode === "wear-rgb"
              ? (selected ? "#2563eb" : "#60a5fa")
              : edgeMode === "mask-assisted"
                ? (selected ? "#0891b2" : "#22d3ee")
                : (selected ? "#c026d3" : "#e879f9");
            return (
              <g key={`${edgeMode}-${kind}`}>
                {selected && edited && sourceLines[kind] ? (
                  <line pointerEvents="none" stroke="#f8fafc" strokeDasharray="6 5" strokeWidth="2" vectorEffect="non-scaling-stroke" x1={sourceLines[kind]!.leftX * 1000} x2={sourceLines[kind]!.rightX * 1000} y1={sourceLines[kind]!.y * 1000} y2={sourceLines[kind]!.y * 1000} />
                ) : null}
                <line cursor="move" onPointerDown={(event) => beginDrag(event, "row", kind)} stroke="rgba(15,23,42,0.9)" strokeLinecap="round" strokeWidth={selected ? 7 : 5} vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                <line cursor="move" onPointerDown={(event) => beginDrag(event, "row", kind)} stroke={color} strokeLinecap="round" strokeWidth={selected ? 3.5 : 2.5} vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
                {selected ? (
                  <>
                    <circle aria-label={`${rowLabel(kind, prediction.profile.gender)} left edge`} cursor="ew-resize" cx={line.leftX * 1000} cy={line.y * 1000} fill="transparent" onPointerDown={(event) => beginDrag(event, "left", kind)} pointerEvents="all" r="12" />
                    <circle aria-label={`${rowLabel(kind, prediction.profile.gender)} right edge`} cursor="ew-resize" cx={line.rightX * 1000} cy={line.y * 1000} fill="transparent" onPointerDown={(event) => beginDrag(event, "right", kind)} pointerEvents="all" r="12" />
                  </>
                ) : null}
              </g>
            );
          })}
          {availableAuxiliaryKinds.filter((kind) => auxiliaryLineVisibility[kind]).map((kind) => {
            const line = auxiliaryLines[kind] ?? auxiliarySourceLines[kind];
            if (!line) return null;
            const definition = OTHER_WEAR_CIRCUMFERENCE_LINES.find((item) => item.kind === kind)!;
            const selected = activeAuxiliaryKind === kind;
            const edited = auxiliaryLineChanged(line, auxiliarySourceLines[kind] ?? undefined);
            return (
              <g data-auxiliary-kind={kind} key={`wear-auxiliary-${kind}`}>
                {selected && edited && auxiliarySourceLines[kind] ? (
                  <line
                    pointerEvents="none"
                    stroke="#f8fafc"
                    strokeDasharray="6 5"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    x1={auxiliarySourceLines[kind]!.start.x * 1000}
                    x2={auxiliarySourceLines[kind]!.end.x * 1000}
                    y1={auxiliarySourceLines[kind]!.start.y * 1000}
                    y2={auxiliarySourceLines[kind]!.end.y * 1000}
                  />
                ) : null}
                <line
                  aria-label={`${definition.label} drag area`}
                  cursor="move"
                  onPointerDown={(event) => beginAuxiliaryDrag(event, "row", kind)}
                  stroke="transparent"
                  strokeWidth="18"
                  vectorEffect="non-scaling-stroke"
                  x1={line.start.x * 1000}
                  x2={line.end.x * 1000}
                  y1={line.start.y * 1000}
                  y2={line.end.y * 1000}
                />
                <line
                  cursor="move"
                  data-testid={`wear-aux-line-${kind}`}
                  onPointerDown={(event) => beginAuxiliaryDrag(event, "row", kind)}
                  stroke="rgba(15,23,42,0.9)"
                  strokeLinecap="round"
                  strokeWidth={selected ? 7 : 5}
                  vectorEffect="non-scaling-stroke"
                  x1={line.start.x * 1000}
                  x2={line.end.x * 1000}
                  y1={line.start.y * 1000}
                  y2={line.end.y * 1000}
                />
                <line
                  cursor="move"
                  onPointerDown={(event) => beginAuxiliaryDrag(event, "row", kind)}
                  stroke={selected ? "#7c3aed" : "#a78bfa"}
                  strokeLinecap="round"
                  strokeWidth={selected ? 3.5 : 2.5}
                  vectorEffect="non-scaling-stroke"
                  x1={line.start.x * 1000}
                  x2={line.end.x * 1000}
                  y1={line.start.y * 1000}
                  y2={line.end.y * 1000}
                />
                {selected ? (
                  <>
                    <circle aria-label={`${definition.label} start point`} cursor="crosshair" cx={line.start.x * 1000} cy={line.start.y * 1000} fill="transparent" onPointerDown={(event) => beginAuxiliaryDrag(event, "start", kind)} pointerEvents="all" r="12" />
                    <circle aria-label={`${definition.label} end point`} cursor="crosshair" cx={line.end.x * 1000} cy={line.end.y * 1000} fill="transparent" onPointerDown={(event) => beginAuxiliaryDrag(event, "end", kind)} pointerEvents="all" r="12" />
                  </>
                ) : null}
              </g>
            );
          })}
          {showReferences ? Object.values(editableReferenceLines).map((line) => line ? (
            <g data-reference-kind={line.kind} key={`reference-${line.kind}`}>
              <line pointerEvents="none" stroke="rgba(15,23,42,0.9)" strokeWidth="7" vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
              <line aria-label={`${line.label} drag area`} cursor="move" data-testid={`saved-red-line-${line.kind}`} onPointerDown={(event) => beginReferenceDrag(event, "row", line.kind)} stroke="#ef4444" strokeWidth="3" vectorEffect="non-scaling-stroke" x1={line.leftX * 1000} x2={line.rightX * 1000} y1={line.y * 1000} y2={line.y * 1000} />
              <rect
                aria-label={`Move ${line.label}`}
                cursor="move"
                fill="transparent"
                height="18"
                onKeyDown={(event) => {
                  const amount = event.shiftKey ? 0.01 : 0.0025;
                  if (event.key === "ArrowLeft") nudgeReferenceLine(line.kind, -amount, 0);
                  else if (event.key === "ArrowRight") nudgeReferenceLine(line.kind, amount, 0);
                  else if (event.key === "ArrowUp") nudgeReferenceLine(line.kind, 0, -amount);
                  else if (event.key === "ArrowDown") nudgeReferenceLine(line.kind, 0, amount);
                  else return;
                  event.preventDefault();
                }}
                onPointerDown={(event) => beginReferenceDrag(event, "row", line.kind)}
                pointerEvents="all"
                role="button"
                tabIndex={0}
                width={(line.rightX - line.leftX) * 1000}
                x={line.leftX * 1000}
                y={line.y * 1000 - 9}
              />
              <circle aria-label={`${line.label} left endpoint`} cursor="ew-resize" cx={line.leftX * 1000} cy={line.y * 1000} fill="transparent" onPointerDown={(event) => beginReferenceDrag(event, "left", line.kind)} pointerEvents="all" r="12" />
              <circle aria-label={`${line.label} right endpoint`} cursor="ew-resize" cx={line.rightX * 1000} cy={line.y * 1000} fill="transparent" onPointerDown={(event) => beginReferenceDrag(event, "right", line.kind)} pointerEvents="all" r="12" />
            </g>
          ) : null) : null}
        </svg>
      </div>
    </div>
  );

  const resultCards = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">Live WEAR results</p>
          <p className="mt-1 text-xs text-slate-500">Waist and hips stay first. Optional upper-body cards start hidden.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {optionalResultKinds.length ? (
            <button className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50" onClick={() => setShowOptionalResults((value) => !value)} type="button">
              {showOptionalResults ? "Hide upper body" : `Show upper body (${optionalResultKinds.length})`}
            </button>
          ) : null}
          <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold" onChange={(event) => setResultUnit(event.target.value as ResultUnit)} value={resultUnit}>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
        </div>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3" data-testid="wear-width-method-switch">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-blue-950">Width sent into WEAR</p>
            <p className="mt-1 text-[10px] leading-4 text-blue-800">Same line endpoints. This changes px → cm width only. It never reads tape numbers and does not move the lines.</p>
          </div>
          {widthSwitching || appleDepthState === "loading" ? <Loader2 className="size-4 shrink-0 animate-spin text-blue-700" /> : null}
        </div>
        <div aria-label="WEAR width method" className="mt-2 grid grid-cols-2 gap-2" role="group">
          <button
            aria-pressed={widthMethod === "apple-vision"}
            className={cn("rounded-lg border px-3 py-2 text-left text-[10px] font-bold", widthMethod === "apple-vision" ? "border-blue-600 bg-blue-700 text-white" : "border-blue-200 bg-white text-blue-900 hover:bg-blue-100")}
            data-testid="wear-width-method-apple"
            disabled={widthSwitching}
            onClick={() => void switchWidthMethod("apple-vision")}
            type="button"
          >
            <span className="block text-xs font-black">Apple Vision</span>
            Skeleton/body plane
          </button>
          <button
            aria-pressed={widthMethod === "apple-depth"}
            className={cn("rounded-lg border px-3 py-2 text-left text-[10px] font-bold", widthMethod === "apple-depth" ? "border-violet-600 bg-violet-700 text-white" : "border-violet-200 bg-white text-violet-900 hover:bg-violet-50")}
            data-testid="wear-width-method-apple-depth"
            disabled={widthSwitching}
            onClick={() => void switchWidthMethod("apple-depth")}
            type="button"
          >
            <span className="block text-xs font-black">Apple + Depth Pro</span>
            Body-surface distance
          </button>
        </div>
        <p className={cn("mt-2 text-[10px] leading-4", appleDepthState === "error" || widthSwitchError ? "text-red-700" : "text-blue-800")}>
          {widthSwitchError ?? (widthMethod === "apple-depth" || appleDepthState !== "idle" ? appleDepthDetail : "Select Apple + Depth Pro to calculate the comparison once.")}
        </p>
      </div>
      <div className={cn("rounded-xl border p-3 text-xs", appleState === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : appleState === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800")}>
        <div className="flex items-center gap-2 font-bold">
          {appleState === "loading" || recalculating ? <Loader2 className="size-3.5 animate-spin" /> : appleState === "ready" ? <Check className="size-3.5" /> : <ScanLine className="size-3.5" />}
          {recalculating ? "Recalculating moved lines" : appleDetail}
        </div>
        {recalculateError ? <p className="mt-1 text-red-700">{recalculateError}</p> : null}
      </div>
      {visibleResultKinds.map((kind) => {
        const measurement = prediction.measurements.find((item) => item.kind === kind);
        const predictedRow = prediction.rows.find((item) => item.kind === kind);
        const crossSection = prediction.crossSections?.find((item) => item.kind === kind);
        const actual = actuals[kind] ?? null;
        const appleVisionWidth = appleVisionWidths[kind] ?? null;
        const appleDepthWidth = appleDepthWidths[kind] ?? null;
        const active = activeAuxiliaryKind == null && kind === activeKind;
        const generatedDepthRatio = measurement?.rawMeshDepthCm != null && measurement.appleCorrectedWidthCm > 0
          ? measurement.rawMeshDepthCm / measurement.appleCorrectedWidthCm
          : null;
        const minimumDepthRatio = generatedDepthRatio == null
          ? MIN_DEPTH_RATIO
          : Math.min(MIN_DEPTH_RATIO, generatedDepthRatio);
        const maximumDepthRatio = generatedDepthRatio == null
          ? MAX_DEPTH_RATIO
          : Math.max(MAX_DEPTH_RATIO, generatedDepthRatio);
        const depthRatioOverride = depthRatioOverrides[kind];
        const selectedDepthRatio = depthRatioOverride == null
          ? generatedDepthRatio
          : clamp(depthRatioOverride, minimumDepthRatio, maximumDepthRatio);
        const selectedDepthCm = measurement && selectedDepthRatio != null
          ? measurement.appleCorrectedWidthCm * selectedDepthRatio
          : null;
        const depthControlMode = depthControlModes[kind];
        const sliderMinimum = depthControlMode === "ratio"
          ? minimumDepthRatio
          : (measurement?.appleCorrectedWidthCm ?? 0) * minimumDepthRatio;
        const sliderMaximum = depthControlMode === "ratio"
          ? maximumDepthRatio
          : (measurement?.appleCorrectedWidthCm ?? 0) * maximumDepthRatio;
        const sliderValue = depthControlMode === "ratio"
          ? selectedDepthRatio
          : selectedDepthCm;
        const shapeCircumferenceCm = crossSection && measurement && selectedDepthCm != null
          ? crossSectionPerimeterCm(crossSection.points, measurement.appleCorrectedWidthCm, selectedDepthCm)
          : null;
        const liveCircumferenceCm = shapeCircumferenceCm ?? measurement?.valueCm ?? null;
        const liveDifferenceCm = liveCircumferenceCm != null && actual != null
          ? liveCircumferenceCm - actual
          : null;
        const tapeNeededDepthCm = crossSection && measurement
          ? depthForTargetCircumferenceCm(crossSection.points, measurement.appleCorrectedWidthCm, actual)
          : null;
        const tapeNeededDepthRatio = tapeNeededDepthCm != null && measurement
          ? tapeNeededDepthCm / measurement.appleCorrectedWidthCm
          : null;
        const minimumShapeCircumferenceCm = crossSection && measurement
          ? crossSectionPerimeterCm(crossSection.points, measurement.appleCorrectedWidthCm, measurement.appleCorrectedWidthCm * 0.02)
          : null;
        const tapeNeededLabel = actual == null
          ? "Add tape value"
          : tapeNeededDepthCm != null
            ? `${formatLength(tapeNeededDepthCm, resultUnit)} · ratio ${tapeNeededDepthRatio?.toFixed(3)}`
            : minimumShapeCircumferenceCm != null && actual < minimumShapeCircumferenceCm
              ? "Impossible: selected width is already too large"
              : "Outside safe debug range";
        const previewPoints = crossSection && measurement && selectedDepthCm != null
          ? crossSectionPreviewPoints(crossSection.points, measurement.appleCorrectedWidthCm, selectedDepthCm)
          : "";
        const depthEdited = depthRatioOverride != null;
        const updateDepth = (rawValue: number) => {
          if (!measurement || !Number.isFinite(rawValue) || measurement.appleCorrectedWidthCm <= 0) return;
          const nextRatio = depthControlMode === "ratio"
            ? rawValue
            : rawValue / measurement.appleCorrectedWidthCm;
          setDepthRatioOverrides((current) => ({
            ...current,
            [kind]: clamp(nextRatio, minimumDepthRatio, maximumDepthRatio),
          }));
        };
        return (
          <div
            className={cn("w-full rounded-xl border p-3 text-left transition", active ? "border-blue-400 bg-blue-50/50 ring-1 ring-blue-200" : "border-slate-200 bg-white hover:border-slate-300")}
            data-testid={`wear-result-card-${kind}`}
            key={kind}
          >
            <button
              aria-pressed={active}
              className="w-full text-left"
              onClick={() => {
                selectCoreLine(kind);
                setLineVisibility((current) => ({ ...current, [kind]: true }));
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-900">{rowLabel(kind, prediction.profile.gender)}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{measurement ? `${formatLength(measurement.appleCorrectedWidthCm, resultUnit)} ${measurement.widthSource === "wear-v7-direct" ? "WEAR-predicted breadth" : measurement.widthSource === "apple-depth" ? "Apple + Depth Pro width" : "Apple Vision width"} · ${formatLength(measurement.rawMeshDepthCm, resultUnit)} WEAR-trained depth` : "Waiting for body-row geometry"}</p>
                  {predictedRow ? <p className="mt-1 text-[10px] leading-4 text-slate-400">{predictedRow.targetSource}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-950" data-testid={`wear-live-result-${kind}`}>{formatLength(liveCircumferenceCm, resultUnit)}</p>
                  <p className="mt-0.5 text-[9px] font-semibold text-slate-400">{shapeCircumferenceCm != null ? "live selected WEAR shape" : "direct WEAR answer"}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                {measurement ? <span className={cn("rounded-full border px-2 py-1", measurement.confidence === "high" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : measurement.confidence === "medium" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700")}>{measurement.confidence} camera confidence</span> : null}
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">No formula</span>
                {liveDifferenceCm != null ? <span className={cn("rounded-full border px-2 py-1", Math.abs(liveDifferenceCm) <= 3 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : Math.abs(liveDifferenceCm) <= 5 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700")} data-testid={`wear-live-difference-${kind}`}>vs tape {formatSignedLength(liveDifferenceCm, resultUnit)}</span> : null}
              </div>
            </button>
            {crossSection ? (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-violet-100 bg-violet-50/70 p-2" data-testid={`wear-depth-control-${kind}`}>
                <div className="flex min-w-0 flex-col items-center justify-center">
                  <svg aria-label={`${crossSection.label} WEAR 32-point cross-section`} className="h-20 w-24 shrink-0" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 100">
                    <polyline
                      fill="rgba(124,58,237,0.10)"
                      points={previewPoints}
                      stroke="#7c3aed"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <p className="text-center text-[9px] font-black leading-3 text-violet-900">32-point closed WEAR shape</p>
                </div>
                <p className="border-y border-violet-200 py-2 text-[9px] leading-4 text-violet-700">
                  {usesRgbBodyShape
                    ? "Predicted independently from mask-free RGB body shape + profile + this row's width; supervised by the real 3D mesh slice."
                    : "Predicted independently from profile + this row's width; supervised by the real 3D mesh slice."}
                </p>
                {measurement ? (
                  <div className="grid gap-2 sm:grid-cols-2" data-testid={`wear-width-depth-comparison-${kind}`}>
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-2">
                      <p className="text-[8px] font-black uppercase tracking-wide text-blue-700">Two width checks</p>
                      <p className="mt-1 text-[10px] font-bold text-blue-950">Apple Vision: {formatLength(appleVisionWidth, resultUnit)}</p>
                      <p className="mt-1 text-[10px] font-bold text-violet-900">Apple + Depth Pro: {appleDepthWidth == null ? "Not run / rejected" : formatLength(appleDepthWidth, resultUnit)}</p>
                    </div>
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                      <p className="text-[8px] font-black uppercase tracking-wide text-amber-700">Depth diagnosis</p>
                      <p className="mt-1 text-[10px] font-bold text-amber-950">WEAR trained: {formatLength(measurement.rawMeshDepthCm, resultUnit)}{generatedDepthRatio == null ? "" : ` · ratio ${generatedDepthRatio.toFixed(3)}`}</p>
                      <p className="mt-1 text-[9px] text-amber-800">Raw model baseline: {formatLength(measurement.valueCm, resultUnit)}</p>
                      <p className="mt-1 text-[10px] font-bold text-amber-950">Needed for tape: {tapeNeededLabel}</p>
                      <p className="mt-1 text-[8px] leading-3 text-amber-700">Debug only. Tape is never sent into WEAR.</p>
                    </div>
                  </div>
                ) : null}
                {measurement && generatedDepthRatio != null && selectedDepthRatio != null && selectedDepthCm != null ? (
                  <div className="rounded-md border border-violet-200 bg-white/80 p-2" data-depth-edited={depthEdited ? "true" : "false"}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-semibold text-violet-700">
                        {depthControlMode === "ratio" ? "Selected WEAR depth ratio" : "Selected WEAR depth"}
                      </p>
                      <p className="font-mono text-sm font-black text-violet-950" data-testid={`wear-depth-selected-${kind}`}>
                        {depthControlMode === "ratio" ? selectedDepthRatio.toFixed(3) : `${selectedDepthCm.toFixed(1)} cm`}
                      </p>
                    </div>
                    <div aria-label={`${rowLabel(kind, prediction.profile.gender)} depth control unit`} className="mt-2 grid grid-cols-2 rounded-md border border-violet-200 bg-violet-50 p-0.5" role="group">
                      <button
                        aria-pressed={depthControlMode === "ratio"}
                        className={cn("rounded px-2 py-1 text-[9px] font-bold", depthControlMode === "ratio" ? "bg-violet-600 text-white shadow-sm" : "text-violet-700 hover:bg-violet-100")}
                        data-testid={`wear-depth-mode-ratio-${kind}`}
                        onClick={() => setDepthControlModes((current) => ({ ...current, [kind]: "ratio" }))}
                        type="button"
                      >
                        Ratio
                      </button>
                      <button
                        aria-pressed={depthControlMode === "cm"}
                        className={cn("rounded px-2 py-1 text-[9px] font-bold", depthControlMode === "cm" ? "bg-violet-600 text-white shadow-sm" : "text-violet-700 hover:bg-violet-100")}
                        data-testid={`wear-depth-mode-cm-${kind}`}
                        onClick={() => setDepthControlModes((current) => ({ ...current, [kind]: "cm" }))}
                        type="button"
                      >
                        Depth cm
                      </button>
                    </div>
                    <input
                      aria-label={`${rowLabel(kind, prediction.profile.gender)} ${depthControlMode === "ratio" ? "depth ratio" : "depth centimetres"}`}
                      className="mt-2 h-2 w-full accent-violet-600"
                      data-testid={`wear-depth-slider-${kind}`}
                      max={sliderMaximum}
                      min={sliderMinimum}
                      onChange={(event) => updateDepth(Number(event.currentTarget.value))}
                      step={depthControlMode === "ratio" ? 0.001 : 0.1}
                      type="range"
                      value={sliderValue ?? sliderMinimum}
                    />
                    <div className="mt-1 flex items-center justify-between text-[8px] text-slate-500">
                      <span>Min {depthControlMode === "ratio" ? sliderMinimum.toFixed(3) : `${sliderMinimum.toFixed(1)} cm`}</span>
                      <span>Max {depthControlMode === "ratio" ? sliderMaximum.toFixed(3) : `${sliderMaximum.toFixed(1)} cm`}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-violet-200 pt-2 text-[9px]">
                      <span className="text-violet-800" data-testid={`wear-generated-depth-ratio-${kind}`}>
                        WEAR generated {generatedDepthRatio.toFixed(3)} · {measurement.rawMeshDepthCm?.toFixed(1)} cm
                      </span>
                      <button
                        className="rounded border border-violet-300 bg-white px-2 py-1 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                        data-testid={`wear-depth-reset-${kind}`}
                        disabled={!depthEdited}
                        onClick={() => setDepthRatioOverrides((current) => ({ ...current, [kind]: undefined }))}
                        type="button"
                      >
                        Use WEAR value
                      </button>
                    </div>
                    <div className="mt-2 rounded border border-violet-200 bg-violet-50 px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-semibold text-violet-800">Live 32-point shape check</span>
                        <span className="font-mono text-xs font-black text-violet-950" data-testid={`wear-shape-result-${kind}`}>{formatLength(shapeCircumferenceCm, resultUnit)}</span>
                      </div>
                      {liveDifferenceCm != null ? <p className="mt-0.5 text-right text-[8px] text-violet-700">vs tape {formatSignedLength(liveDifferenceCm, resultUnit)}</p> : null}
                    </div>
                    <p className="mt-1.5 text-[8px] leading-3 text-violet-700">
                      Slider scales the learned closed shape and walks its 32 edges. No ellipse. The main result and Difference above update live.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  const controls = (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Edge source</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <button className={cn("rounded-xl border p-3 text-left", edgeMode === "wear-rgb" ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white")} onClick={() => setEdgeMode("wear-rgb")} type="button">
            <p className="text-xs font-black text-slate-900">WEAR RGB + Apple anchors</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Independent {modelLabel} row heads learn each line relative to Apple shoulder/hip anchors. No silhouette mask enters them.</p>
          </button>
          <button className={cn("rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50", edgeMode === "mask-assisted" ? "border-cyan-400 bg-cyan-50" : "border-slate-200 bg-white")} disabled={!maskAvailable} onClick={() => setEdgeMode("mask-assisted")} type="button">
            <p className="text-xs font-black text-slate-900">Mask-assisted</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">{maskAvailable ? "Separate comparison using the visible MediaPipe torso run." : "Comparison mask unavailable; WEAR RGB still works."}</p>
          </button>
          <button
            className={cn("rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60", edgeMode === "meta-3d" ? "border-fuchsia-400 bg-fuchsia-50" : "border-slate-200 bg-white")}
            disabled={metaStatus.state === "loading"}
            onClick={() => metaAvailable ? setEdgeMode("meta-3d") : void runMetaComparison()}
            type="button"
          >
            <p className="flex items-center gap-1.5 text-xs font-black text-slate-900">{metaStatus.state === "loading" ? <Loader2 className="size-3 animate-spin" /> : null} Meta 3D</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">{metaStatus.state === "ready" ? `${Object.keys(metaLines).length} independent projected mesh edges.` : metaStatus.detail}</p>
          </button>
        </div>
        {metaStatus.state === "error" || metaStatus.state === "unavailable" ? <p className="mt-2 text-[10px] leading-4 text-red-700">{metaStatus.detail}</p> : null}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Visible layers</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold", showReferences ? "border-red-300 bg-red-50 text-red-800" : "border-slate-200 text-slate-600")} onClick={() => setShowReferences((value) => !value)} type="button">{showReferences ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} Saved red lines · drag</button>
          {showReferences && referenceSet ? <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40" disabled={!referenceLinesEdited} onClick={resetReferenceLines} type="button"><RotateCcw className="size-3.5" /> Reset red</button> : null}
          <button className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold", showLandmarks ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-200 text-slate-600")} onClick={() => setShowLandmarks((value) => !value)} type="button">{showLandmarks ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} Landmarks</button>
          <button className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold", showSegments ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600")} onClick={() => setShowSegments((value) => !value)} type="button">{showSegments ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} Body guides</button>
        </div>
        {showReferences && referenceSet ? <p className="mt-2 text-[10px] leading-4 text-red-700">Drag the red line to move it in any direction. Grab either invisible endpoint area to change only its width. Manual review only.</p> : null}
      </div>
      <div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Lines</p>
          <span className="text-[10px] font-bold text-slate-500">All 13 WEAR circumferences</span>
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">Blue = five exact trained body rows. Purple = movable guides anchored to WEAR-trained landmarks.</p>
        <div className="mt-2 space-y-1.5">
          {availableKinds.map((kind) => (
            <div className="flex items-center gap-2" key={kind}>
              <button className={cn("flex min-w-0 flex-1 items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-bold", activeAuxiliaryKind == null && activeKind === kind ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-600")} onClick={() => selectCoreLine(kind)} type="button"><span>{rowLabel(kind, prediction.profile.gender)}</span><Move className="size-3.5" /></button>
              <button
                aria-label={prediction.profile.gender === "male" && kind === "chest" ? "Chest line required for men" : `Toggle ${kind}`}
                className="rounded-lg border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={prediction.profile.gender === "male" && kind === "chest"}
                onClick={() => setLineVisibility((current) => ({ ...current, [kind]: !current[kind] }))}
                title={prediction.profile.gender === "male" && kind === "chest" ? "Chest line required for men" : undefined}
                type="button"
              >
                {lineVisibility[kind] ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </button>
              <button aria-label={`Reset ${kind}`} className="rounded-lg border border-slate-200 p-2" onClick={() => resetLine(kind)} type="button"><RotateCcw className="size-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Other WEAR circumference guides</p>
          <div className="mt-2 space-y-1.5" data-testid="wear-source-circumference-lines">
            {OTHER_WEAR_CIRCUMFERENCE_LINES.map((definition) => {
              const source = auxiliarySourceLines[definition.kind];
              const predictedValue = definition.measurementKey == null
                ? null
                : auxiliaryMeasurementValues.get(definition.measurementKey) ?? null;
              const selected = activeAuxiliaryKind === definition.kind;
              return (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2" key={definition.kind}>
                  <div className="flex items-center gap-2">
                    <button
                      className={cn(
                        "flex min-w-0 flex-1 items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45",
                        selected ? "border-violet-400 bg-violet-50 text-violet-950" : "border-slate-200 bg-white text-slate-700",
                      )}
                      disabled={!source}
                      onClick={() => selectAuxiliaryLine(definition.kind)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{definition.label}</span>
                        <span className="mt-0.5 block text-[9px] font-semibold text-slate-500">
                          {predictedValue == null ? (definition.standingModelTarget ? "Position unavailable" : "Seated source") : `${formatLength(predictedValue, resultUnit)} WEAR output`}
                        </span>
                      </span>
                      <Move className="size-3.5 shrink-0" />
                    </button>
                    <button
                      aria-label={`Toggle ${definition.label}`}
                      className="rounded-lg border border-slate-200 bg-white p-2 disabled:cursor-not-allowed disabled:opacity-45"
                      data-testid={`wear-aux-toggle-${definition.kind}`}
                      disabled={!source}
                      onClick={() => setAuxiliaryLineVisibility((current) => ({ ...current, [definition.kind]: !current[definition.kind] }))}
                      type="button"
                    >
                      {auxiliaryLineVisibility[definition.kind] ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                    <button
                      aria-label={`Reset ${definition.label}`}
                      className="rounded-lg border border-slate-200 bg-white p-2 disabled:cursor-not-allowed disabled:opacity-45"
                      data-testid={`wear-aux-reset-${definition.kind}`}
                      disabled={!source || !auxiliaryLineChanged(auxiliaryLines[definition.kind], source)}
                      onClick={() => resetAuxiliaryLine(definition.kind)}
                      type="button"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 flex items-start justify-between gap-2 px-1">
                    <p className="text-[9px] leading-4 text-slate-500">{definition.detail}</p>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black",
                      definition.standingModelTarget ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-800",
                    )}>
                      {definition.standingModelTarget ? "Landmark guide" : "Seated guide"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">Select one, turn its eye on/off, drag the whole line, or drag either invisible endpoint. Moving a purple guide is visual review only; it does not pretend the extra row has a trained width head.</p>
        </div>
        <button className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700" onClick={resetAll} type="button">Reset all {edgeMode === "wear-rgb" ? "WEAR" : edgeMode === "mask-assisted" ? "mask" : "Meta"} lines</button>
      </div>
      <details className="rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-xs font-black text-slate-900">
          All learned WEAR outputs · {prediction.allPredictions.length}
        </summary>
        <p className="mt-2 text-[10px] leading-4 text-slate-500">
          Every eligible standing-WEAR target exported by {modelLabel}. Normalized values include photo coordinates and learned shoulder/hip-relative geometry; cm values are direct learned measurements.
        </p>
        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1 font-mono text-[10px]">
          {prediction.allPredictions.map((item) => (
            <div className="flex items-start justify-between gap-3 rounded-md bg-slate-50 px-2 py-1.5" key={item.key}>
              <span className="min-w-0 break-all text-slate-600">{item.key}</span>
              <span className="shrink-0 font-bold text-slate-950">{item.value.toFixed(item.unit === "cm" ? 2 : 4)} {item.unit === "cm" ? "cm" : "norm"}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );

  return (
    <>
      <section className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4" data-testid="wear-v6-workbench">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-red-950">WEAR 3D {modelLabel} coordinate prediction</h2>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-red-900">Mask-free WEAR predicts every anatomical row relative to Apple shoulder/hip anchors. Drag a row vertically or horizontally; drag near either invisible endpoint to resize its width.</p>
          <p className="mt-1 text-[11px] font-medium text-red-800">{imageSize.width.toLocaleString()} × {imageSize.height.toLocaleString()} px · Apple recalculates the moved width; WEAR returns the learned circumference and raw-mesh depth.</p>
        </div>
        <button className="rounded-lg border border-red-200 bg-white px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50" onClick={onClearPrediction} type="button">Clear WEAR v6 result</button>
      </div>
      {renderToolbar(true)}
      {expanded ? <div className="rounded-lg border border-red-200 bg-white px-3 py-8 text-center text-sm text-red-900">Full screen editor is open.</div> : renderViewport("normal")}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
          {resultCards}
      </div>
      <details className="rounded-lg border border-slate-300 bg-white/80 p-2">
        <summary className="cursor-pointer text-xs font-black text-slate-700">WEAR v6 rows, layers, edge sources, and learned outputs</summary>
        <div className="mt-3">{controls}</div>
      </details>
      </section>

      {expanded ? (
        <div className="fixed inset-0 z-[100] bg-slate-950 text-white" data-testid="wear-v6-fullscreen">
          <div className="grid h-screen min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="flex min-h-0 flex-col gap-3 p-4">
              <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950 pb-3">
                <div>
                  <p className="text-sm font-semibold">WEAR 3D {modelLabel} coordinate prediction</p>
                  <p className="text-xs text-slate-300">Move the line directly. Its endpoint resize areas stay invisible.</p>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/10" onClick={closeFullScreen} type="button"><X className="size-4" /> Close</button>
              </header>
              {renderToolbar(false)}
              {renderViewport("fullscreen")}
            </section>
            <aside className="min-h-0 overflow-x-hidden overflow-y-auto border-l border-slate-200 bg-white p-3 text-slate-900">
              <div className="space-y-6 pt-3">
                {resultCards}
                {controls}
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}
