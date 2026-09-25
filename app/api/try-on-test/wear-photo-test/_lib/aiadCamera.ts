import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const AIAD_CAMERA_TOOLS = ["apple-vision-pose3d", "depth-pro-cache", "apple-fused-body-scale"] as const;
export type AiadCameraTool = typeof AIAD_CAMERA_TOOLS[number];

export function aiadCameraTokenPath() {
  return process.env.WEAR_AIAD_CAMERA_TOKEN_FILE ?? (process.platform === "darwin"
    ? "/Users/arashsn/.codex/runtime/aiad-camera-worker/token"
    : path.join(process.cwd(), ".local-ml", "aiad-camera-worker", "token"));
}

async function connection() {
  const url = new URL(process.env.WEAR_AIAD_CAMERA_URL ?? "http://127.0.0.1:19031");
  if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("The camera worker must use an authenticated loopback-only SSH connection.");
  }
  const token = (await readFile(aiadCameraTokenPath(), "utf8")).trim();
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Camera worker credential is invalid.");
  return { url, token };
}

export async function aiadCameraStatus() {
  const unavailable = { appleVision: false, depthPro: false, connected: false, note: "Private Mac camera worker is offline. Raw ONNX and line editing still work. Apple Vision / Depth Pro need the Mac awake and connected." };
  if (!existsSync(aiadCameraTokenPath())) return unavailable;
  try {
    const { url, token } = await connection();
    const response = await fetch(new URL("/health", url), { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(2000), cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.ok || result.worker !== "aiad-camera-v1") return unavailable;
    return { appleVision: result.appleVision === true, depthPro: result.depthPro === true, connected: true,
      note: "Private Mac worker connected. Camera tools apply only to normal photos and edited A-to-B widths; raw tape and the 448-person benchmark are unchanged. Requires this Mac to stay awake." };
  } catch { return unavailable; }
}

export async function forwardAiadCamera(tool: AiadCameraTool, body: string) {
  const { url, token } = await connection();
  return fetch(new URL(`/${tool}`, url), { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body, signal: AbortSignal.timeout(tool === "depth-pro-cache" ? 135_000 : 60_000), cache: "no-store" });
}
