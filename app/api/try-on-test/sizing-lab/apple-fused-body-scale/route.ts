import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const DEPTH_DIRECTORY = path.join(tmpdir(), "primestyle-depth-pro-cache-v3");
const POSE_DIRECTORY = path.join(tmpdir(), "primestyle-apple-vision-pose3d-cache");

type BodyRowName = "neck" | "chest" | "underbust" | "waist" | "trouserWaist" | "hips";

interface BodyRow {
  name: BodyRowName;
  y: number;
  leftX: number;
  rightX: number;
}

interface BodyMaskSupportRun {
  startX: number;
  endX: number;
}

interface BodyMaskSupportRow {
  name: BodyRowName;
  threshold: number;
  maskWidth: number;
  maskHeight: number;
  maskSource: string;
  scanlines: Array<{ y: number; runs: BodyMaskSupportRun[] }>;
}

interface RequestBody {
  cacheKey?: string;
  heightCm?: number;
  rows?: BodyRow[];
  bodySupport?: BodyMaskSupportRow[];
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  const body = await request.json() as RequestBody;
  if (!validHash(body.cacheKey)
    || !Number.isFinite(body.heightCm) || Number(body.heightCm) <= 50 || Number(body.heightCm) >= 260
    || !validRows(body.rows)
    || !validBodySupport(body.bodySupport, body.rows)) {
    return NextResponse.json({ ok: false, error: "Apple/Depth Pro body-plane inputs are invalid." }, { status: 400 });
  }

  const cacheKey = body.cacheKey;
  const depthPath = path.join(DEPTH_DIRECTORY, `${cacheKey}.npz`);
  const posePath = path.join(POSE_DIRECTORY, `${cacheKey}.json`);
  if (!existsSync(depthPath) || !existsSync(posePath)) {
    return NextResponse.json({
      ok: false,
      error: "Run Apple Vision 3D and Depth Pro first; one local cache is missing.",
    }, { status: 409 });
  }

  const started = performance.now();
  try {
    const python = process.env.DEPTH_PRO_PYTHON ?? "/Users/arashsn/.codex/runtime/geocalib-venv/bin/python";
    const script = path.resolve(/* turbopackIgnore: true */ process.cwd(), "scripts/apple_fused_body_scale.py");
    const rowArgs = body.rows.flatMap((row) => [
      "--row", row.name, String(row.y), String(row.leftX), String(row.rightX),
    ]);
    const { stdout } = await execFileAsync(python, [
      script,
      "--depth-cache", depthPath,
      "--pose-cache", posePath,
      "--height-cm", String(body.heightCm),
      "--body-support-json", JSON.stringify(body.bodySupport),
      ...rowArgs,
    ], { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
    return NextResponse.json({
      ok: true,
      result: {
        ...JSON.parse(stdout.trim()),
        cacheKey,
        elapsedMs: Math.round(performance.now() - started),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple/Depth Pro body fusion failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function validBodySupport(support: BodyMaskSupportRow[] | undefined, rows: BodyRow[] | undefined): support is BodyMaskSupportRow[] {
  if (!Array.isArray(support) || !Array.isArray(rows) || support.length !== rows.length || support.length > 5) return false;
  const requiredNames = new Set(rows.map((row) => row.name));
  return support.every((row) => requiredNames.has(row.name)
    && Number.isFinite(row.threshold) && row.threshold >= 0 && row.threshold <= 255
    && Number.isInteger(row.maskWidth) && row.maskWidth > 0 && row.maskWidth <= 20_000
    && Number.isInteger(row.maskHeight) && row.maskHeight > 0 && row.maskHeight <= 20_000
    && typeof row.maskSource === "string" && row.maskSource.length > 0 && row.maskSource.length <= 80
    && Array.isArray(row.scanlines) && row.scanlines.length >= 5 && row.scanlines.length <= 25
    && row.scanlines.every((scanline) => Number.isFinite(scanline.y)
      && Array.isArray(scanline.runs) && scanline.runs.length <= 20
      && scanline.runs.every((run) => Number.isFinite(run.startX)
        && Number.isFinite(run.endX)
        && run.startX >= 0
        && run.endX > run.startX
        && run.endX <= 20_000)));
}

function validRows(rows: BodyRow[] | undefined): rows is BodyRow[] {
  const allowedNames = new Set<BodyRowName>(["neck", "chest", "underbust", "waist", "trouserWaist", "hips"]);
  return Array.isArray(rows) && rows.length >= 1 && rows.length <= 5
    && rows.every((row) => allowedNames.has(row.name)
      && [row.y, row.leftX, row.rightX].every(Number.isFinite)
      && Math.abs(row.rightX - row.leftX) >= 20);
}

function validHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

async function hasSizingLabAccess(request: NextRequest): Promise<boolean> {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return false;
  if (!isSiteAuthEnabled()) return true;
  const token = request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value ?? "";
  return token ? Boolean(await verifySiteSessionToken(token)) : false;
}
