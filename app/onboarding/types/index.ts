export type OnboardingStep = "feature-preview" | "about-you" | "your-preferences" | "all-set";

export type Gender = "female" | "male";

export type BodyType = "slim" | "athletic" | "average" | "curvy";

export type MeasurementSystem = "imperial" | "metric";

export type SizingMode = "photo" | "manual";

export type BraSizeRegion = "US" | "UK" | "EU" | "FR" | "IT" | "JP" | "KR" | "AU";

export interface BodyLandmarkPoint {
  x: number;
  y: number;
  visibility?: number;
}

export interface BodyLandmarks {
  nose: BodyLandmarkPoint;
  leftShoulder: BodyLandmarkPoint;
  rightShoulder: BodyLandmarkPoint;
  leftElbow: BodyLandmarkPoint;
  rightElbow: BodyLandmarkPoint;
  leftWrist: BodyLandmarkPoint;
  rightWrist: BodyLandmarkPoint;
  leftHip: BodyLandmarkPoint;
  rightHip: BodyLandmarkPoint;
  leftKnee: BodyLandmarkPoint;
  rightKnee: BodyLandmarkPoint;
  leftAnkle: BodyLandmarkPoint;
  rightAnkle: BodyLandmarkPoint;
  imageWidth: number;
  imageHeight: number;
}

export interface SizingEstimateResult {
  estimates: Record<string, number>;
  unit: "cm" | "in";
  method: "vision" | "manual";
  confidence?: string;
  photoFallback?: boolean;
}

export type StylePreference =
  | "casual"
  | "minimal"
  | "classic"
  | "trendy"
  | "formal"
  | "sporty";

export interface BodyTypeOption {
  id: BodyType;
  label: string;
  description: string;
}

export interface StyleOption {
  id: StylePreference;
  label: string;
  description: string;
}

export interface ColorOption {
  id: string;
  label: string;
  hex: string;
}

export interface ColorCategory {
  label: string;
  colors: ColorOption[];
}

export interface OnboardingFormData {
  profilePhoto: string | null;
  bodyPhotoBase64: string | null;
  bodyLandmarks: BodyLandmarks | null;
  sizingEstimate: SizingEstimateResult | null;
  sizingMode: SizingMode;
  birthYear: string;
  height: string;
  weight: string;
  measurementSystem: MeasurementSystem;
  braSizeRegion: BraSizeRegion;
  bandSize: string;
  cupSize: string;
  gender: Gender | null;
  bodyType: BodyType | null;
  styles: StylePreference[];
  colors: string[];
  promoCode: string;
}
