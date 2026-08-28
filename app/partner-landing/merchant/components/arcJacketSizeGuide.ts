export const ARC_JACKET_SIZES = ["XS", "S", "M", "L", "XL"] as const;

export type ArcJacketSize = (typeof ARC_JACKET_SIZES)[number];
export type ArcJacketSizeUnit = "cm" | "in";

export type ArcJacketSizeRow = {
  size: ArcJacketSize;
  chest: number;
  hem: number;
  shoulder: number;
  sleeve: number;
  length: number;
  bodyBust: readonly [number, number];
  bodyWaist: readonly [number, number];
};

export const ARC_JACKET_SIZE_ROWS: readonly ArcJacketSizeRow[] = [
  {
    size: "XS",
    chest: 94,
    hem: 78,
    shoulder: 39,
    sleeve: 60,
    length: 48,
    bodyBust: [78, 82],
    bodyWaist: [60, 64],
  },
  {
    size: "S",
    chest: 98,
    hem: 82,
    shoulder: 40,
    sleeve: 60.5,
    length: 49,
    bodyBust: [82, 88],
    bodyWaist: [64, 70],
  },
  {
    size: "M",
    chest: 102,
    hem: 86,
    shoulder: 41,
    sleeve: 61,
    length: 50,
    bodyBust: [88, 94],
    bodyWaist: [70, 76],
  },
  {
    size: "L",
    chest: 108,
    hem: 92,
    shoulder: 42.5,
    sleeve: 61.5,
    length: 51.5,
    bodyBust: [94, 100],
    bodyWaist: [76, 82],
  },
  {
    size: "XL",
    chest: 114,
    hem: 98,
    shoulder: 44,
    sleeve: 62,
    length: 53,
    bodyBust: [100, 108],
    bodyWaist: [82, 90],
  },
];

export function formatGuideMeasurement(
  value: number,
  unit: ArcJacketSizeUnit,
) {
  if (unit === "in") {
    return (value / 2.54).toFixed(1);
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatGuideRange(
  range: readonly [number, number],
  unit: ArcJacketSizeUnit,
) {
  return range
    .map((value) => formatGuideMeasurement(value, unit))
    .join("–");
}
