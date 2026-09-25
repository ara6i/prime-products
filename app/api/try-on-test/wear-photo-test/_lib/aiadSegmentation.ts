import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";

const USB_RUNTIME = "/Volumes/PrimeStorage/PrimeStyleAI-model-artifacts/aiad/aiad-runtime";
export function aiadSegmentationPaths() {
  const root = process.env.WEAR_AIAD_SEGMENT_RUNTIME ?? (process.platform === "darwin" && existsSync(USB_RUNTIME) ? USB_RUNTIME : path.join(process.cwd(), ".local-ml", "aiad-runtime"));
  return { python: path.join(root, "bin", "python"), modelDir: path.join(root, "models") };
}
export function aiadSegmentationAvailable() {
  const p = aiadSegmentationPaths();
  return existsSync(p.python) && ["u2net_human_seg.onnx", "models/u2net_human_seg/u2net_human_seg.onnx"].some((model) => existsSync(path.join(p.modelDir, model)));
}
const masks = new Map<string, Buffer>();
let running: Promise<Buffer> | null = null;
export async function segmentAiadPhoto(dataUrl: unknown) {
  if (typeof dataUrl !== "string" || dataUrl.length > 21_000_000) throw new Error("Photo must be smaller than 15 MB.");
  const match = /^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("A PNG, JPEG or WebP photo is required.");
  const image = Buffer.from(match[1]!, "base64");
  const key = createHash("sha256").update(image).digest("hex");
  const existing = masks.get(key);
  if (existing) { masks.delete(key); masks.set(key, existing); return existing; }
  if (!aiadSegmentationAvailable()) throw new Error("Aiad's rembg segmenter is not installed here. Select the existing MediaPipe comparison or configure WEAR_AIAD_SEGMENT_RUNTIME.");
  // Limit the native matting process to one at a time on the shared test host.
  if (running) throw new Error("Photo segmentation is busy. Retry after the current photo finishes.");
  const p = aiadSegmentationPaths();
  running = new Promise<Buffer>((resolve, reject) => {
    const child = spawn(p.python, [path.join(process.cwd(), "scripts", "local-ml", "aiad-segment-photo.py")], { env: { ...process.env, U2NET_HOME: p.modelDir, OMP_NUM_THREADS: "2", NUMBA_NUM_THREADS: "2", OPENBLAS_NUM_THREADS: "2" }, stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = []; let length = 0, stderr = "";
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("Aiad photo segmentation timed out after 90 seconds.")); }, 90_000);
    child.stdout.on("data", (chunk: Buffer) => { chunks.push(chunk); length += chunk.length; if (length > 8_000_000) { child.kill("SIGTERM"); reject(new Error("Segmentation output exceeded the mask limit.")); } });
    child.stderr.on("data", (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-2000); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); if (code !== 0) reject(new Error(`Aiad segmentation failed: ${stderr.slice(-500)}`)); else resolve(Buffer.concat(chunks)); });
    child.stdin.on("error", () => undefined);
    child.stdin.end(image);
  });
  try { const mask = await running; masks.set(key, mask); while (masks.size > 8) masks.delete(masks.keys().next().value!); return mask; }
  finally { running = null; }
}
