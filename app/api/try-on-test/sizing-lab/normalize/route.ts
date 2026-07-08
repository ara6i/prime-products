import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  type GenerateContentConfig,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { DEFAULT_SIZING_LAB_GEMINI_PROMPT } from "@/app/try-on-test/sizing-lab/lib/geminiNormalizePrompt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GEMINI_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image",
  "gemini-3-pro-image",
] as const;
type GeminiImageModel = (typeof GEMINI_IMAGE_MODELS)[number];

const DEFAULT_MODEL: GeminiImageModel = "gemini-3.1-flash-image";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PROMPT_CHARS = 8000;
const A_POSE_REFERENCE_PATH = path.resolve(process.cwd(), "public/try-on-test/sizing-lab/a-pose-reference.png");

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  let body: { imageDataUrl?: string; model?: string; prompt?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const model = resolveGeminiModel(body.model);
  if (!model) {
    return NextResponse.json(
      { ok: false, error: `Unsupported Gemini image model. Use one of: ${GEMINI_IMAGE_MODELS.join(", ")}` },
      { status: 400 },
    );
  }

  const parsed = parseDataUrl(body.imageDataUrl ?? "");
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "imageDataUrl must be a base64 image data URL." }, { status: 400 });
  }
  if (Buffer.byteLength(parsed.base64, "base64") > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image is too large for Sizing Lab normalization." }, { status: 413 });
  }
  const prompt = resolvePrompt(body.prompt);
  if (!prompt) {
    return NextResponse.json({ ok: false, error: `Gemini prompt must be ${MAX_PROMPT_CHARS} characters or less.` }, { status: 400 });
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
    const response = await generateContentWithPersonGenerationFallback(ai, {
      model,
      contents: buildContents(parsed.mimeType, parsed.base64, prompt),
      config: buildConfig(),
    });
    const image = extractImage(response);
    if (!image) {
      return NextResponse.json({ ok: false, error: "Gemini did not return a normalized image." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      imageDataUrl: `data:${image.mimeType};base64,${image.base64}`,
      mimeType: image.mimeType,
      model,
      prompt,
      geminiMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 502 });
  }
}

function resolveGeminiModel(requestedModel?: string): GeminiImageModel | null {
  if (requestedModel) {
    return isGeminiImageModel(requestedModel) ? requestedModel : null;
  }
  const envModel = process.env.SIZING_LAB_GEMINI_MODEL;
  if (envModel && isGeminiImageModel(envModel)) return envModel;
  return DEFAULT_MODEL;
}

function isGeminiImageModel(model: string): model is GeminiImageModel {
  return (GEMINI_IMAGE_MODELS as readonly string[]).includes(model);
}

function resolvePrompt(requestedPrompt?: string): string | null {
  const prompt = typeof requestedPrompt === "string" && requestedPrompt.trim()
    ? requestedPrompt.trim()
    : DEFAULT_SIZING_LAB_GEMINI_PROMPT;
  return prompt.length <= MAX_PROMPT_CHARS ? prompt : null;
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

function buildContents(mimeType: string, data: string, prompt: string): Part[] {
  const poseReference = getAPoseReference();
  return [
    { text: prompt },
    { text: "Image 1: user photo to normalize." },
    { inlineData: { mimeType, data } },
    { text: "Image 2: arm/hand pose reference only." },
    { inlineData: poseReference },
  ];
}

function getAPoseReference(): { mimeType: string; data: string } {
  if (!existsSync(A_POSE_REFERENCE_PATH)) {
    throw new Error("Missing Sizing Lab A-pose reference image.");
  }
  return {
    mimeType: "image/png",
    data: readFileSync(A_POSE_REFERENCE_PATH).toString("base64"),
  };
}

function buildConfig(): GenerateContentConfig {
  return {
    responseModalities: ["TEXT", "IMAGE"],
    temperature: 0.15,
    topP: 0.85,
    imageConfig: {
      imageSize: "1K",
      personGeneration: "ALLOW_ADULT",
    },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  };
}

async function generateContentWithPersonGenerationFallback(
  ai: GoogleGenAI,
  input: { model: string; contents: Part[]; config: GenerateContentConfig },
): Promise<GenerateContentResponse> {
  try {
    return await ai.models.generateContent(input);
  } catch (error) {
    if (!isPersonGenerationUnsupportedError(error)) throw error;
    const imageConfig = { ...input.config.imageConfig };
    delete imageConfig.personGeneration;
    return ai.models.generateContent({
      ...input,
      config: { ...input.config, imageConfig },
    });
  }
}

function isPersonGenerationUnsupportedError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("persongeneration") &&
    (message.includes("enterprise") || message.includes("developer api") || message.includes("unsupported") || message.includes("not supported"))
  );
}

function extractImage(response: GenerateContentResponse): { base64: string; mimeType: string } | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => Boolean(part.inlineData?.data));
  const base64 = imagePart?.inlineData?.data;
  if (!base64) return null;
  return {
    base64,
    mimeType: imagePart.inlineData?.mimeType || "image/png",
  };
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
