import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FORMULA_BRANCH_PLACEHOLDER_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

interface BackendSdkRequestBody {
  metrics?: {
    heightCm?: number;
    weightKg?: number;
    gender?: "male" | "female";
    braSize?: { region?: string; band?: number; cup?: string } | null;
  };
  bodyLandmarks?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  let body: BackendSdkRequestBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const metrics = body.metrics;
  if (!metrics?.heightCm || !metrics.weightKg || !metrics.gender) {
    return NextResponse.json({ ok: false, error: "heightCm, weightKg, and gender are required." }, { status: 400 });
  }
  if (!body.bodyLandmarks || typeof body.bodyLandmarks !== "object") {
    return NextResponse.json({ ok: false, error: "bodyLandmarks are required. Run MediaPipe first." }, { status: 400 });
  }

  const baseUrl = getBackendBaseUrl();
  const apiKey = getSdkApiKey();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Missing SDK API key for backend sizing call." }, { status: 500 });
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const recommendPayload = {
    method: "photo",
    locale: "US",
    sizingUnit: "cm",
    product: {
      title: "AI Sizing Lab SDK Formula Check",
      productId: "sizing-lab-sdk-backend-formula-check",
      category: "apparel",
      subcategory: "apparel",
      productFitType: "apparel",
      productType: "apparel",
      description: "Test Lab apparel product used to call the same backend sizing route as the SDK.",
      tags: ["apparel", "sizing-lab"],
    },
    bodyImage: FORMULA_BRANCH_PLACEHOLDER_IMAGE,
    bodyLandmarks: body.bodyLandmarks,
    quickEstimate: {
      height: cmToIn(metrics.heightCm),
      weight: kgToLb(metrics.weightKg),
      heightUnit: "in",
      weightUnit: "lbs",
      gender: metrics.gender,
    },
    sizeGuide: buildSizeGuide(),
    ...(metrics.gender === "female" && metrics.braSize?.band && metrics.braSize?.cup
      ? { braSize: normalizeBraSize(metrics.braSize) }
      : {}),
  };

  const stages = [];
  const recommend = await postBackend({
    name: "backend.sizing.recommend",
    url: `${baseUrl}/api/v1/sizing/recommend`,
    headers,
    payload: recommendPayload,
  });
  stages.push(recommend.stage);

  return NextResponse.json({
    ok: recommend.ok,
    error: recommend.ok ? undefined : summarizeBackendFailure(recommend.stage),
    baseUrl,
    estimate: null,
    recommend: recommend.data,
    stages,
    requestSummary: {
      fields: buildSizeGuide().requiredFields.map((field) => field.key),
      landmarkCount: Object.keys(body.bodyLandmarks).filter((key) => key !== "imageWidth" && key !== "imageHeight").length,
      imageWidth: Number(body.bodyLandmarks.imageWidth) || 0,
      imageHeight: Number(body.bodyLandmarks.imageHeight) || 0,
      heightCm: metrics.heightCm,
      weightKg: metrics.weightKg,
      gender: metrics.gender,
      sdkHeightIn: recommendPayload.quickEstimate.height,
      sdkWeightLb: recommendPayload.quickEstimate.weight,
      braSize: metrics.gender === "female" && metrics.braSize?.band && metrics.braSize?.cup
        ? `${metrics.braSize.region ?? "US"} ${metrics.braSize.band}${metrics.braSize.cup}`
        : undefined,
    },
    rawPayloads: {
      recommend: summarizePayload(recommendPayload),
    },
  }, { status: recommend.ok ? 200 : 502 });
}

async function postBackend(args: {
  name: string;
  url: string;
  headers: Record<string, string>;
  payload: unknown;
}) {
  const startedAt = Date.now();
  try {
    const response = await fetch(args.url, {
      method: "POST",
      headers: args.headers,
      body: JSON.stringify(args.payload),
      cache: "no-store",
    });
    const text = await response.text();
    const data = parseJson(text);
    return {
      ok: response.ok,
      data,
      stage: {
        name: args.name,
        url: args.url,
        ok: response.ok,
        status: response.status,
        latencyMs: Date.now() - startedAt,
        detail: summarizeResponse(data, text),
      },
    };
  } catch (error) {
    return {
      ok: false,
      data: { error: "BACKEND_REQUEST_FAILED", message: getErrorMessage(error) },
      stage: {
        name: args.name,
        url: args.url,
        ok: false,
        status: 0,
        latencyMs: Date.now() - startedAt,
        detail: getErrorMessage(error),
      },
    };
  }
}

function buildSizeGuide() {
  return {
    found: true,
    title: "AI Sizing Lab Apparel Chart",
    headers: ["Size", "Chest (cm)", "Waist (cm)", "Hips (cm)", "Shoulder (cm)", "Inseam (cm)"],
    rows: [
      ["XS", "80-88", "64-72", "84-92", "36-40", "72-76"],
      ["S", "88-96", "72-80", "92-100", "40-44", "76-80"],
      ["M", "96-104", "80-88", "100-108", "44-48", "80-84"],
      ["L", "104-112", "88-98", "108-118", "48-52", "84-88"],
      ["XL", "112-124", "98-110", "118-130", "52-56", "88-92"],
      ["XXL", "124-136", "110-124", "130-144", "56-60", "92-96"],
    ],
    requiredFields: [
      { key: "chest", label: "Chest", unit: "cm" },
      { key: "waist", label: "Waist", unit: "cm" },
      { key: "hips", label: "Hips", unit: "cm" },
      { key: "shoulderWidth", label: "Shoulder", unit: "cm" },
      { key: "inseam", label: "Inseam", unit: "cm" },
    ],
    unit: "cm",
  };
}

function normalizeBraSize(braSize: NonNullable<NonNullable<BackendSdkRequestBody["metrics"]>["braSize"]>) {
  return {
    band: Number(braSize.band),
    cup: String(braSize.cup).trim().toUpperCase(),
    region: String(braSize.region ?? "US").toUpperCase(),
  };
}

function cmToIn(value: number): number {
  return round(value / 2.54, 2);
}

function kgToLb(value: number): number {
  return round(value * 2.2046226218, 1);
}

function round(value: number, digits: number): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function summarizePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const cloned = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  if (typeof cloned.bodyImage === "string") {
    cloned.bodyImage = `[image data URL, ${Math.round(cloned.bodyImage.length * 0.75 / 1024)} KB approx]`;
  }
  return cloned;
}

function summarizeResponse(data: unknown, text: string): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const estimates = record.estimates && typeof record.estimates === "object"
      ? Object.entries(record.estimates as Record<string, unknown>)
          .map(([key, value]) => `${key}=${value}`)
          .join(", ")
      : "";
    const recommendedSize = typeof record.recommendedSize === "string" ? `recommendedSize=${record.recommendedSize}` : "";
    const error = typeof record.error === "string" ? record.error : "";
    return [recommendedSize, estimates, error].filter(Boolean).join("; ") || text.slice(0, 220);
  }
  return text.slice(0, 220);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
}

async function hasSizingLabAccess(request: NextRequest): Promise<boolean> {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return false;
  if (!isSiteAuthEnabled()) return true;

  const token = request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value ?? "";
  if (!token) return false;
  return Boolean(await verifySiteSessionToken(token));
}


function getBackendBaseUrl(): string {
  return (
    process.env.PRIMESTYLE_API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_PRIMESTYLE_API_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

function getSdkApiKey(): string {
  return (
    process.env.NEXT_PUBLIC_PRIMESTYLE_API_KEY ||
    process.env.NEXT_PUBLIC_API_KEY ||
    process.env.PRIMESTYLE_API_KEY ||
    process.env.PS_API_KEY ||
    ""
  );
}

function summarizeBackendFailure(stage: { url: string; status: number; detail: string }): string {
  if (stage.status === 0) {
    return `Cannot reach backend ${originFromUrl(stage.url)}: ${stage.detail}`;
  }
  return `Backend /api/v1/sizing/recommend failed (${stage.status}): ${stage.detail}`;
}

function originFromUrl(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown backend SDK sizing error";
}
