import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  type GenerateContentConfig,
  Modality,
  type Part,
} from "@google/genai";
import { NextResponse, type NextRequest } from "next/server";
import { isSiteAuthEnabled, SITE_AUTH_COOKIE_NAME, verifySiteSessionToken } from "@/app/shared/auth/siteSession";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import {
  DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT,
  DEFAULT_SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT,
  NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT,
  NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION,
  NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT,
  NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION,
  SIZING_LAB_GEMINI_GUIDE_PROMPT_VERSION,
  SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT_VERSION,
  type GeminiBodyGuide,
} from "@/app/try-on-test/sizing-lab/lib/geminiGuide";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PROMPT_CHARS = 8000;
const MAX_LANDMARKS = 33;
const LINE_DETECTION_CONFIDENCE = 0.9;
const MAX_GUIDE_IMAGE_ATTEMPTS = 1;
const DEFAULT_GEMINI_GUIDE_TIMEOUT_MS = 45_000;

interface GuideModelResult {
  text: string;
  annotatedImage: { mimeType: string; base64: string } | null;
}

interface GuideRequestBody {
  imageDataUrl?: string;
  model?: string;
  prompt?: string;
  guideMode?: "front" | "side";
  datasetSetId?: string;
  imageWidth?: number;
  imageHeight?: number;
  inputImageWidth?: number;
  inputImageHeight?: number;
  metrics?: {
    heightCm?: number;
    weightKg?: number;
    gender?: string;
  };
  landmarks?: Array<{
    id?: number;
    name?: string;
    x_px?: number;
    y_px?: number;
    x_norm?: number;
    y_norm?: number;
    z?: number;
    visibility?: number;
  }>;
}

export async function POST(request: NextRequest) {
  if (!(await hasSizingLabAccess(request))) {
    return NextResponse.json({ ok: false, error: "Sizing Lab is not available for this host." }, { status: 403 });
  }

  let body: GuideRequestBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedOriginal = parseDataUrl(body.imageDataUrl ?? "");
  if (!parsedOriginal) {
    return NextResponse.json({ ok: false, error: "imageDataUrl must be a base64 image data URL." }, { status: 400 });
  }
  if (Buffer.byteLength(parsedOriginal.base64, "base64") > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image is too large for Gemini curve guide." }, { status: 413 });
  }

  const promptIsCustom = typeof body.prompt === "string" && body.prompt.trim().length > 0;
  const basePrompt = resolvePrompt(body.prompt, body.guideMode);
  if (!basePrompt) {
    return NextResponse.json({ ok: false, error: `Gemini guide prompt must be ${MAX_PROMPT_CHARS} characters or less.` }, { status: 400 });
  }
  const promptOverride = promptIsCustom ? null : resolveDatasetPromptOverride(body);
  const prompt = promptOverride ? promptOverride.prompt : basePrompt;
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json({ ok: false, error: `Gemini guide prompt must be ${MAX_PROMPT_CHARS} characters or less.` }, { status: 400 });
  }
  const basePromptSource = promptIsCustom ? "custom" : body.guideMode === "side" ? "side-default" : "default";
  const basePromptVersion = promptIsCustom ? "custom" : resolvePromptVersion(body.guideMode);
  const promptSource = promptOverride ? promptOverride.source : basePromptSource;
  const promptVersion = promptOverride ? promptOverride.version : basePromptVersion;

  const startedAt = performance.now();
  let prepareMs = 0;
  let geminiRoundTripMs = 0;
  let redDetectMs = 0;
  try {
    const model = body.model?.trim() || process.env.SIZING_LAB_GEMINI_GUIDE_MODEL || DEFAULT_MODEL;
    const promptPreview = isImageGuideModel(model)
      ? model.startsWith("openai:")
        ? buildOpenAiImageGuidePrompt(prompt, body).slice(0, 700)
        : buildImageAndJsonGuidePrompt(prompt).slice(0, 700)
      : prompt.slice(0, 700);
    const prepareStartedAt = performance.now();
    const griddedOriginal = await buildGridOverlayImage(parsedOriginal, body);
    const geminiInputImage = griddedOriginal ?? parsedOriginal;
    prepareMs = Math.round(performance.now() - prepareStartedAt);
    const requestStartedAt = performance.now();
    const result = model.startsWith("openai:")
      ? await callOpenAiGuide({
          model: model.replace(/^openai:/, ""),
          original: parsedOriginal,
          gridded: griddedOriginal,
          prompt,
          body,
        })
      : await callGeminiGuide({
          model,
          original: parsedOriginal,
          gridded: griddedOriginal,
          prompt,
          body,
        });
    geminiRoundTripMs += Math.round(performance.now() - requestStartedAt);

    let rawText = result.text;
    let annotatedImage = result.annotatedImage;
    const detectStartedAt = performance.now();
    let guideFromImage = annotatedImage
      ? await detectGuideFromAnnotatedImage(annotatedImage, body, prompt)
      : null;
    redDetectMs += Math.round(performance.now() - detectStartedAt);
    let guideFromText = scaleGuideToOriginal(parseGuideJson(rawText), body);
    if (isImageGuideModel(model) && !guideFromImage) {
      for (let attempt = 2; attempt <= MAX_GUIDE_IMAGE_ATTEMPTS && !guideFromImage; attempt += 1) {
        const retryStartedAt = performance.now();
        const retry = await callGuideImageOnly({
          model,
          original: parsedOriginal,
          gridded: griddedOriginal,
          prompt,
          body,
        }).catch(() => null);
        geminiRoundTripMs += Math.round(performance.now() - retryStartedAt);
        if (!retry) continue;
        if (retry.text.trim()) {
          rawText = [rawText, `\n\n[image retry ${attempt}]\n`, retry.text].join("");
          guideFromText = scaleGuideToOriginal(parseGuideJson(rawText), body);
        }
        if (retry.annotatedImage) {
          annotatedImage = retry.annotatedImage;
          const retryDetectStartedAt = performance.now();
          guideFromImage = await detectGuideFromAnnotatedImage(retry.annotatedImage, body, prompt);
          redDetectMs += Math.round(performance.now() - retryDetectStartedAt);
        }
      }
    }
    const timingPayload = () => buildTimingPayload(startedAt, prepareMs, geminiRoundTripMs, redDetectMs);
    const outputImage = annotatedImage ? await buildOutputImageDebug(annotatedImage) : null;
    if (isImageGuideModel(model) && !guideFromImage && !guideFromText) {
      return NextResponse.json({
        ok: false,
        error: annotatedImage
          ? `Guide image model returned an image, but the lab did not find the required three waist/trouser-waist/hip red curves after ${MAX_GUIDE_IMAGE_ATTEMPTS} attempt(s), and no usable JSON coordinates were returned.`
          : `Guide image model did not return a usable annotated image after ${MAX_GUIDE_IMAGE_ATTEMPTS} attempt(s), and no usable JSON coordinates were returned.`,
        rawText: rawText.slice(0, 2000),
        guideImageDataUrl: annotatedImage ? `data:${annotatedImage.mimeType};base64,${annotatedImage.base64}` : null,
        gridImageDataUrl: griddedOriginal ? `data:${griddedOriginal.mimeType};base64,${griddedOriginal.base64}` : null,
        returnedText: Boolean(rawText.trim()),
        returnedImage: Boolean(annotatedImage),
        guideSource: "red-pixel-detector-failed",
        promptSource,
        promptVersion,
        promptPreview,
        outputImage,
        geminiMs: Math.round(performance.now() - startedAt),
        timings: timingPayload(),
        inputImage: buildServerInputImageDebug(geminiInputImage, body),
        guideCandidates: {
          redPixel: guideFromImage,
          geminiJson: guideFromText,
        },
      }, { status: 502 });
    }
    const usedImageJsonFallback = isImageGuideModel(model) && !guideFromImage && Boolean(guideFromText);
    const mergedGuide = usedImageJsonFallback && guideFromText
      ? { guide: guideFromText, source: "gemini-json-red-pixel-fallback" }
      : mergeGuideSources(guideFromImage, guideFromText);
    if (!mergedGuide) {
      return NextResponse.json({
        ok: false,
        error: annotatedImage
          ? "Guide model returned an image, but the lab could not detect the red curved waist/trouser-waist/hip lines."
          : "Guide model did not return usable coordinate JSON.",
        rawText: rawText.slice(0, 2000),
        guideImageDataUrl: annotatedImage ? `data:${annotatedImage.mimeType};base64,${annotatedImage.base64}` : null,
        gridImageDataUrl: griddedOriginal ? `data:${griddedOriginal.mimeType};base64,${griddedOriginal.base64}` : null,
        returnedText: Boolean(rawText.trim()),
        returnedImage: Boolean(annotatedImage),
        guideSource: annotatedImage ? "red-pixel-detector-failed" : "gemini-json-failed",
        promptSource,
        promptVersion,
        promptPreview,
        outputImage,
        geminiMs: Math.round(performance.now() - startedAt),
        timings: timingPayload(),
        inputImage: buildServerInputImageDebug(geminiInputImage, body),
        guideCandidates: {
          redPixel: guideFromImage,
          geminiJson: guideFromText,
        },
      }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      guide: mergedGuide.guide,
      rawText,
      model,
      promptSource,
      promptVersion,
      promptPreview,
      outputImage,
      guideSource: mergedGuide.source,
      warning: usedImageJsonFallback
        ? `Red-pixel detector did not find three valid curves in the returned image after ${MAX_GUIDE_IMAGE_ATTEMPTS} attempt(s). Using Gemini JSON coordinates as fallback.`
        : null,
      returnedText: Boolean(rawText.trim()),
      returnedImage: Boolean(annotatedImage),
      gridImageDataUrl: griddedOriginal ? `data:${griddedOriginal.mimeType};base64,${griddedOriginal.base64}` : null,
      guideImageDataUrl: annotatedImage ? `data:${annotatedImage.mimeType};base64,${annotatedImage.base64}` : null,
      geminiMs: Math.round(performance.now() - startedAt),
      timings: timingPayload(),
      inputImage: buildServerInputImageDebug(geminiInputImage, body),
      guideCandidates: {
        redPixel: guideFromImage,
        geminiJson: guideFromText,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 502 });
  }
}

function mergeGuideSources(
  guideFromImage: GeminiBodyGuide | null,
  guideFromText: GeminiBodyGuide | null,
): { guide: GeminiBodyGuide; source: string } | null {
  if (!guideFromImage && !guideFromText) return null;
  if (guideFromImage) {
    return {
      guide: {
        ...guideFromImage,
        occlusion: guideFromImage.occlusion ?? guideFromText?.occlusion,
        notes: guideFromImage.notes ?? guideFromText?.notes,
      },
      source: guideFromText ? "red-pixel-detector+gemini-json" : "red-pixel-detector",
    };
  }
  if (guideFromText) {
    return {
      guide: {
        ...guideFromText,
        occlusion: guideFromText.occlusion,
        notes: guideFromText.notes,
      },
      source: "gemini-json",
    };
  }
  return null;
}

async function callGeminiGuide(args: {
  model: string;
  original: { mimeType: string; base64: string };
  gridded: { mimeType: string; base64: string } | null;
  prompt: string;
  body: GuideRequestBody;
}): Promise<GuideModelResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Missing Gemini key. Set SIZING_LAB_GEMINI_API_KEY, TEST_LAB_GEMINI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const timeoutMs = getGeminiGuideTimeoutMs();
  if (args.model.includes("-image")) {
    const response = await withTimeout(
      ai.models.generateContent({
        model: args.model,
        contents: buildContents(args.original, args.gridded, buildImageAndJsonGuidePrompt(args.prompt), args.body),
        config: buildImageConfig(args.model),
      }),
      timeoutMs,
      "Gemini curve guide",
    );
    return {
      text: response.text ?? "",
      annotatedImage: extractGeminiInlineImage(response),
    };
  }

  const response = await withTimeout(
    ai.models.generateContent({
      model: args.model,
      contents: buildContents(args.original, args.gridded, args.prompt, args.body),
      config: buildConfig(args.model),
    }),
    timeoutMs,
    "Gemini coordinate guide",
  );
  return {
    text: response.text ?? "",
    annotatedImage: extractGeminiInlineImage(response),
  };
}

function buildImageAndJsonGuidePrompt(coordinatePrompt: string): string {
  return [
    "Single-response image annotation plus coordinate task.",
    "Return both outputs in this same response:",
    "1. An edited version of the grid overlay image with exactly three thick red curved lines.",
    "2. JSON text with coordinates for those exact same red curves, using the keys requested by the coordinate task context.",
    "If the coordinate task context requests line 1, line 2, and line 3 keys, use those exact keys.",
    "If the coordinate task context specifies exact grid y_px rows, those exact rows override MediaPipe landmarks and anatomical guesses.",
    "Do not return image-only. Do not return JSON-only unless the model is technically unable to return an image.",
    "The JSON points must sit on the red pixels you draw. If they disagree, the response is wrong.",
    "Use the grid overlay image sent-pixel coordinates, not original camera pixels.",
    "",
    coordinatePrompt,
  ].join("\n");
}

async function callGeminiGuideImageOnly(args: {
  model: string;
  original: { mimeType: string; base64: string };
  gridded: { mimeType: string; base64: string } | null;
  prompt: string;
  body: GuideRequestBody;
}): Promise<GuideModelResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Missing Gemini key. Set SIZING_LAB_GEMINI_API_KEY, TEST_LAB_GEMINI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(
    ai.models.generateContent({
      model: args.model,
      contents: buildContents(args.original, args.gridded, buildImageOnlyGuidePrompt(args.prompt), args.body),
      config: buildImageConfig(args.model),
    }),
    getGeminiGuideTimeoutMs(),
    "Gemini curve guide image retry",
  );
  return {
    text: response.text ?? "",
    annotatedImage: extractGeminiInlineImage(response),
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getGeminiGuideTimeoutMs(): number {
  const requested = Number(process.env.SIZING_LAB_GEMINI_GUIDE_TIMEOUT_MS);
  if (Number.isFinite(requested) && requested >= 5_000 && requested <= 120_000) return requested;
  return DEFAULT_GEMINI_GUIDE_TIMEOUT_MS;
}

async function callGuideImageOnly(args: {
  model: string;
  original: { mimeType: string; base64: string };
  gridded: { mimeType: string; base64: string } | null;
  prompt: string;
  body: GuideRequestBody;
}): Promise<GuideModelResult> {
  if (args.model.startsWith("openai:")) {
    return callOpenAiGuideImageOnly({
      ...args,
      model: args.model.replace(/^openai:/, ""),
    });
  }
  return callGeminiGuideImageOnly(args);
}

function buildImageOnlyGuidePrompt(coordinatePrompt: string): string {
  return [
    "Image annotation task. Return an annotated IMAGE of the grid overlay image. JSON-only text is not acceptable for this pass.",
    "Before drawing, use the source photo to locate the body, then draw on the grid overlay image.",
    "Draw exactly the three red guide curves defined by the coordinate task context below.",
    "The coordinate task context defines whether this is a front guide or side-profile depth guide.",
    "Do not add labels, arrows, dots, helper lines, masks, measurements, or extra colored marks.",
    "Preserve the grid overlay image content. Do not crop, gray out, recolor, blur, mask, or remove the person/grid; only add the three red curves.",
    "Do not return only text. The response must include the edited grid overlay image with the red curves.",
    "",
    "Coordinate task context:",
    coordinatePrompt,
  ].join("\n");
}

async function callOpenAiGuide(args: {
  model: string;
  original: { mimeType: string; base64: string };
  gridded: { mimeType: string; base64: string } | null;
  prompt: string;
  body: GuideRequestBody;
}): Promise<GuideModelResult> {
  if (isOpenAiImageModel(args.model)) {
    return callOpenAiImageGuide(args, false);
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("Missing OpenAI key. Set OPENAI_API_KEY in frontend env or backend .env.");
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: args.model,
      max_output_tokens: 2500,
      text: { format: buildOpenAiGuideJsonSchema() },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: [args.prompt, formatGuideContext(args.body)].join("\n\n") },
            { type: "input_image", image_url: `data:${args.original.mimeType};base64,${args.original.base64}` },
            ...(args.gridded ? [{ type: "input_image", image_url: `data:${args.gridded.mimeType};base64,${args.gridded.base64}` }] : []),
          ],
        },
      ],
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    throw new Error(extractOpenAiError(payload) || `OpenAI guide request failed (${response.status})`);
  }
  const text = extractOpenAiText(payload);
  return {
    text: text || JSON.stringify(payload)?.slice(0, 4000) || "",
    annotatedImage: null,
  };
}

async function callOpenAiGuideImageOnly(args: {
  model: string;
  original: { mimeType: string; base64: string };
  gridded: { mimeType: string; base64: string } | null;
  prompt: string;
  body: GuideRequestBody;
}): Promise<GuideModelResult> {
  return callOpenAiImageGuide(args, true);
}

async function callOpenAiImageGuide(
  args: {
    model: string;
    original: { mimeType: string; base64: string };
    gridded: { mimeType: string; base64: string } | null;
    prompt: string;
    body: GuideRequestBody;
  },
  imageOnly: boolean,
): Promise<GuideModelResult> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("Missing OpenAI key. Set OPENAI_API_KEY in frontend env or backend .env.");
  }

  const form = new FormData();
  form.append("model", args.model);
  form.append("prompt", imageOnly ? buildImageOnlyGuidePrompt(args.prompt) : buildOpenAiImageGuidePrompt(args.prompt, args.body));
  form.append("quality", "medium");

  const images = args.gridded ? [args.original, args.gridded] : [args.original];
  images.forEach((image, index) => {
    form.append(
      "image[]",
      new Blob([Buffer.from(image.base64, "base64")], { type: image.mimeType }),
      index === 0 ? "source.png" : "grid.png",
    );
  });

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    throw new Error(extractOpenAiError(payload) || `OpenAI image guide request failed (${response.status})`);
  }
  const base64 = extractOpenAiImageBase64(payload);
  if (!base64) {
    throw new Error("OpenAI image guide did not return b64_json image data.");
  }
  return {
    text: extractOpenAiText(payload),
    annotatedImage: {
      mimeType: "image/png",
      base64,
    },
  };
}

function buildOpenAiImageGuidePrompt(coordinatePrompt: string, body: GuideRequestBody): string {
  return [
    "Image edit task. Return an edited image, not coordinate JSON.",
    "You may receive two reference images of the same person:",
    "Image 1 = source photo. Use it to understand the body without the grid.",
    "Image 2 = the same source photo with the pixel grid overlay. Return an edited version of Image 2.",
    "If only one image is present, use that image for both visual reading and the output image.",
    "Preserve the grid overlay image content. Do not crop, gray out, recolor, blur, mask, remove, or redraw the person/grid.",
    "Only add exactly the three thick red curved guide lines defined by the coordinate task context below.",
    "The coordinate task context defines whether this is a front guide or side-profile depth guide.",
    "Do not add text labels, arrows, dots, masks, helper lines, measurements, or extra colored marks.",
    "If the coordinate task context specifies exact grid rows or tape marks, use those exact rows.",
    "Exact grid rows override MediaPipe landmarks and anatomical guesses.",
    "Otherwise, choose rows by visible anatomy/clothing meaning only.",
    "",
    "Coordinate context is included only to explain scale and the requested rows. The measurement will come from red pixels in your returned image.",
    formatGuideContext(body),
    "",
    coordinatePrompt,
  ].join("\n");
}

function buildOpenAiGuideJsonSchema() {
  return {
    type: "json_schema",
    name: "sizing_lab_coordinate_guide",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["waist", "trouserWaist", "hips", "occlusion", "notes"],
      properties: {
        waist: { $ref: "#/$defs/line" },
        trouserWaist: { $ref: "#/$defs/line" },
        hips: { $ref: "#/$defs/line" },
        occlusion: {
          type: "object",
          additionalProperties: false,
          required: ["hair_blocks_torso", "hands_near_hips", "loose_clothing"],
          properties: {
            hair_blocks_torso: { type: "boolean" },
            hands_near_hips: { type: "boolean" },
            loose_clothing: { type: "boolean" },
          },
        },
        notes: { type: "string" },
      },
      $defs: {
        line: {
          type: "object",
          additionalProperties: false,
          required: ["y_px", "left_x_px", "right_x_px", "points", "confidence"],
          properties: {
            y_px: { type: "number" },
            left_x_px: { type: "number" },
            right_x_px: { type: "number" },
            points: {
              type: "array",
              minItems: 3,
              maxItems: 7,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["x_px", "y_px"],
                properties: {
                  x_px: { type: "number" },
                  y_px: { type: "number" },
                },
              },
            },
            confidence: { type: "number" },
          },
        },
      },
    },
  };
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

async function buildGridOverlayImage(
  original: { mimeType: string; base64: string },
  body: GuideRequestBody,
): Promise<{ mimeType: string; base64: string } | null> {
  const { inputWidth: width, inputHeight: height } = getGuideCoordinateSpace(body);
  if (width <= 0 || height <= 0) return null;

  try {
    const imageBuffer = Buffer.from(original.base64, "base64");
    const gridSvg = buildGridSvg(width, height);
    const output = await sharp(imageBuffer)
      .resize(width, height, { fit: "fill" })
      .composite([{ input: Buffer.from(gridSvg), blend: "over" }])
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return {
      mimeType: "image/jpeg",
      base64: output.toString("base64"),
    };
  } catch {
    return null;
  }
}

function buildGridSvg(width: number, height: number): string {
  const minor = 25;
  const major = 100;
  const lines: string[] = [];
  for (let x = 0; x <= width; x += minor) {
    const isMajor = x % major === 0;
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${isMajor ? "#00e5ff" : "#00e5ff"}" stroke-width="${isMajor ? 2 : 1}" opacity="${isMajor ? 0.9 : 0.35}"/>`);
    if (isMajor) {
      lines.push(`<text x="${x + 3}" y="14" font-family="monospace" font-size="13" font-weight="700" fill="#001a33" stroke="#ffffff" stroke-width="3" paint-order="stroke">${x}</text>`);
    }
  }
  for (let y = 0; y <= height; y += minor) {
    const isMajor = y % major === 0;
    lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${isMajor ? "#ffea00" : "#ffea00"}" stroke-width="${isMajor ? 2 : 1}" opacity="${isMajor ? 0.9 : 0.35}"/>`);
    if (isMajor) {
      lines.push(`<text x="4" y="${Math.max(14, y - 4)}" font-family="monospace" font-size="13" font-weight="700" fill="#332500" stroke="#ffffff" stroke-width="3" paint-order="stroke">${y}</text>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${lines.join("")}</svg>`;
}

function resolveDefaultPrompt(mode?: GuideRequestBody["guideMode"]): string {
  return mode === "side"
    ? DEFAULT_SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT
    : DEFAULT_SIZING_LAB_GEMINI_GUIDE_PROMPT;
}

function resolvePromptVersion(mode?: GuideRequestBody["guideMode"]): string {
  return mode === "side"
    ? SIZING_LAB_GEMINI_SIDE_GUIDE_PROMPT_VERSION
    : SIZING_LAB_GEMINI_GUIDE_PROMPT_VERSION;
}

function resolvePrompt(requestedPrompt?: string, mode?: GuideRequestBody["guideMode"]): string | null {
  const prompt = typeof requestedPrompt === "string" && requestedPrompt.trim()
    ? requestedPrompt.trim()
    : resolveDefaultPrompt(mode);
  return prompt.length <= MAX_PROMPT_CHARS ? prompt : null;
}

function resolveDatasetPromptOverride(body: GuideRequestBody): { prompt: string; source: string; version: string } | null {
  if (body.guideMode === "side") return null;
  if (body.datasetSetId === "negar-2") {
    return {
      source: "negar-2-meter-rows",
      version: NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION,
      prompt: NEGAR_2_METER_ROW_GEMINI_GUIDE_PROMPT,
    };
  }
  if (body.datasetSetId === "negar-4") {
    return {
      source: "negar-4-meter-rows",
      version: NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT_VERSION,
      prompt: NEGAR_4_METER_ROW_GEMINI_GUIDE_PROMPT,
    };
  }
  return null;
}

function buildContents(
  original: { mimeType: string; base64: string },
  gridded: { mimeType: string; base64: string } | null,
  prompt: string,
  body: GuideRequestBody,
): Part[] {
  const parts: Part[] = [
    { text: prompt },
    { text: formatGuideContext(body) },
    { text: gridded
      ? "Image 1: source photo without grid. Use this to understand the body shape and clothing."
      : "Image 1: source photo. Grid overlay was unavailable, so use this image for both visual reading and coordinates." },
    { inlineData: { mimeType: original.mimeType, data: original.base64 } },
  ];
  if (gridded) {
    parts.push(
      { text: "Image 2: same source photo with pixel grid overlay. Draw the three red curved guide lines on Image 2. Return x_px/y_px coordinates in Image 2 sent pixels." },
      { text: "Grid reading rule for Image 2: cyan vertical lines mark x_px, yellow horizontal lines mark y_px. Thin lines are 25 px apart; bold numbered lines are 100 px apart." },
      { inlineData: { mimeType: gridded.mimeType, data: gridded.base64 } },
    );
  }
  return parts;
}

function formatGuideContext(body: GuideRequestBody): string {
  const {
    inputWidth,
    inputHeight,
    outputWidth,
    outputHeight,
    scaleX,
    scaleY,
  } = getGuideCoordinateSpace(body);
  const metrics = body.metrics ?? {};
  const landmarks = Array.isArray(body.landmarks)
    ? body.landmarks.slice(0, MAX_LANDMARKS).map((landmark) => {
      const xNorm = validNumber(landmark.x_norm) ? landmark.x_norm : null;
      const yNorm = validNumber(landmark.y_norm) ? landmark.y_norm : null;
      const xPx = xNorm != null && inputWidth > 0
        ? Math.round(xNorm * inputWidth)
        : validNumber(landmark.x_px) && scaleX > 0 ? Math.round(landmark.x_px / scaleX) : null;
      const yPx = yNorm != null && inputHeight > 0
        ? Math.round(yNorm * inputHeight)
        : validNumber(landmark.y_px) && scaleY > 0 ? Math.round(landmark.y_px / scaleY) : null;
      return {
        id: validNumber(landmark.id) ? Math.round(landmark.id) : null,
        name: typeof landmark.name === "string" ? landmark.name.slice(0, 40) : "",
        x_px: xPx,
        y_px: yPx,
        x_norm: xNorm != null ? round(xNorm, 4) : null,
        y_norm: yNorm != null ? round(yNorm, 4) : null,
        z: validNumber(landmark.z) ? round(landmark.z, 4) : null,
        visibility: validNumber(landmark.visibility) ? round(landmark.visibility, 3) : null,
      };
    })
    : [];

  return [
    "Coordinate context:",
    "If Image 2 grid overlay is present, return coordinates in Image 2 sent pixels. If Image 2 is absent, return coordinates in Image 1 sent pixels.",
    `coordinate_image_sent_size_px: ${inputWidth || "unknown"} x ${inputHeight || "unknown"}`,
    `original_measurement_size_px: ${outputWidth || "unknown"} x ${outputHeight || "unknown"}`,
    `lab_coordinate_scale_back_to_original: x * ${round(scaleX || 1, 5)}, y * ${round(scaleY || 1, 5)}`,
    "Return x_px/y_px in coordinate image sent pixels, not original camera pixels. The lab scales them back to original_measurement_size_px.",
    `person_metrics: height_cm=${validNumber(metrics.heightCm) ? metrics.heightCm : "unknown"}, weight_kg=${validNumber(metrics.weightKg) ? metrics.weightKg : "unknown"}, gender=${typeof metrics.gender === "string" ? metrics.gender : "unknown"}`,
    "mediapipe_landmarks_json:",
    JSON.stringify(landmarks),
  ].join("\n");
}

function buildConfig(model: string): GenerateContentConfig {
  if (model.includes("-image")) return buildImageConfig(model);
  return buildTextConfig(model);
}

function isImageGuideModel(model: string): boolean {
  if (model.startsWith("openai:")) {
    return isOpenAiImageModel(model.replace(/^openai:/, ""));
  }
  return model.includes("-image");
}

function isOpenAiImageModel(model: string): boolean {
  return /^gpt-image-/i.test(model);
}

function buildTextConfig(model: string): GenerateContentConfig {
  const config: GenerateContentConfig = {
    temperature: 0,
    topP: 0.1,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  };
  if (supportsJsonMime(model) && !model.includes("-image")) {
    config.responseMimeType = "application/json";
  }
  return config;
}

function buildImageConfig(model: string): GenerateContentConfig {
  const config = buildTextConfig(model);
  config.responseModalities = [Modality.TEXT, Modality.IMAGE];
  return config;
}

function supportsJsonMime(model: string): boolean {
  if (!model.includes("-image")) return true;
  return model === "gemini-2.5-flash-image" || model === "gemini-3-pro-image";
}

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round(value: number, digits: number): number {
  const multiplier = Math.pow(10, digits);
  return Math.round(value * multiplier) / multiplier;
}

function getGuideCoordinateSpace(body: GuideRequestBody): {
  inputWidth: number;
  inputHeight: number;
  outputWidth: number;
  outputHeight: number;
  scaleX: number;
  scaleY: number;
} {
  const outputWidth = validNumber(body.imageWidth) ? Math.round(body.imageWidth) : 0;
  const outputHeight = validNumber(body.imageHeight) ? Math.round(body.imageHeight) : 0;
  const inputWidth = validNumber(body.inputImageWidth) && body.inputImageWidth > 0
    ? Math.round(body.inputImageWidth)
    : outputWidth;
  const inputHeight = validNumber(body.inputImageHeight) && body.inputImageHeight > 0
    ? Math.round(body.inputImageHeight)
    : outputHeight;
  return {
    inputWidth,
    inputHeight,
    outputWidth: outputWidth || inputWidth,
    outputHeight: outputHeight || inputHeight,
    scaleX: inputWidth > 0 ? (outputWidth || inputWidth) / inputWidth : 1,
    scaleY: inputHeight > 0 ? (outputHeight || inputHeight) / inputHeight : 1,
  };
}

function buildTimingPayload(startedAt: number, prepareMs: number, geminiRoundTripMs: number, redDetectMs: number) {
  return {
    apiTotalMs: Math.round(performance.now() - startedAt),
    serverPrepareMs: prepareMs,
    geminiRoundTripMs,
    geminiRequestMs: geminiRoundTripMs,
    redDetectMs,
  };
}

function buildServerInputImageDebug(
  input: { mimeType: string; base64: string },
  body: GuideRequestBody,
) {
  const { inputWidth, inputHeight, outputWidth, outputHeight, scaleX, scaleY } = getGuideCoordinateSpace(body);
  return {
    mimeType: input.mimeType,
    sentKb: round(base64ByteLength(input.base64) / 1024, 1),
    sentWidth: inputWidth,
    sentHeight: inputHeight,
    originalWidth: outputWidth,
    originalHeight: outputHeight,
    coordinateScaleX: round(scaleX, 5),
    coordinateScaleY: round(scaleY, 5),
    dimensionsPreserved: inputWidth === outputWidth && inputHeight === outputHeight,
  };
}

function scaleGuideToOriginal(guide: GeminiBodyGuide | null, body: GuideRequestBody): GeminiBodyGuide | null {
  if (!guide) return null;
  const { scaleX, scaleY } = getGuideCoordinateSpace(body);
  if (Math.abs(scaleX - 1) < 0.00001 && Math.abs(scaleY - 1) < 0.00001) return guide;
  return {
    ...guide,
    waist: scaleGuideLine(guide.waist, scaleX, scaleY),
    trouserWaist: scaleGuideLine(guide.trouserWaist, scaleX, scaleY),
    hips: scaleGuideLine(guide.hips, scaleX, scaleY),
  };
}

function scaleGuideLine(
  line: GeminiBodyGuide["waist"],
  scaleX: number,
  scaleY: number,
): GeminiBodyGuide["waist"] {
  if (!line) return undefined;
  return {
    ...line,
    y_px: validNumber(line.y_px) ? line.y_px * scaleY : line.y_px,
    left_x_px: validNumber(line.left_x_px) ? line.left_x_px * scaleX : line.left_x_px,
    right_x_px: validNumber(line.right_x_px) ? line.right_x_px * scaleX : line.right_x_px,
    points: Array.isArray(line.points)
      ? line.points.map((point) => ({
          x_px: point.x_px * scaleX,
          y_px: point.y_px * scaleY,
        }))
      : line.points,
  };
}

function parseGuideJson(text: string): GeminiBodyGuide | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = normalizeGuideJson(JSON.parse(cleaned.slice(start, end + 1)));
    if (!isGuideLine(parsed.waist) && !isGuideLine(parsed.trouserWaist) && !isGuideLine(parsed.hips)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractGeminiInlineImage(response: unknown): { mimeType: string; base64: string } | null {
  const record = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mimeType?: string; data?: string };
        }>;
      };
    }>;
  };
  const parts = record.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
  const images: Array<{ mimeType: string; base64: string; bytes: number }> = [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.mimeType?.startsWith("image/") && typeof inline.data === "string" && inline.data) {
      images.push({
        mimeType: inline.mimeType,
        base64: inline.data,
        bytes: base64ByteLength(inline.data),
      });
    }
  }
  const selected = images.sort((a, b) => b.bytes - a.bytes)[0];
  return selected ? { mimeType: selected.mimeType, base64: selected.base64 } : null;
}

function base64ByteLength(base64: string): number {
  const clean = base64.replace(/\s/g, "");
  if (!clean) return 0;
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

async function buildOutputImageDebug(image: { mimeType: string; base64: string }) {
  const bytes = base64ByteLength(image.base64);
  try {
    const metadata = await sharp(Buffer.from(image.base64, "base64")).metadata();
    return {
      mimeType: image.mimeType,
      kb: round(bytes / 1024, 1),
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      requestedSize: "model default",
    };
  } catch {
    return {
      mimeType: image.mimeType,
      kb: round(bytes / 1024, 1),
      width: 0,
      height: 0,
      requestedSize: "model default",
    };
  }
}

async function detectGuideFromAnnotatedImage(
  image: { mimeType: string; base64: string },
  body: GuideRequestBody,
  prompt: string,
): Promise<GeminiBodyGuide | null> {
  const { inputWidth: targetWidth, inputHeight: targetHeight } = getGuideCoordinateSpace(body);
  if (targetWidth <= 0 || targetHeight <= 0) return null;

  const raw = await sharp(Buffer.from(image.base64, "base64"))
    .resize(targetWidth, targetHeight, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const lines = detectRedGuideLineComponents(raw, targetWidth, targetHeight);
  if (!lines.length) return null;
  const wantsNaturalWaist = /natural\s+waist|top red curve is waist|"waist"/i.test(prompt);
  const wantsTrouserWaist = /trouser\s*waist|trouserWaist/i.test(prompt);
  const wantsHips = /\bhips?\b|hip\/seat/i.test(prompt);
  const wantsGenericThreeLines = /line\s*1/i.test(prompt) && /line\s*2/i.test(prompt) && /line\s*3/i.test(prompt);
  const wantsThreeRows = wantsGenericThreeLines || (wantsNaturalWaist && wantsTrouserWaist && wantsHips);

  if (wantsThreeRows && lines.length < 3) return null;

  if (lines.length === 1) {
    const guide: GeminiBodyGuide = {
      occlusion: {
        hair_blocks_torso: false,
        hands_near_hips: false,
        loose_clothing: false,
      },
      notes: "Detected from the red curve drawn by the guide image model.",
    };
    const key = wantsTrouserWaist ? "trouserWaist" : wantsHips ? "hips" : "waist";
    guide[key] = toGuideLine(lines[0]!);
    return scaleGuideToOriginal(guide, body);
  }

  if (lines.length === 2 && wantsTrouserWaist && wantsHips && !wantsNaturalWaist) {
    return scaleGuideToOriginal({
      trouserWaist: toGuideLine(lines[0]!),
      hips: toGuideLine(lines[1]!),
      occlusion: {
        hair_blocks_torso: false,
        hands_near_hips: false,
        loose_clothing: false,
      },
      notes: "Detected two custom-prompt curves from the red lines drawn by the guide image model.",
    }, body);
  }

  const waistLine = lines[0]!;
  const trouserLine = lines.length >= 3 ? lines[1] : null;
  const hipLine = lines.length >= 3 ? lines[2]! : lines[1]!;

  return scaleGuideToOriginal({
    waist: toGuideLine(waistLine),
    trouserWaist: trouserLine ? toGuideLine(trouserLine) : undefined,
    hips: toGuideLine(hipLine),
    occlusion: {
      hair_blocks_torso: false,
      hands_near_hips: false,
      loose_clothing: false,
    },
    notes: "Detected waist, trouser-waist, and hip curves from red curves drawn by the guide image model.",
  }, body);
}

type DetectedRedGuideLine = {
  y: number;
  leftX: number;
  rightX: number;
  points: Array<{ x_px: number; y_px: number }>;
};

function toGuideLine(line: DetectedRedGuideLine): NonNullable<GeminiBodyGuide["waist"]> {
  return {
    y_px: line.y,
    left_x_px: line.leftX,
    right_x_px: line.rightX,
    points: line.points,
    confidence: LINE_DETECTION_CONFIDENCE,
  };
}

function detectRedGuideLineComponents(
  raw: Buffer,
  width: number,
  height: number,
): DetectedRedGuideLine[] {
  const red = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const offset = rowOffset + x * 4;
      const r = raw[offset] ?? 0;
      const g = raw[offset + 1] ?? 0;
      const b = raw[offset + 2] ?? 0;
      const a = raw[offset + 3] ?? 0;
      if (a > 120 && r > 150 && g < 115 && b < 115 && r > g * 1.35 && r > b * 1.35) {
        red[y * width + x] = 1;
      }
    }
  }

  const seen = new Uint8Array(width * height);
  const candidates: Array<DetectedRedGuideLine & { count: number; boxHeight: number }> = [];
  const queue: number[] = [];
  const pixels: Array<{ x: number; y: number }> = [];
  const minLineWidth = Math.max(80, width * 0.12);
  const minPixelCount = Math.max(80, width * 0.08);
  const maxLineHeight = Math.max(30, height * 0.08);

  for (let startIndex = 0; startIndex < red.length; startIndex += 1) {
    if (!red[startIndex] || seen[startIndex]) continue;

    queue.length = 0;
    pixels.length = 0;
    queue.push(startIndex);
    seen[startIndex] = 1;

    let head = 0;
    let minX = startIndex % width;
    let maxX = minX;
    let minY = Math.floor(startIndex / width);
    let maxY = minY;
    let ySum = 0;

    while (head < queue.length) {
      const index = queue[head++]!;
      const x = index % width;
      const y = Math.floor(index / width);
      pixels.push({ x, y });
      ySum += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nextIndex = ny * width + nx;
          if (!red[nextIndex] || seen[nextIndex]) continue;
          seen[nextIndex] = 1;
          queue.push(nextIndex);
        }
      }
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    if (pixels.length < minPixelCount || boxWidth < minLineWidth || boxHeight > maxLineHeight) continue;
    if (boxWidth / Math.max(1, boxHeight) < 2.5) continue;

    candidates.push({
      y: Math.round(ySum / pixels.length),
      leftX: minX,
      rightX: maxX,
      points: buildCurvePoints(pixels, minX, maxX),
      count: pixels.length,
      boxHeight,
    });
  }

  return candidates
    .sort((a, b) => a.y - b.y || b.count - a.count)
    .slice(0, 3)
    .map((line) => ({
      y: line.y,
      leftX: line.leftX,
      rightX: line.rightX,
      points: line.points,
    }));
}

function buildCurvePoints(
  pixels: Array<{ x: number; y: number }>,
  minX: number,
  maxX: number,
): Array<{ x_px: number; y_px: number }> {
  const buckets: Array<Array<{ x: number; y: number }>> = Array.from({ length: 5 }, () => []);
  const span = Math.max(1, maxX - minX);
  for (const pixel of pixels) {
    const bucketIndex = Math.max(0, Math.min(4, Math.round(((pixel.x - minX) / span) * 4)));
    buckets[bucketIndex]!.push(pixel);
  }
  return buckets.map((bucket, index) => {
    const fallbackX = minX + span * (index / 4);
    if (!bucket.length) {
      return { x_px: Math.round(fallbackX), y_px: 0 };
    }
    const x = index === 0 ? minX : index === 4 ? maxX : bucket.reduce((sum, pixel) => sum + pixel.x, 0) / bucket.length;
    const y = bucket.reduce((sum, pixel) => sum + pixel.y, 0) / bucket.length;
    return { x_px: Math.round(x), y_px: Math.round(y) };
  }).filter((point) => point.y_px > 0);
}

function normalizeGuideJson(value: unknown): GeminiBodyGuide {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const guide: GeminiBodyGuide = {
    waist: normalizeGuideLine(record.waist ?? readLineAlias(record, 1)),
    trouserWaist: normalizeGuideLine(record.trouserWaist ?? record.trouser_waist ?? record.trouser ?? readLineAlias(record, 2)),
    hips: normalizeGuideLine(record.hips ?? record.hip ?? readLineAlias(record, 3)),
  };
  if (record.occlusion && typeof record.occlusion === "object") {
    guide.occlusion = record.occlusion as GeminiBodyGuide["occlusion"];
  }
  if (typeof record.notes === "string") {
    guide.notes = record.notes;
  }
  return guide;
}

function readLineAlias(record: Record<string, unknown>, index: number): unknown {
  return record[`line ${index}`] ?? record[`line${index}`] ?? record[`line_${index}`] ?? record[`Line ${index}`];
}

function normalizeGuideLine(value: unknown): GeminiBodyGuide["waist"] {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const start = row.start && typeof row.start === "object" ? row.start as Record<string, unknown> : null;
  const end = row.end && typeof row.end === "object" ? row.end as Record<string, unknown> : null;
  const points = Array.isArray(row.points)
    ? row.points.filter((point): point is Record<string, unknown> => Boolean(point) && typeof point === "object")
    : [];
  const numericPoints = points
    .map((point) => ({
      x_px: typeof point.x_px === "number" ? point.x_px : NaN,
      y_px: typeof point.y_px === "number" ? point.y_px : NaN,
    }))
    .filter((point) => Number.isFinite(point.x_px) && Number.isFinite(point.y_px));
  const firstPoint = points[0] ?? null;
  const lastPoint = points.length ? points[points.length - 1]! : null;
  const pointXs = numericPoints.map((point) => point.x_px);
  const pointYs = numericPoints.map((point) => point.y_px);
  const minPointX = pointXs.length ? Math.min(...pointXs) : undefined;
  const maxPointX = pointXs.length ? Math.max(...pointXs) : undefined;
  const averagePointY = pointYs.length
    ? pointYs.reduce((sum, y) => sum + y, 0) / pointYs.length
    : undefined;
  const startX = typeof start?.x_px === "number" ? start.x_px : typeof firstPoint?.x_px === "number" ? firstPoint.x_px : undefined;
  const startY = typeof start?.y_px === "number" ? start.y_px : typeof firstPoint?.y_px === "number" ? firstPoint.y_px : undefined;
  const endX = typeof end?.x_px === "number" ? end.x_px : typeof lastPoint?.x_px === "number" ? lastPoint.x_px : undefined;
  const endY = typeof end?.y_px === "number" ? end.y_px : typeof lastPoint?.y_px === "number" ? lastPoint.y_px : undefined;
  return {
    y_px: typeof row.y_px === "number" ? row.y_px : averagePointY ?? startY ?? endY,
    left_x_px: typeof row.left_x_px === "number" ? row.left_x_px : minPointX ?? (startX != null && endX != null ? Math.min(startX, endX) : undefined),
    right_x_px: typeof row.right_x_px === "number" ? row.right_x_px : maxPointX ?? (startX != null && endX != null ? Math.max(startX, endX) : undefined),
    points: numericPoints,
    y_percent: typeof row.y_percent === "number" ? row.y_percent : undefined,
    left_x_percent: typeof row.left_x_percent === "number" ? row.left_x_percent : undefined,
    right_x_percent: typeof row.right_x_percent === "number" ? row.right_x_percent : undefined,
    confidence: typeof row.confidence === "number" ? row.confidence : 0.7,
  };
}

function isGuideLine(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const start = row.start && typeof row.start === "object" ? row.start as Record<string, unknown> : null;
  const end = row.end && typeof row.end === "object" ? row.end as Record<string, unknown> : null;
  const points = Array.isArray(row.points)
    ? row.points.filter((point): point is Record<string, unknown> => Boolean(point) && typeof point === "object")
    : [];
  const firstPoint = points[0] ?? null;
  const lastPoint = points.length ? points[points.length - 1]! : null;
  const hasPixelCoords =
    typeof row.y_px === "number" &&
    typeof row.left_x_px === "number" &&
    typeof row.right_x_px === "number";
  const hasStartEndCoords =
    typeof start?.x_px === "number" &&
    typeof start.y_px === "number" &&
    typeof end?.x_px === "number" &&
    typeof end.y_px === "number";
  const hasPointCoords =
    typeof firstPoint?.x_px === "number" &&
    typeof firstPoint.y_px === "number" &&
    typeof lastPoint?.x_px === "number" &&
    typeof lastPoint.y_px === "number";
  const hasPercentCoords =
    typeof row.y_percent === "number" &&
    typeof row.left_x_percent === "number" &&
    typeof row.right_x_percent === "number";
  return hasPixelCoords || hasStartEndCoords || hasPointCoords || hasPercentCoords;
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

  return getKeyFromBackendEnv([
    "SIZING_LAB_GEMINI_API_KEY",
    "TEST_LAB_GOOGLE_API_KEY",
    "TEST_LAB_GEMINI_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
  ]);
}

function getOpenAiApiKey(): string {
  const direct = process.env.OPENAI_API_KEY || process.env.SIZING_LAB_OPENAI_API_KEY || "";
  if (direct) return direct;

  return getKeyFromBackendEnv(["OPENAI_API_KEY", "SIZING_LAB_OPENAI_API_KEY"]);
}

function getKeyFromBackendEnv(keys: string[]): string {
  for (const backendEnvPath of getBackendEnvPaths()) {
    if (!existsSync(backendEnvPath)) continue;
    const parsed = parseEnvFile(readFileSync(backendEnvPath, "utf8"));
    for (const key of keys) {
      const value = parsed[key];
      if (value) return value;
    }
  }
  return "";
}

function getBackendEnvPaths(): string[] {
  return [
    process.env.SIZING_LAB_BACKEND_ENV_PATH,
    process.env.PRIMESTYLE_BACKEND_ENV_PATH,
    "/var/www/test-be-9a7k.primestyleai.com/.env",
    path.resolve(process.cwd(), "../primeStyleAI-backend/.env"),
    path.resolve(process.cwd(), "../test-be-9a7k.primestyleai.com/.env"),
  ].filter((value): value is string => Boolean(value));
}

function extractOpenAiError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  const error = record.error;
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

function extractOpenAiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;
  const output = Array.isArray(record.output) ? record.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("\n");
}

function extractOpenAiImageBase64(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  const data = Array.isArray(record.data) ? record.data : [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const b64 = (item as Record<string, unknown>).b64_json;
    if (typeof b64 === "string" && b64.trim()) return b64;
  }
  return "";
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
