import type { Gender } from "../types";

export interface AiSizingFieldDefinition {
  key: string;
  label: string;
  gender: Gender | "all";
}

/**
 * The same measurement review set used by the SDK profile-creation flow.
 * Keep the backend request and the MyAIFitting result UI sourced from this
 * single list so newly supported fields do not silently disappear.
 */
export const AI_SIZING_FIELDS: AiSizingFieldDefinition[] = [
  { key: "chest", label: "Chest", gender: "male" },
  { key: "bust", label: "Bust", gender: "female" },
  { key: "waist", label: "Waist", gender: "all" },
  { key: "hips", label: "Hips", gender: "all" },
  { key: "shoulderWidth", label: "Shoulders", gender: "all" },
  { key: "sleeveLength", label: "Sleeve", gender: "all" },
  { key: "neckCircumference", label: "Neck", gender: "all" },
  { key: "inseam", label: "Inseam", gender: "all" },
  { key: "thighCircumference", label: "Thigh", gender: "all" },
];

export function getAiSizingFields(gender: Gender) {
  return AI_SIZING_FIELDS.filter(
    (field) => field.gender === "all" || field.gender === gender,
  );
}

export function formatMeasurementLabel(key: string) {
  const knownField = AI_SIZING_FIELDS.find((field) => field.key === key);
  if (knownField) return knownField.label;

  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}
