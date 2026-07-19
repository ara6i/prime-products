import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BodygramRequest {
  mode?: "photo" | "stats-only";
  age?: number;
  gender?: "male" | "female";
  heightCm?: number;
  weightKg?: number;
  frontImageDataUrl?: string;
  rightImageDataUrl?: string;
}

interface BodygramMeasurement {
  name?: string;
  unit?: string;
  value?: number;
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  const apiKey = process.env.BODYGRAM_API_KEY?.trim();
  const organizationId = process.env.BODYGRAM_ORGANIZATION_ID?.trim();
  if (!apiKey || !organizationId) {
    return NextResponse.json({ ok: false, error: "Bodygram API key or organization ID is not configured." }, { status: 503 });
  }

  let body: BodygramRequest;
  try {
    body = await request.json() as BodygramRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode ?? "photo";
  if (!body.age || !body.gender || !body.heightCm || !body.weightKg) {
    return NextResponse.json({ ok: false, error: "Age, gender, height, and weight are required." }, { status: 400 });
  }

  const frontSource = body.frontImageDataUrl ? extractBase64(body.frontImageDataUrl) : null;
  const rightSource = body.rightImageDataUrl ? extractBase64(body.rightImageDataUrl) : null;
  if (mode === "photo" && (!frontSource || !rightSource)) {
    return NextResponse.json({ ok: false, error: "Bodygram photos must be valid image data URLs." }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const scanInput = mode === "stats-only"
      ? {
          statsEstimations: {
            age: Math.round(body.age),
            gender: body.gender,
            height: Math.round(body.heightCm * 10),
            weight: Math.round(body.weightKg * 1000),
          },
        }
      : await buildPhotoScan(body, frontSource!, rightSource!);
    const response = await fetch(`https://platform.bodygram.com/api/orgs/${encodeURIComponent(organizationId)}/scans`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scanInput),
      cache: "no-store",
    });
    const text = await response.text();
    const data = parseJson(text);
    const entry = data && typeof data === "object" ? (data as { entry?: Record<string, unknown> }).entry : undefined;
    const measurements = Array.isArray(entry?.measurements)
      ? (entry.measurements as BodygramMeasurement[]).filter((measurement) => measurement.name && Number.isFinite(measurement.value))
      : [];
    const succeeded = response.ok && entry?.status === "success";

    return NextResponse.json({
      ok: succeeded,
      provider: "bodygram",
      mode,
      error: succeeded ? undefined : summarizeFailure(response.status, entry, text),
      latencyMs: Date.now() - startedAt,
      scanId: typeof entry?.id === "string" ? entry.id : null,
      status: typeof entry?.status === "string" ? entry.status : null,
      measurements,
      bodyComposition: entry?.bodyComposition ?? null,
      posture: entry?.posture ?? null,
      // Avatar data is intentionally omitted because it is a large base64 OBJ payload.
    }, { status: succeeded ? 200 : response.status || 502 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      provider: "bodygram",
      error: error instanceof Error ? error.message : "Bodygram request failed.",
      latencyMs: Date.now() - startedAt,
    }, { status: 502 });
  }
}

async function buildPhotoScan(body: BodygramRequest, frontSource: string, rightSource: string) {
  const [frontPhoto, rightPhoto] = await Promise.all([
    normalizeBodygramPhoto(frontSource),
    normalizeBodygramPhoto(rightSource),
  ]);
  return {
    photoScan: {
      age: Math.round(body.age!),
      gender: body.gender!,
      height: Math.round(body.heightCm! * 10),
      weight: Math.round(body.weightKg! * 1000),
      frontPhoto,
      rightPhoto,
    },
  };
}

async function normalizeBodygramPhoto(base64: string): Promise<string> {
  return sharp(Buffer.from(base64, "base64"))
    .rotate()
    .resize(1080, 1920, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 },
    })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer()
    .then((buffer) => buffer.toString("base64"));
}

function extractBase64(dataUrl: string): string | null {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl);
  return match?.[1]?.replace(/[\r\n]/g, "") ?? null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function summarizeFailure(status: number, entry: Record<string, unknown> | undefined, text: string): string {
  if (typeof entry?.error === "string") return entry.error;
  if (typeof entry?.message === "string") return entry.message;
  return `Bodygram scan failed (${status}): ${text.slice(0, 240)}`;
}

async function hasSizingLabAccess(request: NextRequest): Promise<boolean> {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return false;
  if (!isSiteAuthEnabled()) return true;
  const token = request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value ?? "";
  return Boolean(token && await verifySiteSessionToken(token));
}
