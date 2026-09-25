// Port of Aiad's frozen deployment/frontend.py. Keep this independent of ONNX
// and React so framing, units and mask cleanup can be regression-tested.
export const AIAD_WIDTH = 192;
export const AIAD_HEIGHT = 256;
export const AIAD_MEASURES = ["waist", "hips", "chest", "underbust", "neck", "thigh"] as const;
export const AIAD_LEVELS = ["neck", "shoulder", "chest", "underbust", "waist", "hips"] as const;
export const AIAD_HEIGHT_FRACTIONS = { neck: 0.87, shoulder: 0.82, chest: 0.72, underbust: 0.66, waist: 0.60, hips: 0.49 } as const;
// Exact values in Aiad's frozen deploy_bundle.npz, not the rounded prose in
// PREPROCESSING.md. At a half-pixel boundary the latter can resize differently.
export const AIAD_FRAMING = { personHeight: 0.91015625, top: 0.05078125 } as const;
export const AIAD_FRAMING_REVISION = "aiad-framing-npz-exact-opencv-v2" as const;
export const AIAD_GUIDE_SOURCE = "deployment/wear_measure/predict.py:row_endpoints";
export type AiadMeasure = typeof AIAD_MEASURES[number];
export type AiadLevel = typeof AIAD_LEVELS[number];
export type AiadRowEndpoints = {
  row_px: number; row_cm_from_floor: number; A_px: number; B_px: number;
  width_image_cm: number; full_extent_cm: number;
};
export type AiadProfile = { heightCm: number; weightKg: number; gender: "female" | "male" };

export function pythonRound(value: number) {
  const floor = Math.floor(value);
  return value - floor === 0.5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(value);
}

/** Python round(float, 1), including binary-float ties (e.g. 2.55 -> 2.5). */
export function pythonRoundTenth(value: number) {
  if (!Number.isFinite(value) || value === 0) return value;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, Math.abs(value));
  const bits = view.getBigUint64(0);
  const zero = BigInt(0), one = BigInt(1), two = BigInt(2), shift = BigInt(52);
  const storedExponent = Number((bits >> shift) & BigInt(0x7ff));
  const exponent = (storedExponent || 1) - 1023 - 52;
  const mantissa = (bits & ((one << shift) - one)) + (storedExponent ? one << shift : zero);
  if (exponent >= 0) return value;
  const numerator = mantissa * BigInt(10), denominator = one << BigInt(-exponent);
  let quotient = numerator / denominator;
  const twiceRemainder = (numerator % denominator) * two;
  if (twiceRemainder > denominator || (twiceRemainder === denominator && quotient % two === one)) quotient++;
  return Math.sign(value) * Number(quotient) / 10;
}

export function aiadProfile(profile: AiadProfile) {
  const { heightCm, weightKg, gender } = profile;
  if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250
    || !Number.isFinite(weightKg) || weightKg < 20 || weightKg > 350
    || (gender !== "female" && gender !== "male")) {
    throw new Error("Enter a valid height (80–250 cm), weight (20–350 kg), and female/male profile.");
  }
  const bmi = weightKg / (heightCm / 100) ** 2;
  return { bmi, tensor: new Float32Array([(heightCm - 170) / 20, (weightKg - 70) / 25, (bmi - 24) / 8, Number(gender === "female"), Number(gender === "male")]) };
}

export function maskBox(mask: Uint8Array, width: number, height: number) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!mask[y * width + x]) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error("Empty body mask. Use one complete, clearly visible standing person.");
  return { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 };
}

export function cleanAiadMask(input: Uint8Array, width: number, height: number) {
  if (width < 8 || height < 8 || width * height !== input.length || input.length > 2_000_000) throw new Error("Invalid mask dimensions.");
  const binary = Uint8Array.from(input, (value) => Number(value > 127));
  const seen = new Uint8Array(input.length);
  const queue = new Int32Array(input.length);
  let largest = new Int32Array(0);
  // OpenCV connectedComponents defaults to eight-connected foreground.
  for (let i = 0; i < binary.length; i++) {
    if (!binary[i] || seen[i]) continue;
    let head = 0, tail = 1;
    queue[0] = i; seen[i] = 1;
    while (head < tail) {
      const p = queue[head++]!, x = p % width, y = Math.floor(p / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (binary[n] && !seen[n]) { seen[n] = 1; queue[tail++] = n; }
      }
    }
    if (tail > largest.length) largest = queue.slice(0, tail);
  }
  if (!largest.length) throw new Error("No person foreground was found in the mask.");
  const component = new Uint8Array(input.length);
  for (const p of largest) component[p] = 1;
  // scipy.ndimage.binary_fill_holes uses four-connected background.
  seen.fill(0);
  let head = 0, tail = 0;
  const visit = (p: number) => { if (!component[p] && !seen[p]) { seen[p] = 1; queue[tail++] = p; } };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const p = queue[head++]!, x = p % width, y = Math.floor(p / width);
    if (x > 0) visit(p - 1); if (x + 1 < width) visit(p + 1);
    if (y > 0) visit(p - width); if (y + 1 < height) visit(p + width);
  }
  for (let i = 0; i < component.length; i++) if (!seen[i]) component[i] = 1;
  // OpenCV 5x5 closing: neutral morphology border (0 dilate, 1 erode).
  const dilated = new Uint8Array(input.length);
  const closed = new Uint8Array(input.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let value = 0;
    for (let dy = -2; dy <= 2 && !value; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && component[ny * width + nx]) { value = 1; break; }
    }
    dilated[y * width + x] = value;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let value = 1;
    for (let dy = -2; dy <= 2 && value; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !dilated[ny * width + nx]) { value = 0; break; }
    }
    closed[y * width + x] = value;
  }
  const removedPixels = binary.reduce((n, p, i) => n + Number(p === 1 && closed[i] === 0), 0);
  return { mask: closed, removedPixels };
}

export function canonicalizeAiadMask(mask: Uint8Array, width: number, height: number) {
  const sourceBox = maskBox(mask, width, height);
  const scale = AIAD_FRAMING.personHeight * AIAD_HEIGHT / sourceBox.height;
  const nw = Math.max(1, pythonRound(sourceBox.width * scale));
  const nh = Math.max(1, pythonRound(sourceBox.height * scale));
  const xOffset = Math.floor((AIAD_WIDTH - nw) / 2);
  const yOffset = pythonRound(AIAD_FRAMING.top * AIAD_HEIGHT);
  const canonical = new Uint8Array(AIAD_WIDTH * AIAD_HEIGHT);
  // Match OpenCV resizeNN's reciprocal of dsize/src, then multiply and floor.
  // Re-associating as dst*src/dsize changes boundary pixels (153 -> 85 is one
  // example). Exact pixels are checked against Aiad's original Python helper.
  const inverseScaleX = 1 / (nw / sourceBox.width);
  const inverseScaleY = 1 / (nh / sourceBox.height);
  for (let y = 0; y < nh && y + yOffset < AIAD_HEIGHT; y++) {
    const sy = sourceBox.top + Math.min(Math.floor(y * inverseScaleY), sourceBox.height - 1);
    for (let x = Math.max(0, -xOffset); x < Math.min(nw, AIAD_WIDTH - xOffset); x++) {
      const sx = sourceBox.left + Math.min(Math.floor(x * inverseScaleX), sourceBox.width - 1);
      canonical[(y + yOffset) * AIAD_WIDTH + x + xOffset] = mask[sy * width + sx] ? 255 : 0;
    }
  }
  const fill = canonical.reduce((n, p) => n + Number(p > 0), 0) / canonical.length;
  if (!(fill > 0.05 && fill < 0.45)) throw new Error(`Body-mask coverage ${(fill * 100).toFixed(1)}% is outside Aiad's 5–45% input gate. Check segmentation and full-body framing.`);
  return { mask: canonical, tensor: Float32Array.from(canonical, (p) => p / 255), fill, sourceBox, canonicalBox: maskBox(canonical, AIAD_WIDTH, AIAD_HEIGHT), transform: { xOffset, yOffset, nw, nh, sourceWidth: width, sourceHeight: height }, cropped: nw > AIAD_WIDTH };
}

export function aiadGuideLines(canonical: ReturnType<typeof canonicalizeAiadMask>, heightCm: number) {
  const { mask, canonicalBox: box, sourceBox, transform: t } = canonical;
  const center = pythonRound((box.left + box.right) / 2);
  let occupiedRows = 0;
  for (let row = 0; row < AIAD_HEIGHT; row++) {
    if (mask.subarray(row * AIAD_WIDTH, (row + 1) * AIAD_WIDTH).some((value) => value > 127)) occupiedRows++;
  }
  return AIAD_LEVELS.map((kind) => {
    if (occupiedRows < 10) return { kind, line: null, endpoints: null };
    const y = pythonRound(box.bottom - AIAD_HEIGHT_FRACTIONS[kind] * (box.bottom - box.top));
    const spans: Array<[number, number]> = [];
    const full: Array<[number, number]> = [];
    for (let row = Math.max(box.top, y - 2); row <= Math.min(box.bottom, y + 2); row++) {
      const runs: Array<[number, number]> = [];
      let start = -1;
      for (let x = 0; x <= AIAD_WIDTH; x++) {
        const on = x < AIAD_WIDTH && mask[row * AIAD_WIDTH + x]! > 127;
        if (on && start < 0) start = x;
        if (!on && start >= 0) { runs.push([start, x - 1]); start = -1; }
      }
      const run = runs.find(([a, b]) => a <= center && b >= center) ?? [...runs].sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
      if (run) { spans.push(run); full.push([runs[0]![0], runs[runs.length - 1]![1]]); }
    }
    if (!spans.length) return { kind, line: null, endpoints: null };
    const a = Math.min(...spans.map((r) => r[0])), b = Math.max(...spans.map((r) => r[1]));
    const fa = Math.min(...full.map((r) => r[0])), fb = Math.max(...full.map((r) => r[1]));
    const cmPerPixel = heightCm / Math.max(box.bottom - box.top, 1);
    const endpoints: AiadRowEndpoints = {
      row_px: y, row_cm_from_floor: pythonRoundTenth(AIAD_HEIGHT_FRACTIONS[kind] * heightCm),
      A_px: a, B_px: b, width_image_cm: pythonRoundTenth((b - a) * cmPerPixel),
      full_extent_cm: pythonRoundTenth((fb - fa) * cmPerPixel),
    };
    const toPhoto = (x: number, row: number) => ({ x: (sourceBox.left + (x - t.xOffset) * sourceBox.width / t.nw) / t.sourceWidth, y: (sourceBox.top + (row - t.yOffset) * sourceBox.height / t.nh) / t.sourceHeight });
    return { kind, endpoints, line: { canonical: { left: { x: a / AIAD_WIDTH, y: y / AIAD_HEIGHT }, right: { x: b / AIAD_WIDTH, y: y / AIAD_HEIGHT } }, photo: { left: toPhoto(a, y), right: toPhoto(b, y) } } };
  });
}
