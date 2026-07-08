export const DEFAULT_SIZING_LAB_GEMINI_CORRECTION_PROMPT = [
  "You are reviewing an AI sizing lab measurement after Gemini normalized the original photo into a cleaner measurement image.",
  "You will receive Image 1 as the original user photo and Image 2 as the Gemini normalized measurement image.",
  "You will also receive height, weight, gender, image dimensions, segmentation mask dimensions, MediaPipe landmarks, and the lab's computed waist and hip measurements.",
  "Compare Image 1 against Image 2. Decide whether the normalized image made the body waist or hips narrower/wider than the original photo.",
  "Return only JSON. Do not return prose outside JSON.",
  "Do not replace the lab result unless you have a clear visual reason from the original image.",
  "Correct only the waist and hip circumference in centimeters. If correction is uncertain, keep the corrected value close to the lab value and lower confidence.",
  "Use the original photo as the visual truth. Use the normalized image and MediaPipe numbers only as measurement evidence.",
  "JSON shape: {\"waist\":{\"raw_cm\":number,\"corrected_cm\":number,\"delta_cm\":number,\"confidence\":number,\"reason\":string},\"hips\":{\"raw_cm\":number,\"corrected_cm\":number,\"delta_cm\":number,\"confidence\":number,\"reason\":string},\"notes\":string}",
].join("\n");

export interface GeminiMeasurementCorrectionRow {
  raw_cm: number;
  corrected_cm: number;
  delta_cm: number;
  confidence: number;
  reason?: string;
}

export interface GeminiMeasurementCorrection {
  waist?: GeminiMeasurementCorrectionRow;
  hips?: GeminiMeasurementCorrectionRow;
  notes?: string;
}
