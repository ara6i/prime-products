export type PhotoEditorTool = "retouch" | "background-remover";

export type PhotoEditorDialog = "retouch" | "cutout";

export type CutoutMode = "erase" | "restore";

export type CutoutTab = "guided" | "manual";

export type CutoutSuggestion = "no-cutout" | "original-cutout";

export type MaskMode = "retouch" | CutoutMode;

export interface MaskPoint {
  x: number;
  y: number;
}

export interface MaskStroke {
  id: string;
  mode: MaskMode;
  size: number;
  sizeRatio: number;
  points: MaskPoint[];
}

export interface PhotoEditorImageDimensions {
  width: number;
  height: number;
}
