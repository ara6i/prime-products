import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { loadWearSideCatalog } from "../_lib/catalog";
import { loadFrozenWearRun } from "../_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
let activeComparison = false;

function tapeFor(person: Awaited<ReturnType<typeof loadWearSideCatalog>>[number]) {
  return {
    waist: person.rows.waist?.tapeCm ?? null,
    hips: person.rows.hips?.tapeCm ?? null,
  };
}

export async function POST(request: Request) {
  const host = request.headers.get("host");
  if (!isTestLabAvailableForHost(host)) {
    return NextResponse.json({ ok: false, error: "This size-guide analysis is private Test Lab only." }, { status: 403, headers: PRIVATE_HEADERS });
  }
  if (activeComparison) {
    return NextResponse.json({ ok: false, error: "A size-guide analysis is already running." }, { status: 429, headers: PRIVATE_HEADERS });
  }
  try {
    const body = await request.json() as {
      runId?: unknown;
      manualAxis?: unknown;
      manualDeltaCm?: unknown;
      gapCm?: unknown;
      gapAxis?: unknown;
      targetPct?: unknown;
    };
    const runId = typeof body.runId === "string" ? body.runId : "";
    const run = await loadFrozenWearRun(runId);
    if (!run.reveal) return NextResponse.json({ ok: false, error: "Reveal and lock one selected WEAR body first." }, { status: 409, headers: PRIVATE_HEADERS });
    const people = await loadWearSideCatalog();
    const input = people.find((person) => person.scanId === run.inputScanId);
    const candidate = people.find((person) => person.scanId === run.reveal!.selectedScanId);
    if (!input || !candidate) throw new Error("The frozen input or selected person is unavailable.");
    const payload = JSON.stringify({
      gender: input.gender,
      heightCm: input.heightCm,
      inputTape: tapeFor(input),
      candidateTape: tapeFor(candidate),
      manualAxis: body.manualAxis,
      manualDeltaCm: body.manualDeltaCm,
      gapCm: body.gapCm,
      gapAxis: body.gapAxis,
      targetPct: body.targetPct,
    });
    activeComparison = true;
    const script = path.join(process.cwd(), "scripts/local-ml/commercial-sizing/wear-size-guide-impact.cjs");
    const result = await new Promise<unknown>((resolve, reject) => {
      const child = spawn(process.execPath, [script], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH,
          NODE_ENV: "development",
          ...(process.env.WEAR_SIZE_IMPACT_BACKEND_ROOT ? { WEAR_SIZE_IMPACT_BACKEND_ROOT: process.env.WEAR_SIZE_IMPACT_BACKEND_ROOT } : {}),
          ...(process.env.WEAR_SIZE_GUIDE_SNAPSHOT ? { WEAR_SIZE_GUIDE_SNAPSHOT: process.env.WEAR_SIZE_GUIDE_SNAPSHOT } : {}),
        },
      });
      let output = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("The full product-chart analysis timed out."));
      }, 180_000);
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        if (Buffer.byteLength(output) > 24_000_000) {
          child.kill();
          reject(new Error("The product-chart response exceeded the safe local limit."));
        }
      });
      child.stderr.resume();
      child.on("error", () => {
        clearTimeout(timer);
        reject(new Error("The local MyAIFitting sizing adapter is unavailable."));
      });
      child.on("close", () => {
        clearTimeout(timer);
        try {
          resolve(JSON.parse(output));
        } catch {
          reject(new Error("The MyAIFitting sizing adapter returned an invalid result."));
        }
      });
      child.stdin.end(payload);
    });
    const ok = result != null && typeof result === "object" && "ok" in result && result.ok === true;
    return NextResponse.json(result, { status: ok ? 200 : 422, headers: PRIVATE_HEADERS });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Size-guide analysis failed." }, { status: 400, headers: PRIVATE_HEADERS });
  } finally {
    activeComparison = false;
  }
}
