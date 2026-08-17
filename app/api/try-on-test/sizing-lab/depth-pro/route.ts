import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { runCachedLocalInference } from "../_lib/localInferenceScheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

interface Point { x: number; y: number }
interface RequestBody {
  imageDataUrl?: string;
  cacheKey?: string;
  heightCm?: number;
  top?: Point;
  bottom?: Point;
  proofStart?: Point;
  proofEnd?: Point;
  proofCm?: number;
  rows?: Array<{ name: "waist" | "trouserWaist" | "hips"; y: number; leftX: number; rightX: number }>;
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }
  const body = await request.json() as RequestBody;
  const parsed = body.imageDataUrl ? parseDataUrl(body.imageDataUrl) : null;
  const suppliedCacheKey = typeof body.cacheKey === "string" && /^[a-f0-9]{64}$/.test(body.cacheKey) ? body.cacheKey : null;
  if ((!parsed && !suppliedCacheKey) || !isFiniteRequest(body)) {
    return NextResponse.json({ ok: false, error: "A valid image, height anchors, and proof interval are required." }, { status: 400 });
  }
  const image = parsed ? Buffer.from(parsed.base64, "base64") : null;
  if (image && image.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image exceeds the 15 MB local test limit." }, { status: 413 });
  }

  const imageHash = image ? createHash("sha256").update(image).digest("hex") : suppliedCacheKey!;
  const cachePath = path.join(tmpdir(), "primestyle-depth-pro-cache-v3", `${imageHash}.npz`);
  if (!image && !existsSync(cachePath)) {
    return NextResponse.json({ ok: false, error: "Depth cache expired; resend the image." }, { status: 409 });
  }
  try {
    const inferenceKey = createHash("sha256")
      .update("depth-pro-scale-v3")
      .update(imageHash)
      .update(JSON.stringify({
        heightCm: body.heightCm,
        top: body.top,
        bottom: body.bottom,
        proofStart: body.proofStart,
        proofEnd: body.proofEnd,
        proofCm: body.proofCm,
        rows: body.rows ?? [],
      }))
      .digest("hex");
    const inference = await runCachedLocalInference<Record<string, unknown>>({
      key: `depth-pro:${inferenceKey}`,
      label: "Depth Pro",
      cacheGroup: "depth-pro-results",
      cacheTtlMs: 10 * 60_000,
      cacheMaxEntries: 8,
      task: async () => {
        const tempDirectory = await mkdtemp(path.join(tmpdir(), "primestyle-depth-pro-"));
        const imagePath = image ? path.join(tempDirectory, `input.${parsed!.extension}`) : cachePath;
        try {
          if (image) await writeFile(imagePath, image);
          const python = process.env.DEPTH_PRO_PYTHON ?? "/Users/arashsn/.codex/runtime/geocalib-venv/bin/python";
          const runtimeDirectory = process.env.DEPTH_PRO_RUNTIME ?? "/Users/arashsn/.codex/runtime/ml-depth-pro";
          const script = path.resolve(/* turbopackIgnore: true */ process.cwd(), "scripts/depth_pro_scale_test.py");
          const rowArgs = (body.rows ?? []).flatMap((row) => [
            "--row", row.name, String(row.y), String(row.leftX), String(row.rightX),
          ]);
          const { stdout } = await execFileAsync(python, [
            script, imagePath,
            "--height-cm", String(body.heightCm),
            "--top", String(body.top!.x), String(body.top!.y),
            "--bottom", String(body.bottom!.x), String(body.bottom!.y),
            "--proof-start", String(body.proofStart!.x), String(body.proofStart!.y),
            "--proof-end", String(body.proofEnd!.x), String(body.proofEnd!.y),
            "--proof-cm", String(body.proofCm),
            "--cache-path", cachePath,
            ...rowArgs,
          ], { cwd: runtimeDirectory, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
          return JSON.parse(stdout.trim()) as Record<string, unknown>;
        } finally {
          await rm(tempDirectory, { recursive: true, force: true });
        }
      },
    });
    return NextResponse.json({
      ok: true,
      result: {
        ...inference.value,
        cacheKey: imageHash,
        cacheHit: inference.cacheHit || inference.value.cacheHit === true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Depth Pro failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function isFinitePoint(point: Point | undefined): point is Point {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
}

function isFiniteRequest(body: RequestBody): boolean {
  return Number.isFinite(body.heightCm) && Number(body.heightCm) > 0
    && Number.isFinite(body.proofCm) && Number(body.proofCm) > 0
    && isFinitePoint(body.top) && isFinitePoint(body.bottom)
    && isFinitePoint(body.proofStart) && isFinitePoint(body.proofEnd)
    && (body.rows ?? []).every((row) => [row.y, row.leftX, row.rightX].every(Number.isFinite));
}

function parseDataUrl(value: string): { base64: string; extension: string } | null {
  const match = value.match(/^data:image\/(png|jpe?g|webp);base64,([a-zA-Z0-9+/=\s]+)$/);
  if (!match) return null;
  return { base64: match[2].replace(/\s/g, ""), extension: match[1] === "jpeg" ? "jpg" : match[1] };
}

async function hasSizingLabAccess(request: NextRequest): Promise<boolean> {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return false;
  if (!isSiteAuthEnabled()) return true;
  const token = request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value ?? "";
  return token ? Boolean(await verifySiteSessionToken(token)) : false;
}
