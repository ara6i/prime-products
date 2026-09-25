export type BodyMeasurementSystem = "metric" | "imperial";

const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;
const round = (value: number) => Math.round(value * 100) / 100;

function clean(raw: string | number): string {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[′’]/g, "'")
    .replace(/[″“”]/g, '"')
    .replace(/(\d),(\d)/g, "$1.$2");
}

/** Read the whole input, never just the prefix of e.g. 5' 8". */
export function parseBodyHeight(
  raw: string | number,
  system: BodyMeasurementSystem,
): number {
  const text = clean(raw);
  const feet = text.match(
    /^(\d+)\s*(?:'|ft\.?|feet|foot)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in\.?|inches|inch)?)?$/,
  );
  let cm: number;
  if (feet) {
    const inches = Number(feet[2] ?? 0);
    if (inches >= 12)
      throw new Error("Use 0–11 inches after feet, for example 5' 8\".");
    cm = (Number(feet[1]) * 12 + inches) * CM_PER_INCH;
  } else {
    const match = text.match(
      /^(\d+(?:\.\d+)?)\s*(cm|centimeters?|centimetres?|"|in\.?|inches|inch)?$/,
    );
    if (!match)
      throw new Error(
        "Enter your height, for example 173 cm, 68 in, or 5' 8\".",
      );
    const unit = match[2];
    const isCm = unit ? /^(cm|centimet)/.test(unit) : system === "metric";
    cm = Number(match[1]) * (isCm ? 1 : CM_PER_INCH);
  }
  return system === "metric" ? round(cm) : round(cm / CM_PER_INCH);
}

export function parseBodyWeight(
  raw: string | number,
  system: BodyMeasurementSystem,
): number {
  const match = clean(raw).match(
    /^(\d+(?:\.\d+)?)\s*(kg|kilograms?|lbs?\.?|pounds?)?$/,
  );
  if (!match)
    throw new Error("Enter your weight, for example 68 kg or 150 lb.");
  const unit = match[2];
  const isKg = unit ? /^(kg|kilogram)/.test(unit) : system === "metric";
  const kg = Number(match[1]) * (isKg ? 1 : KG_PER_POUND);
  return system === "metric" ? round(kg) : round(kg / KG_PER_POUND);
}

export function normalizeBodyInputs(input: {
  height: string | number;
  weight: string | number;
  measurementSystem: BodyMeasurementSystem;
}) {
  const metric = input.measurementSystem === "metric";
  const height = parseBodyHeight(input.height, input.measurementSystem);
  const weight = parseBodyWeight(input.weight, input.measurementSystem);
  // Avoid rejecting a boundary height after rounding an inch conversion.
  const heightCm =
    Math.round((metric ? height : height * CM_PER_INCH) * 10) / 10;
  // Match the estimator's supported height range. Never guess a different
  // unit or clamp a person's measurements to make estimation appear to pass.
  if (!Number.isFinite(heightCm) || heightCm < 120 || heightCm > 230) {
    throw new Error(
      metric
        ? "Check your height and units. Enter 120–230 cm, for example 173."
        : "Check your height and units. Enter total inches (for example 68) or feet and inches (5' 8\"). For centimeters, choose Metric.",
    );
  }
  if (!Number.isFinite(weight) || weight < 20 || weight > 700) {
    throw new Error(
      metric
        ? "Check your weight. Enter a value between 20 and 700 kg."
        : "Check your weight. Enter a value between 20 and 700 lb.",
    );
  }
  return {
    height,
    weight,
    heightUnit: metric ? ("cm" as const) : ("in" as const),
    weightUnit: metric ? ("kg" as const) : ("lbs" as const),
  };
}

/** Unit toggles must convert entered values, not merely change their labels. */
export function convertBodyInputSystem<
  T extends {
    height: string;
    weight: string;
    measurementSystem: BodyMeasurementSystem;
  },
>(input: T, next: BodyMeasurementSystem): T {
  if (input.measurementSystem === next) return input;
  const convert = (
    raw: string,
    parse: typeof parseBodyHeight,
    factor: number,
  ) => {
    if (!raw.trim()) return "";
    try {
      return String(round(parse(raw, input.measurementSystem) * factor));
    } catch {
      // Preserve incomplete text for correction instead of silently erasing it.
      return raw;
    }
  };
  return {
    ...input,
    measurementSystem: next,
    height: convert(
      input.height,
      parseBodyHeight,
      next === "metric" ? CM_PER_INCH : 1 / CM_PER_INCH,
    ),
    weight: convert(
      input.weight,
      parseBodyWeight,
      next === "metric" ? KG_PER_POUND : 1 / KG_PER_POUND,
    ),
  };
}
