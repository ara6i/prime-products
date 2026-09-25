import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost, normalizeHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
let activeComparisons = 0;

export async function POST(request: Request) {
  const host = request.headers.get("host");
  if (!isTestLabAvailableForHost(host) || !["localhost", "127.0.0.1", "::1"].includes(normalizeHost(host))) {
    return NextResponse.json({ ok: false, error: "This selected-person size test is local to the Test Lab." }, { status: 403, headers: PRIVATE_HEADERS });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ ok: false }, { status: 403, headers: PRIVATE_HEADERS });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ ok: false, error: "Use a JSON measurement request." }, { status: 415, headers: PRIVATE_HEADERS });
  if (Number(request.headers.get("content-length") || 0) > 16000) return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413, headers: PRIVATE_HEADERS });
  let body: string;
  try {
    body = await request.text();
    if (Buffer.byteLength(body) > 16000) return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413, headers: PRIVATE_HEADERS });
    JSON.parse(body);
  } catch { return NextResponse.json({ ok: false, error: "Invalid JSON measurement request." }, { status: 400, headers: PRIVATE_HEADERS }); }
  if (request.signal.aborted) return NextResponse.json({ ok: false, error: "Comparison cancelled." }, { status: 499, headers: PRIVATE_HEADERS });
  // Check after the asynchronous body read so concurrent readers cannot all
  // pass the limit before any comparison has reserved its slot.
  if (activeComparisons >= 2) return NextResponse.json({ ok: false, error: "A size comparison is already running. Try again shortly." }, { status: 429, headers: PRIVATE_HEADERS });
  const backendRoot = process.env.WEAR_SIZE_IMPACT_BACKEND_ROOT || path.resolve(process.cwd(), "../primeStyleAI-backend");
  activeComparisons++;
  try {
    const result = await new Promise<unknown>((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(backendRoot, "scripts/benchmarks/compare-selected-person.cjs")], {
        cwd: backendRoot, stdio: ["pipe", "pipe", "pipe"],
        env: { PATH: process.env.PATH, NODE_ENV: "development", ...(process.env.WEAR_SIZE_IMPACT_DATA_ROOT ? { WEAR_SIZE_IMPACT_DATA_ROOT: process.env.WEAR_SIZE_IMPACT_DATA_ROOT } : {}) },
      });
      let output = "";
      const timer = setTimeout(() => { child.kill(); reject(new Error("Product comparison timed out. Try again.")); }, 25000);
      const abort = () => { child.kill(); reject(new Error("Comparison cancelled.")); };
      request.signal.addEventListener("abort", abort, { once: true });
      const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener("abort", abort); };
      child.stdout.on("data", chunk => {
        output += chunk.toString();
        if (Buffer.byteLength(output) > 2_000_000) { child.kill(); reject(new Error("Unexpectedly large product response.")); }
      });
      // Consume without logging private input or environment details.
      child.stderr.resume();
      child.stdin.on("error", () => {});
      child.on("error", () => { cleanup(); reject(new Error("Local sizing adapter unavailable. Check the backend checkout and WEAR USB.")); });
      child.on("close", () => {
        cleanup();
        try { resolve(JSON.parse(output)); } catch { reject(new Error("Product comparison failed. Check the local sizing adapter and WEAR USB.")); }
      });
      child.stdin.end(body);
      if (request.signal.aborted) abort();
    });
    const ok = result != null && typeof result === "object" && "ok" in result && result.ok === true;
    return NextResponse.json(result, { status: ok ? 200 : 422, headers: PRIVATE_HEADERS });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Product comparison failed." }, { status: 503, headers: PRIVATE_HEADERS });
  } finally { activeComparisons--; }
}
