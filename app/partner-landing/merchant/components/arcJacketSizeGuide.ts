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
  bodyChest: readonly [number, number];
  bodyWaist: readonly [number, number];
};

export const ARC_JACKET_SIZE_ROWS: readonly ArcJacketSizeRow[] = [
  {
    size: "XS",
    chest: 100,
    hem: 90,
    shoulder: 43,
    sleeve: 63,
    length: 58,
    bodyChest: [84, 89],
    bodyWaist: [71, 76],
  },
  {
    size: "S",
    chest: 104,
    hem: 94,
    shoulder: 44.5,
    sleeve: 64,
    length: 59,
    bodyChest: [89, 94],
    bodyWaist: [76, 81],
  },
  {
    size: "M",
    chest: 110,
    hem: 100,
    shoulder: 46,
    sleeve: 65,
    length: 60,
    bodyChest: [94, 101],
    bodyWaist: [81, 88],
  },
  {
    size: "L",
    chest: 116,
    hem: 106,
    shoulder: 47.5,
    sleeve: 66,
    length: 61.5,
    bodyChest: [101, 108],
    bodyWaist: [88, 96],
  },
  {
    size: "XL",
    chest: 124,
    hem: 114,
    shoulder: 49,
    sleeve: 67,
    length: 63,
    bodyChest: [108, 116],
    bodyWaist: [96, 104],
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
