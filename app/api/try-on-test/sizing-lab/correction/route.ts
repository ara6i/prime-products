import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Modality,
  type GenerateContentConfig,
  type Part,
} from "@google/genai";
import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import {
  DEFAULT_SIZING_LAB_GEMINI_CORRECTION_PROMPT,
  type GeminiMeasurementCorrection,
} from "@/app/try-on-test/sizing-lab/lib/geminiMeasurementCorrection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PROMPT_CHARS = 8000;
const MAX_LANDMARKS = 33;

interface CorrectionRequestBody {
  originalImageDataUrl?: string;
  normalizedImageDataUrl?: string;
  model?: string;
  prompt?: string;
  context?: unknown;
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  let body: CorrectionRequestBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const original = parseDataUrl(body.originalImageDataUrl ?? "");
  if (!original) {
    return NextResponse.json({ ok: false, error: "originalImageDataUrl must be a base64 image data URL." }, { status: 400 });
  }
  const normalized = parseDataUrl(body.normalizedImageDataUrl ?? "");
  if (!normalized) {
    return NextResponse.json({ ok: false, error: "normalizedImageDataUrl must be a base64 image data URL." }, { status: 400 });
  }
  if (Buffer.byteLength(original.base64, "base64") > MAX_IMAGE_BYTES || Buffer.byteLength(normalized.base64, "base64") > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image is too large for Gemini measurement correction." }, { status: 413 });
  }

  const prompt = resolvePrompt(body.prompt);
  if (!prompt) {
    return NextResponse.json({ ok: false, error: `Gemini correction prompt must be ${MAX_PROMPT_CHARS} characters or less.` }, { status: 400 });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Missing Gemini key. Set SIZING_LAB_GEMINI_API_KEY, TEST_LAB_GEMINI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY." },
      { status: 500 },
    );
  }

  const startedAt = performance.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = body.model?.trim() || process.env.SIZING_LAB_GEMINI_CORRECTION_MODEL || DEFAULT_MODEL;
    const response = await ai.models.generateContent({
      model,
      contents: buildContents(original, normalized, prompt, body.context),
      config: buildConfig(model),
    });
    const text = response.text ?? "";
    const correction = parseCorrectionJson(text);
    if (!correction) {
      return NextResponse.json({ ok: false, error: "Gemini did not return usable correction JSON.", rawText: text.slice(0, 2000) }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      correction,
      rawText: text,
      model,
      geminiMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 502 });
  }
}

async function hasSizingLabAccess(request: NextRequest): Promise<boolean> {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return false;
  if (!isSiteAuthEnabled()) return true;

  const token = request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value ?? "";
  if (!token) return false;
  return Boolean(await verifySiteSessionToken(token));
}

function parseDataUrl(value: string): { mimeType: string; base64: string } | null {
  const match = value.match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-zA-Z0-9+/=\s]+)$/);
  if (!match) return null;
  return {
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
    base64: match[2].replace(/\s/g, ""),
  };
}

function resolvePrompt(requestedPrompt?: string): string | null {
  const prompt = typeof requestedPrompt === "string" && requestedPrompt.trim()
    ? requestedPrompt.trim()
    : DEFAULT_SIZING_LAB_GEMINI_CORRECTION_PROMPT;
  return prompt.length <= MAX_PROMPT_CHARS ? prompt : null;
}

function buildContents(
  original: { mimeType: string; base64: string },
  normalized: { mimeType: string; base64: string },
  prompt: string,
  context: unknown,
): Part[] {
  return [
    { text: prompt },
    { text: "Measurement context JSON:" },
    { text: JSON.stringify(limitContext(context)) },
    { text: "Image 1: original user photo. Treat this as visual truth for body shape." },
    { inlineData: { mimeType: original.mimeType, data: original.base64 } },
    { text: "Image 2: Gemini normalized measurement image. MediaPipe produced the raw measurements from this image." },
    { inlineData: { mimeType: normalized.mimeType, data: normalized.base64 } },
  ];
}

function limitContext(context: unknown): unknown {
  if (!context || typeof context !== "object") return {};
  const record = context as Record<string, unknown>;
  const landmarks = Array.isArray(record.landmarks)
    ? record.landmarks.slice(0, MAX_LANDMARKS)
    : [];
  return {
    ...record,
    landmarks,
  };
}

function buildConfig(model: string): GenerateContentConfig {
  const config: GenerateContentConfig = {
    temperature: 0.05,
    topP: 0.4,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  };
  if (model.includes("-image")) {
    config.responseModalities = [Modality.TEXT];
  }
  if (supportsJsonMime(model)) {
    config.responseMimeType = "application/json";
  }
  return config;
}

function supportsJsonMime(model: string): boolean {
  if (!model.includes("-image")) return true;
  return model === "gemini-2.5-flash-image" || model === "gemini-3-pro-image";
}

function parseCorrectionJson(text: string): GeminiMeasurementCorrection | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as GeminiMeasurementCorrection;
    if (!isCorrectionRow(parsed.waist) && !isCorrectionRow(parsed.hips)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isCorrectionRow(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.raw_cm === "number" &&
    typeof row.corrected_cm === "number" &&
    typeof row.delta_cm === "number" &&
    typeof row.confidence === "number"
  );
}

function getGeminiApiKey(): string {
  const direct =
    process.env.SIZING_LAB_GEMINI_API_KEY ||
    process.env.TEST_LAB_GOOGLE_API_KEY ||
    process.env.TEST_LAB_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";
  if (direct) return direct;

  const backendEnvPath = path.resolve(process.cwd(), "../primeStyleAI-backend/.env");
  if (!existsSync(backendEnvPath)) return "";
  const parsed = parseEnvFile(readFileSync(backendEnvPath, "utf8"));
  return (
    parsed.SIZING_LAB_GEMINI_API_KEY ||
    parsed.TEST_LAB_GOOGLE_API_KEY ||
    parsed.TEST_LAB_GEMINI_API_KEY ||
    parsed.GEMINI_API_KEY ||
    parsed.GOOGLE_API_KEY ||
    ""
  );
}

function parseEnvFile(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}
