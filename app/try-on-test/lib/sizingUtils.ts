import type { FitAreaInfo, FitLabel, SilhouetteContext, TryOnProductCategory } from "./types";

export type Gender = "male" | "female";
export type BraRegion = "US" | "UK" | "EU" | "FR" | "IT" | "JP" | "KR" | "AU";
export type ShoeSystem = "US_M" | "US_W" | "UK" | "EU";

export interface SizeGuideField {
  key: string;
  label: string;
  unit?: string;
  required?: boolean;
}

export interface ManualSizeGuide {
  found: true;
  title?: string;
  headers: string[];
  rows: string[][];
  requiredFields: SizeGuideField[];
  sections?: Record<string, { headers: string[]; rows: string[][]; requiredFields?: SizeGuideField[] }>;
  unit?: string;
}

export interface ProductSetupState {
  productId?: string;
  category: TryOnProductCategory;
  subcategory?: string;
  title: string;
  description: string;
  material: string;
  productImage?: string;
  sizeChartText: string;
}

export interface UserSizingState {
  gender: Gender;
  heightFeet: string;
  heightInches: string;
  weight: string;
  age: string;
  braRegion: BraRegion;
  bandSize: string;
  cupSize: string;
  shoeBrand: string;
  shoeSystem: ShoeSystem;
  shoeSize: string;
  faceWidthMm: string;
  bridgeWidthMm: string;
  templeLengthMm: string;
  lensWidthMm: string;
  lensHeightMm: string;
  pdMm: string;
  headCircumferenceCm: string;
  headWidthCm: string;
}

export interface MatchDetail {
  measurement: string;
  userValue: string;
  chartRange: string;
  fit?: string;
  section?: string;
}

export interface SizingResult {
  recommendedSize?: string;
  recommendedLength?: string | null;
  confidence?: string;
  reasoning?: string;
  unit?: "cm" | "in" | "mm" | string;
  matchDetails?: MatchDetail[];
  internationalSizes?: Record<string, string>;
  sections?: Record<string, { recommendedSize?: string; matchDetails?: MatchDetail[]; matchedRowText?: string }>;
  matchedRowText?: string;
  method?: string;
}

export interface ShoeDerivation {
  footLengthCm: number;
  shoeUS?: string;
  shoeUK?: string;
  shoeEU?: string;
}

export const CATEGORY_OPTIONS: Array<{ value: TryOnProductCategory; label: string }> = [
  { value: "apparel", label: "Apparel" },
  { value: "shoe", label: "Shoes" },
  { value: "bag", label: "Bag" },
  { value: "hat", label: "Hat" },
  { value: "sunglasses", label: "Sunglasses" },
  { value: "necklace", label: "Necklace" },
  { value: "bracelet", label: "Bracelet" },
  { value: "ring", label: "Ring" },
  { value: "belt", label: "Belt" },
  { value: "watch", label: "Watch" },
  { value: "accessory", label: "Accessory" },
];

export const SHOE_BRANDS = [
  "Nike",
  "Adidas",
  "New Balance",
  "Puma",
  "Reebok",
  "Converse",
  "Vans",
  "ASICS",
  "Jordan",
  "Skechers",
];

export const DEFAULT_SIZE_CHARTS: Record<TryOnProductCategory, string> = {
  apparel: "Size,Chest (cm),Waist (cm),Hips (cm),Length (cm)\nS,88-96,76-84,90-98,66\nM,96-104,84-92,98-106,68\nL,104-112,92-100,106-114,70\nXL,112-122,100-110,114-124,72",
  shoe: "Size,Foot Length (cm),US,UK,EU\n8,26.0-26.8,8,7.5,41\n9,26.9-27.6,9,8.5,42.5\n10,27.7-28.4,10,9.5,44\n11,28.5-29.2,11,10.5,45",
  bag: "Size,Height (cm),Width (cm),Depth (cm)\nSmall,18-24,22-30,8-12\nMedium,24-32,30-40,10-16\nLarge,32-42,40-55,14-22",
  hat: "Size,Head Circumference (cm)\nS,54-55\nM,56-57\nL,58-59\nXL,60-61",
  sunglasses: "Size,Lens Width (mm),Bridge Width (mm),Temple Length (mm),Face Width (mm)\nNarrow,48-51,16-18,135-140,125-135\nMedium,52-55,18-20,140-145,136-145\nWide,56-60,20-22,145-150,146-158",
  necklace: "Size,Neck Circumference (cm),Length (cm)\nShort,34-38,40\nMedium,38-42,45\nLong,42-48,50",
  bracelet: "Size,Wrist Circumference (cm)\nS,14-15.5\nM,15.5-17\nL,17-19",
  ring: "Size,Finger Circumference (mm)\n6,51.8-52.5\n7,54.4-55.0\n8,56.9-57.6\n9,59.5-60.2",
  belt: "Size,Waist (cm)\nS,76-84\nM,84-92\nL,92-102\nXL,102-112",
  watch: "Size,Wrist Circumference (cm)\nSmall,14-16\nMedium,16-18\nLarge,18-20",
  accessory: "Size,Height (in),Weight (lbs)\nSmall,59-65,99-132\nMedium,65-71,132-181\nLarge,71-77,181-243",
};

export const FORMULA_GROUPS: Array<{ title: string; lines: string[] }> = [
  {
    title: "Body",
    lines: [
      "AI estimates chest/bust, waist, hips, shoulder, inseam, and sleeve from height, weight, gender, and age.",
      "Height is collected as feet + inches and converted to total inches before API calls.",
      "Weight is collected and sent in pounds.",
      "For women's apparel, band and cup add bust context using the bra formula below.",
    ],
  },
  {
    title: "Bra To Bust",
    lines: [
      "Each cup step adds about 1 inch / 2.54 cm over the band.",
      "US/UK: bust cm = (band inches + cup offset inches) x 2.54.",
      "EU/FR/JP: bust cm = band cm + cup offset inches x 2.54.",
      "IT: underbust cm = 60 + band index x 5; bust cm = underbust cm + cup offset inches x 2.54.",
    ],
  },
  {
    title: "Fit Labels",
    lines: [
      "Good: inside the chart range, or within 0.5 in / 1.27 cm / 12.7 mm of the edge.",
      "A bit tight/loose: 0.5-1 in outside the chart range.",
      "Tight/loose: 1-2 in outside the chart range.",
      "Too tight/loose: more than 2 in outside the chart range.",
    ],
  },
  {
    title: "Shoes",
    lines: [
      "Brand + familiar size is converted to foot length in cm.",
      "US/UK/EU helper sizes are sent with footLengthCm so the backend can match either foot length or chart size columns.",
      "Brand correction is a small cm offset for brands that run slightly large or small.",
    ],
  },
  {
    title: "Sunglasses",
    lines: [
      "Pixel scale: mm per pixel = 11.7 / iris diameter pixels.",
      "PD = distance between iris centers.",
      "Bridge width = inner eye gap / 1.6.",
      "Lens width = (face width - bridge width) / 2, clamped to realistic eyewear range.",
      "Lens height = lens width x 0.62, clamped to realistic eyewear range.",
    ],
  },
  {
    title: "Hats",
    lines: [
      "Head width = face width x 1.07.",
      "Head circumference = ellipse circumference using head width and head depth.",
      "Manual lab input sends head circumference directly when available.",
    ],
  },
  {
    title: "Accessories",
    lines: [
      "Height and weight are used to keep the product scale realistic.",
      "Accessory categories send category placement rules so only the right body region changes.",
    ],
  },
];

const HEADER_TO_FIELD: Array<[RegExp, string, string]> = [
  [/bust/i, "bust", "cm"],
  [/chest/i, "chest", "cm"],
  [/waist/i, "waist", "cm"],
  [/hip/i, "hips", "cm"],
  [/shoulder/i, "shoulderWidth", "cm"],
  [/sleeve/i, "sleeveLength", "cm"],
  [/inseam|inside leg/i, "inseam", "cm"],
  [/neck circumference|neck/i, "neckCircumference", "cm"],
  [/foot length|foot/i, "footLengthCm", "cm"],
  [/head circumference/i, "headCircumference", "cm"],
  [/head width/i, "headWidth", "cm"],
  [/face width|frame width/i, "faceWidth", "mm"],
  [/bridge/i, "bridgeWidth", "mm"],
  [/temple|arm length/i, "templeLength", "mm"],
  [/lens width/i, "lensWidth", "mm"],
  [/lens height/i, "lensHeight", "mm"],
  [/wrist/i, "wristCircumference", "cm"],
  [/finger/i, "fingerCircumference", "mm"],
  [/height/i, "height", "cm"],
  [/weight/i, "weight", "kg"],
];

const SIZE_LABEL_HEADER = /^(size|standard|country|fit|silhouette|category|eu|uk|us|it|jp|cn|kr|ru|br|au)$/i;
const SKIP_FIT_AREAS = new Set(["height", "altezza", "estatura"]);

export function defaultProductSetup(): ProductSetupState {
  return {
    category: "apparel",
    title: "Test product",
    description: "",
    material: "",
    sizeChartText: DEFAULT_SIZE_CHARTS.apparel,
  };
}

export function defaultUserSizing(): UserSizingState {
  return {
    gender: "male",
    heightFeet: "5",
    heightInches: "10",
    weight: "180",
    age: "30",
    braRegion: "US",
    bandSize: "34",
    cupSize: "C",
    shoeBrand: "Nike",
    shoeSystem: "US_M",
    shoeSize: "9",
    faceWidthMm: "140",
    bridgeWidthMm: "18",
    templeLengthMm: "145",
    lensWidthMm: "54",
    lensHeightMm: "36",
    pdMm: "64",
    headCircumferenceCm: "57",
    headWidthCm: "16",
  };
}

export function parseSizeChartText(text: string): ManualSizeGuide {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Size chart is empty");

  if (trimmed.startsWith("{")) {
    return normalizeSizeGuideJson(JSON.parse(trimmed));
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error("Size chart needs a header row and at least one size row");

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const rows = lines.map((line) => splitDelimitedLine(line, delimiter));
  const headers = rows[0]?.map((cell) => cell.trim()).filter(Boolean) ?? [];
  const bodyRows = rows.slice(1).map((row) => headers.map((_, index) => (row[index] ?? "").trim()));

  if (headers.length < 2 || bodyRows.length === 0) {
    throw new Error("Size chart must include at least size plus one measurement column");
  }

  return {
    found: true,
    headers,
    rows: bodyRows,
    requiredFields: inferRequiredFields(headers),
  };
}

function normalizeSizeGuideJson(raw: unknown): ManualSizeGuide {
  if (!raw || typeof raw !== "object") {
    throw new Error("Size chart JSON must be an object");
  }

  const parsed = raw as Record<string, unknown>;
  const sections = normalizeSections(parsed.sections);
  const headers = normalizeHeaders(parsed.headers) ?? firstSection(sections)?.headers ?? [];
  const rows = normalizeRows(parsed.rows, headers);

  if (!headers.length && !Object.keys(sections).length) {
    throw new Error("Size chart JSON needs headers and rows or sections");
  }
  if (headers.length && !rows.length && !Object.keys(sections).length) {
    throw new Error("Size chart JSON needs at least one row");
  }

  const sectionFields = Object.values(sections).flatMap((section) => section.requiredFields ?? inferRequiredFields(section.headers));
  const ownFields = Array.isArray(parsed.requiredFields)
    ? normalizeRequiredFields(parsed.requiredFields)
    : inferRequiredFields(headers);

  return {
    found: true,
    title: typeof parsed.title === "string" ? parsed.title : undefined,
    headers,
    rows,
    requiredFields: uniqueFields([...ownFields, ...sectionFields]),
    sections: Object.keys(sections).length ? sections : undefined,
    unit: typeof parsed.unit === "string" ? parsed.unit : undefined,
  };
}

function normalizeSections(raw: unknown): NonNullable<ManualSizeGuide["sections"]> {
  const out: NonNullable<ManualSizeGuide["sections"]> = {};
  if (!raw) return out;

  const entries = Array.isArray(raw)
    ? raw.map((section, index) => {
        const candidate = section as Record<string, unknown>;
        return [String(candidate?.name || candidate?.title || `Section ${index + 1}`), section] as const;
      })
    : Object.entries(raw as Record<string, unknown>);

  for (const [name, sectionRaw] of entries) {
    if (!sectionRaw || typeof sectionRaw !== "object") continue;
    const section = sectionRaw as Record<string, unknown>;
    const headers = normalizeHeaders(section.headers) ?? [];
    const rows = normalizeRows(section.rows, headers);
    if (!headers.length || !rows.length) continue;
    out[name] = {
      headers,
      rows,
      requiredFields: Array.isArray(section.requiredFields)
        ? normalizeRequiredFields(section.requiredFields)
        : inferRequiredFields(headers),
    };
  }

  return out;
}

function normalizeHeaders(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const headers = raw.map(String).map((header) => header.trim()).filter(Boolean);
  return headers.length ? headers : null;
}

function normalizeRows(raw: unknown, headers: string[]): string[][] {
  if (!Array.isArray(raw) || !headers.length) return [];
  return raw
    .map((row) => {
      if (Array.isArray(row)) return headers.map((_, index) => String(row[index] ?? "").trim());
      if (row && typeof row === "object") {
        const record = row as Record<string, unknown>;
        return headers.map((header) => String(record[header] ?? record[header.toLowerCase()] ?? "").trim());
      }
      return null;
    })
    .filter((row): row is string[] => !!row && row.some(Boolean));
}

function normalizeRequiredFields(raw: unknown[]): SizeGuideField[] {
  const fields: SizeGuideField[] = [];
  for (const field of raw) {
    if (typeof field === "string") {
      fields.push({ key: field, label: field, required: true });
      continue;
    }
    if (!field || typeof field !== "object") continue;
    const record = field as Record<string, unknown>;
    const key = typeof record.key === "string" ? record.key : "";
    if (!key) continue;
    fields.push({
      key,
      label: typeof record.label === "string" ? record.label : key,
      unit: typeof record.unit === "string" ? record.unit : undefined,
      required: record.required !== false,
    });
  }
  return fields;
}

function uniqueFields(fields: SizeGuideField[]): SizeGuideField[] {
  const out = new Map<string, SizeGuideField>();
  for (const field of fields) {
    if (!field.key || out.has(field.key)) continue;
    out.set(field.key, field);
  }
  return [...out.values()];
}

function firstSection(sections: NonNullable<ManualSizeGuide["sections"]>): { headers: string[]; rows: string[][] } | null {
  return Object.values(sections)[0] ?? null;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (quoted && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && ch === delimiter) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function inferRequiredFields(headers: string[]): SizeGuideField[] {
  const fields = new Map<string, SizeGuideField>();
  for (const header of headers) {
    const base = header.replace(/\s*\(.*?\)\s*/g, "").trim();
    if (!base || SIZE_LABEL_HEADER.test(base)) continue;
    const match = HEADER_TO_FIELD.find(([pattern]) => pattern.test(header));
    if (!match) continue;
    const [, key, fallbackUnit] = match;
    fields.set(key, {
      key,
      label: base,
      unit: inferHeaderUnit(header, fallbackUnit),
      required: true,
    });
  }
  return [...fields.values()];
}

function inferHeaderUnit(header: string, fallbackUnit: string): string {
  if (/\bmm\b/i.test(header)) return "mm";
  if (/\bin\b|inch|inches/i.test(header)) return "in";
  if (/\blbs?\b|pounds?/i.test(header)) return "lbs";
  if (/\bkg\b|kilograms?/i.test(header)) return "kg";
  return fallbackUnit;
}

export function isFaceCategory(category: TryOnProductCategory): boolean {
  return category === "sunglasses";
}

export function isHeadCategory(category: TryOnProductCategory): boolean {
  return category === "hat";
}

export function isShoeCategory(category: TryOnProductCategory): boolean {
  return category === "shoe";
}

export function isBodyBasicCategory(category: TryOnProductCategory): boolean {
  return !isFaceCategory(category) && !isHeadCategory(category) && category !== "apparel" && category !== "shoe";
}

export function deriveShoeSize(input: Pick<UserSizingState, "shoeBrand" | "shoeSystem" | "shoeSize">): ShoeDerivation {
  const size = Number.parseFloat(input.shoeSize);
  if (!Number.isFinite(size) || size <= 0) throw new Error("Shoe size must be a positive number");

  let footLengthCm: number;
  let shoeUS: string | undefined;
  let shoeUK: string | undefined;
  let shoeEU: string | undefined;

  if (input.shoeSystem === "EU") {
    shoeEU = formatSize(size);
    footLengthCm = size / 1.5 - 1.5;
    shoeUS = formatSize((footLengthCm - 19.33) / 0.846);
    shoeUK = formatSize(Number(shoeUS) - 0.5);
  } else if (input.shoeSystem === "UK") {
    shoeUK = formatSize(size);
    shoeUS = formatSize(size + 0.5);
    footLengthCm = 19.33 + Number(shoeUS) * 0.846;
    shoeEU = formatSize((footLengthCm + 1.5) * 1.5);
  } else if (input.shoeSystem === "US_W") {
    shoeUS = formatSize(size);
    footLengthCm = 18.08 + size * 0.846;
    shoeUK = formatSize(size - 2);
    shoeEU = formatSize((footLengthCm + 1.5) * 1.5);
  } else {
    shoeUS = formatSize(size);
    footLengthCm = 19.33 + size * 0.846;
    shoeUK = formatSize(size - 0.5);
    shoeEU = formatSize((footLengthCm + 1.5) * 1.5);
  }

  footLengthCm += brandOffsetCm(input.shoeBrand);

  return {
    footLengthCm: round1(footLengthCm),
    shoeUS,
    shoeUK,
    shoeEU,
  };
}

function brandOffsetCm(brand: string): number {
  switch (brand.toLowerCase()) {
    case "adidas":
    case "puma":
      return -0.1;
    case "converse":
      return -0.2;
    case "vans":
      return -0.15;
    case "skechers":
      return 0.1;
    default:
      return 0;
  }
}

function formatSize(value: number): string {
  return String(Math.round(value * 2) / 2);
}

export function buildFitInfo(matchDetails: MatchDetail[] | undefined, unit: "cm" | "in" | "mm"): FitAreaInfo[] {
  if (!matchDetails?.length) return [];
  return matchDetails
    .filter((detail) => {
      const key = detail.measurement.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim();
      return !SKIP_FIT_AREAS.has(key);
    })
    .map((detail) => {
      const userValue = parseFirstNumber(detail.userValue);
      return {
        area: detail.measurement,
        section: detail.section,
        fit: computeFit(userValue, detail.chartRange, unit),
        userValue: userValue || undefined,
        garmentRange: detail.chartRange || undefined,
      };
    });
}

export function flattenMatchDetails(sizingResult: SizingResult | null | undefined): MatchDetail[] {
  if (!sizingResult) return [];
  const out: MatchDetail[] = [];
  const seen = new Set<string>();
  const push = (items: MatchDetail[] | undefined, section?: string) => {
    for (const item of items ?? []) {
      const key = `${section ?? "root"}:${item.measurement.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...item, section });
    }
  };
  push(sizingResult.matchDetails);
  for (const [section, result] of Object.entries(sizingResult.sections ?? {})) {
    push(result.matchDetails, section);
  }
  return out;
}

export function buildSilhouetteContext(args: {
  sizingResult?: SizingResult | null;
  sizeGuide?: ManualSizeGuide | null;
  user: UserSizingState;
  category: TryOnProductCategory;
  shoe?: ShoeDerivation | null;
}): SilhouetteContext {
  const out: SilhouetteContext = {};
  const { sizingResult, sizeGuide, user, category, shoe } = args;
  const baseSize = sizingResult?.recommendedSize?.toString().trim();

  if (baseSize) {
    const length = sizingResult?.recommendedLength;
    out.recommendedSize = length ? `${baseSize} / Length ${length}` : baseSize;
  }

  const matchedRow = sizingResult?.matchedRowText || firstSectionMatchedRow(sizingResult);
  if (matchedRow) {
    out.recommendedSizeMeasurements = matchedRow;
  } else if (baseSize && sizeGuide?.headers.length && sizeGuide.rows.length) {
    const row = sizeGuide.rows.find((candidate) => candidate.some((cell, index) => index < 3 && cell.trim().toLowerCase() === baseSize.toLowerCase()));
    if (row) {
      out.recommendedSizeMeasurements = sizeGuide.headers
        .map((header, index) => ({ header, value: row[index] ?? "" }))
        .filter(({ header, value }, index) => index > 0 && value && !SIZE_LABEL_HEADER.test(header.replace(/\s*\(.*?\)\s*/g, "").trim()))
        .map(({ header, value }) => `${header} ${value}`)
        .join(", ");
    }
  } else if (baseSize && sizeGuide?.sections) {
    const sectionMatch = findSectionSizeRow(sizeGuide.sections, baseSize);
    if (sectionMatch) out.recommendedSizeMeasurements = sectionMatch;
  }

  const details = flattenMatchDetails(sizingResult);
  const userMeasurements = details
    .filter((detail) => detail.userValue)
    .map((detail) => `${detail.measurement} ${detail.userValue}`);

  if (category === "shoe" && shoe) {
    userMeasurements.push(`Foot Length ${shoe.footLengthCm} cm`);
    if (shoe.shoeUS) userMeasurements.push(`US ${shoe.shoeUS}`);
    if (shoe.shoeUK) userMeasurements.push(`UK ${shoe.shoeUK}`);
    if (shoe.shoeEU) userMeasurements.push(`EU ${shoe.shoeEU}`);
  }
  if (category === "sunglasses") {
    pushMeasurement(userMeasurements, "Face Width", user.faceWidthMm, "mm");
    pushMeasurement(userMeasurements, "Bridge Width", user.bridgeWidthMm, "mm");
    pushMeasurement(userMeasurements, "Temple Length", user.templeLengthMm, "mm");
    pushMeasurement(userMeasurements, "Lens Width", user.lensWidthMm, "mm");
  }
  if (category === "hat") {
    pushMeasurement(userMeasurements, "Head Circumference", user.headCircumferenceCm, "cm");
    pushMeasurement(userMeasurements, "Head Width", user.headWidthCm, "cm");
  }

  if (userMeasurements.length) out.userMeasurementsText = unique(userMeasurements).join(", ");
  out.userHeight = formatHeight(user);
  out.userWeight = formatWeight(user);

  if (sizeGuide?.sections && Object.keys(sizeGuide.sections).length) {
    out.sizeChartSummary = Object.entries(sizeGuide.sections)
      .map(([sectionName, section]) => {
        const rows = section.rows
          .slice(0, 10)
          .map((row) => section.headers.map((header, index) => `${header} ${row[index] ?? "-"}`).join(", "))
          .join(" | ");
        return `${sectionName}: ${rows}`;
      })
      .join(" || ");
  } else if (sizeGuide?.headers.length && sizeGuide.rows.length) {
    out.sizeChartSummary = sizeGuide.rows
      .slice(0, 20)
      .map((row) => sizeGuide.headers.map((header, index) => `${header} ${row[index] ?? "-"}`).join(", "))
      .join(" | ");
  }

  return out;
}

function findSectionSizeRow(sections: NonNullable<ManualSizeGuide["sections"]>, baseSize: string): string | undefined {
  for (const [sectionName, section] of Object.entries(sections)) {
    const row = section.rows.find((candidate) =>
      candidate.some((cell, index) => index < 3 && cell.trim().toLowerCase() === baseSize.toLowerCase()),
    );
    if (!row) continue;
    const summary = section.headers
      .map((header, index) => ({ header, value: row[index] ?? "" }))
      .filter(({ header, value }, index) => index > 0 && value && !SIZE_LABEL_HEADER.test(header.replace(/\s*\(.*?\)\s*/g, "").trim()))
      .map(({ header, value }) => `${header} ${value}`)
      .join(", ");
    return summary ? `${sectionName}: ${summary}` : undefined;
  }
  return undefined;
}

function firstSectionMatchedRow(sizingResult: SizingResult | null | undefined): string | undefined {
  for (const section of Object.values(sizingResult?.sections ?? {})) {
    if (section.matchedRowText) return section.matchedRowText;
  }
  return undefined;
}

function pushMeasurement(out: string[], label: string, value: string, unit: string): void {
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed) && parsed > 0) out.push(`${label} ${parsed} ${unit}`);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function computeFit(userValue: number, chartRange: string, unit: "cm" | "in" | "mm"): FitLabel {
  const { min, max } = parseRange(chartRange);
  if (!min && !max) return "good";
  const perfectTol = unit === "cm" ? 1.27 : unit === "mm" ? 12.7 : 0.5;
  const aBitTol = unit === "cm" ? 2.54 : unit === "mm" ? 25.4 : 1;
  const tooFarTol = unit === "cm" ? 5.08 : unit === "mm" ? 50.8 : 2;
  const inRange = userValue >= min && userValue <= max;
  const overEdge = inRange ? 0 : userValue > max ? userValue - max : min - userValue;

  if (inRange || overEdge <= perfectTol) return "good";
  const isUnder = userValue < min;
  if (overEdge > tooFarTol) return isUnder ? "too-loose" : "too-tight";
  if (overEdge > aBitTol) return isUnder ? "loose" : "tight";
  return isUnder ? "a-bit-loose" : "a-bit-tight";
}

function parseRange(value: string): { min: number; max: number } {
  const nums = value
    .replace(/[^\d.\-–]/g, " ")
    .trim()
    .split(/[\s\-–]+/)
    .filter(Boolean)
    .map(Number)
    .filter((num) => Number.isFinite(num));
  if (!nums.length) return { min: 0, max: 0 };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function parseFirstNumber(value: string): number {
  const num = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function formatHeight(user: UserSizingState): string | undefined {
  try {
    const totalInches = heightToInches(user);
    const feet = Math.floor(totalInches / 12);
    const inches = round1(totalInches - feet * 12);
    const inchesText = Number.isInteger(inches) ? String(inches) : String(inches).replace(/\.0$/, "");
    return `${feet}'${inchesText}"`;
  } catch {
    return undefined;
  }
}

function formatWeight(user: UserSizingState): string | undefined {
  const weight = Number.parseFloat(user.weight);
  if (!Number.isFinite(weight) || weight <= 0) return undefined;
  return `${weight} lbs`;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function heightToInches(user: UserSizingState): number {
  const feet = Number.parseFloat(user.heightFeet);
  const inches = Number.parseFloat(user.heightInches || "0");
  if (!Number.isFinite(feet) || feet < 0 || !Number.isFinite(inches) || inches < 0) {
    throw new Error("Height must be entered as feet and inches");
  }
  const total = feet * 12 + inches;
  if (total <= 0) throw new Error("Height must be entered as feet and inches");
  return round1(total);
}

export function toNumber(value: string, label: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number`);
  return parsed;
}

export function toMm(value: string, unit: "mm" | "cm"): number | undefined {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return unit === "cm" ? parsed * 10 : parsed;
}
