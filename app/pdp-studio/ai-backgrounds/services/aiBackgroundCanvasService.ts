import type {
  AiBackgroundAspectRatio,
  AiBackgroundImageLayer,
  AiBackgroundTextLayer,
} from "../types/aiBackgrounds";

interface RenderAiBackgroundCanvasInput {
  baseUrl: string;
  aspectRatio: AiBackgroundAspectRatio;
  textLayers: AiBackgroundTextLayer[];
  imageLayers: AiBackgroundImageLayer[];
}
const RATIO_VALUES: Record<AiBackgroundAspectRatio, number> = {
  "1:1": 1,
  "2:3": 2 / 3,
  "3:4": 3 / 4,
  "4:3": 4 / 3,
  "3:2": 3 / 2,
  "9:16": 9 / 16,
  "16:9": 16 / 9,
};

export async function renderAiBackgroundCanvas(
  input: RenderAiBackgroundCanvasInput,
): Promise<Blob> {
  const ratio = RATIO_VALUES[input.aspectRatio];
  const longEdge = 1800;
  const width = ratio >= 1 ? longEdge : Math.round(longEdge * ratio);
  const height = ratio >= 1 ? Math.round(longEdge / ratio) : longEdge;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas export is unavailable in this browser.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  const base = await loadImage(input.baseUrl);
  drawContained(context, base, 0, 0, width, height);

  for (const layer of input.imageLayers) {
    const image = await loadImage(layer.url);
    context.drawImage(
      image,
      layer.x * width,
      layer.y * height,
      layer.width * width,
      layer.height * height,
    );
  }

  for (const layer of input.textLayers) {
    context.font = `600 ${Math.max(14, layer.fontSize * width)}px Inter, Arial, sans-serif`;
    context.fillStyle = layer.color;
    context.textBaseline = "top";
    context.fillText(layer.text, layer.x * width, layer.y * height);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas export failed.")),
      "image/png",
      1,
    );
  });
}

export async function downloadAiBackgroundCanvas(
  input: RenderAiBackgroundCanvasInput,
  filename = "pdp-studio-background.png",
): Promise<void> {
  const blob = await renderAiBackgroundCanvas(input);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareAiBackgroundCanvas(
  input: RenderAiBackgroundCanvasInput,
): Promise<boolean> {
  const blob = await renderAiBackgroundCanvas(input);
  const file = new File([blob], "pdp-studio-background.png", {
    type: "image/png",
  });
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
    return false;
  }
  await navigator.share({
    title: "PDP Studio background",
    files: [file],
  });
  return true;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load a canvas image (${response.status}).`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawContained(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}
