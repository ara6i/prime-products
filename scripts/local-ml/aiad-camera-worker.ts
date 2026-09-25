/** Private, loopback-only adapter for the EXISTING Apple/Depth Pro routes.
 * Run on macOS through an SSH reverse tunnel; never expose its port publicly.
 * No dataset, model training or tape labels are accepted by this service.
 */
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { NextRequest } from "next/server";
import { POST as applePose } from "../../app/api/try-on-test/sizing-lab/apple-vision-pose3d/route";
import { POST as depthCache } from "../../app/api/try-on-test/sizing-lab/depth-pro-cache/route";
import { POST as fusedScale } from "../../app/api/try-on-test/sizing-lab/apple-fused-body-scale/route";
import { isSiteAuthEnabled, signSiteSessionToken, SITE_AUTH_COOKIE_NAME } from "../../app/shared/auth/siteSession";
import { aiadCameraTokenPath } from "../../app/api/try-on-test/wear-photo-test/_lib/aiadCamera";

async function main() {
  if (process.platform !== "darwin") throw new Error("Apple Vision camera worker requires macOS.");
  loadEnvConfig(process.cwd());
  // The large Depth Pro backbone initializes more slowly when native BLAS
  // workers oversubscribe this shared Mac. These limits affect this worker's
  // child processes only, not other projects or the frozen ONNX model.
  process.env.OMP_NUM_THREADS = "2";
  process.env.OPENBLAS_NUM_THREADS = "2";
  process.env.MKL_NUM_THREADS = "2";
  process.env.VECLIB_MAXIMUM_THREADS = "2";
  const tokenPath = aiadCameraTokenPath();
  if (process.argv.includes("--init-key")) {
    await mkdir(path.dirname(tokenPath), { recursive: true, mode: 0o700 });
    if (!existsSync(tokenPath)) await writeFile(tokenPath, randomBytes(32).toString("hex"), { mode: 0o600, flag: "wx" });
    console.log("Private camera worker credential ready; its value is not printed.");
    return;
  }
  const token = (await readFile(tokenPath, "utf8")).trim();
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Initialize the private camera credential first.");
  const routes = { "/apple-vision-pose3d": applePose, "/depth-pro-cache": depthCache, "/apple-fused-body-scale": fusedScale };
  let busy = false;
  const server = createServer(async (request, response) => {
    const reply = (status: number, value: unknown) => { response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); response.end(JSON.stringify(value)); };
    const provided = request.headers.authorization?.replace(/^Bearer /, "") ?? "";
    if (Buffer.byteLength(provided) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(provided), Buffer.from(token))) { reply(401, { ok: false, error: "Unauthorized" }); return; }
    if (request.method === "GET" && request.url === "/health") {
      const runtime = process.env.DEPTH_PRO_RUNTIME ?? "/Users/arashsn/.codex/runtime/ml-depth-pro";
      reply(200, { ok: true, worker: "aiad-camera-v1", appleVision: existsSync("/usr/bin/xcrun"), depthPro: existsSync(process.env.DEPTH_PRO_PYTHON ?? "/Users/arashsn/.codex/runtime/geocalib-venv/bin/python") && existsSync(path.join(runtime, "checkpoints/depth_pro.pt")), busy }); return;
    }
    if (request.method !== "POST" || !Object.hasOwn(routes, request.url ?? "")) { reply(404, { ok: false, error: "Camera action not allowed" }); return; }
    if (busy) { reply(429, { ok: false, error: "Mac camera worker is busy. Retry after the current photo finishes." }); return; }
    busy = true;
    try {
      const chunks: Buffer[] = []; let length = 0;
      for await (const chunk of request) {
        length += chunk.length;
        if (length > 22 * 1024 * 1024) { reply(413, { ok: false, error: "Photo request too large" }); return; }
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks).toString("utf8");
      const parsed = JSON.parse(body);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || "heldoutScanId" in parsed || "scanId" in parsed) { reply(400, { ok: false, error: "Normal photos only" }); return; }
      const headers: Record<string, string> = { "content-type": "application/json", host: "localhost" };
      // Keep the existing route's own access check. The private worker is an
      // authenticated server-to-server caller; no browser credentials are read.
      if (isSiteAuthEnabled()) headers.cookie = `${SITE_AUTH_COOKIE_NAME}=${await signSiteSessionToken("aiad-camera-worker")}`;
      const input = new NextRequest(`http://localhost/api/try-on-test/sizing-lab${request.url}`, { method: "POST", headers, body });
      const output = await routes[request.url as keyof typeof routes](input);
      response.writeHead(output.status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(await output.text());
    } catch { reply(500, { ok: false, error: "Camera processing failed. No ONNX outputs were changed." }); }
    finally { busy = false; }
  });
  server.requestTimeout = 145_000;
  server.headersTimeout = 10_000;
  server.listen(19031, "127.0.0.1", () => console.log("Private normal-photo camera worker listening on 127.0.0.1:19031"));
  process.on("SIGTERM", () => server.close());
  process.on("SIGINT", () => server.close());
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "Camera worker failed"); process.exitCode = 1; });
