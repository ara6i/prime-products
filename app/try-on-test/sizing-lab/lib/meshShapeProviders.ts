import type { GeminiGuideRowKind } from "./geminiGuide";

export type MeshShapeProviderId = "sam-3d-body" | "shapy";

export interface MeshShapeProviderStatus {
  id: MeshShapeProviderId;
  label: string;
  available: boolean;
  codeReady: boolean;
  runtimeReady: boolean;
  checkpointReady: boolean;
  licenseReady: boolean;
  requiresCuda: boolean;
  runtimeDevice?: "cuda" | "mps" | "cpu";
  reason: string;
  setupUrl: string;
  licenseUrl: string;
}

export interface MeshShapeStatusResponse {
  ok: boolean;
  localOnly: true;
  providers: MeshShapeProviderStatus[];
}

export interface MeshShapePredictionRow {
  kind: GeminiGuideRowKind;
  superellipseExponent: number;
  meshPerimeterCm: number;
  meshBreadthCm: number;
  meshDepthCm: number;
  slicePointCount: number;
  sliceHeightFromFloorCm: number;
  sliceLoopM: Array<[number, number, number]>;
  shapeEvidence?: {
    source: "canonical-neutral-nearby-slices" | "posed-nearby-slices-fallback";
    offsetsCm: number[];
    exponents: number[];
    acceptedExponents: number[];
    exponentSpread: number;
    medianFitError: number;
    stability: number;
  };
  depthProfileEvidence?: {
    source: "depth-pro-front-surface";
    xNorm: number[];
    depthM: number[];
    sampleCoverage: number;
    heightScaleFactor: number;
    rawPredictedHeightM: number;
    focalPx: number;
  };
}

export interface MeshShapePreview {
  verticesM: number[];
  triangleIndices: number[];
  vertexCount: number;
  triangleCount: number;
}

export interface MeshShapePredictionResponse {
  ok: boolean;
  provider: MeshShapeProviderId;
  providerLabel: string;
  sourceImageKey: string;
  geometryKey: string;
  elapsedMs: number;
  rows: MeshShapePredictionRow[];
  meshPreview?: MeshShapePreview;
  personBoxPx?: [number, number, number, number];
  maskConditioned?: boolean;
  depthProfileConditioned?: boolean;
  cameraIntrinsicsSource?: "apple-vision" | "meta-default";
  sliceAlignmentSource?: "mask-projected-red-row" | "legacy-row-height";
  warning?: string;
  error?: string;
}

export function meshShapeProviderLabel(provider: MeshShapeProviderId): string {
  return provider === "sam-3d-body" ? "Meta SAM 3D Body" : "SHAPY";
}
