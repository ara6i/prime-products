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

interface RequestBody {
  imageDataUrl?: string;
  cacheKey?: string;
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  const body = await request.json() as RequestBody;
  const parsed = body.imageDataUrl ? parseDataUrl(body.imageDataUrl) : null;
  const suppliedCacheKey = typeof body.cacheKey === "string" && /^[a-f0-9]{64}$/.test(body.cacheKey)
    ? body.cacheKey
    : null;
  if (!parsed && !suppliedCacheKey) {
    return NextResponse.json({ ok: false, error: "A valid image is required for the OCR-free Depth Pro cache." }, { status: 400 });
  }

  const image = parsed ? Buffer.from(parsed.base64, "base64") : null;
  if (image && image.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image exceeds the 15 MB local test limit." }, { status: 413 });
  }
  const imageHash = image ? createHash("sha256").update(image).digest("hex") : suppliedCacheKey!;
  if (suppliedCacheKey && suppliedCacheKey !== imageHash) {
    return NextResponse.json({ ok: false, error: "The Depth Pro image does not match the frozen Apple Vision model." }, { status: 409 });
  }

  const cachePath = path.join(tmpdir(), "primestyle-depth-pro-cache-v3", `${imageHash}.npz`);
  if (!image && !existsSync(cachePath)) {
    return NextResponse.json({ ok: false, error: "Depth Pro cache expired; resend the image." }, { status: 409 });
  }

  try {
    const inference = await runCachedLocalInference<Record<string, unknown>>({
      key: `depth-pro-cache:v3:${imageHash}`,
      label: "Depth Pro cache",
      cacheGroup: "depth-pro-cache-results",
      cacheTtlMs: 10 * 60_000,
      cacheMaxEntries: 8,
      task: async () => {
        const tempDirectory = await mkdtemp(path.join(tmpdir(), "primestyle-depth-pro-cache-only-"));
        const imagePath = image ? path.join(tempDirectory, `input.${parsed!.extension}`) : cachePath;
        try {
          if (image) await writeFile(imagePath, image);
          const python = process.env.DEPTH_PRO_PYTHON ?? "/Users/arashsn/.codex/runtime/geocalib-venv/bin/python";
          const runtimeDirectory = process.env.DEPTH_PRO_RUNTIME ?? "/Users/arashsn/.codex/runtime/ml-depth-pro";
          const script = path.resolve(/* turbopackIgnore: true */ process.cwd(), "scripts/depth_pro_cache.py");
          const { stdout } = await execFileAsync(python, [
            script,
            imagePath,
            "--cache-path", cachePath,
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
    const message = error instanceof Error ? error.message : "OCR-free Depth Pro cache failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
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
