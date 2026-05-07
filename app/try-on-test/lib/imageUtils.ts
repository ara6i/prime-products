/**
 * Read a File into a base64 data URI suitable for the backend's `modelImage` /
 * `garmentImage` fields. Mirrors what the SDK does (`compressImage` in the SDK
 * preflights with `image-utils.ts`); for the test page we keep it lightweight
 * so the user sees timings dominated by the Gemini call, not the upload.
 */
export async function fileToBase64DataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader returned non-string result"));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress + resize an image to a max dimension on the longest edge, keeping
 * aspect ratio. Returns a JPEG data URI. The SDK's apparel path uses 1024 /
 * 0.85; we mirror that so the prompt-vs-latency comparison isn't muddied by
 * upload-size differences.
 */
export async function compressToJpegDataUri(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<string> {
  const maxDimension = options.maxDimension ?? 1024;
  const quality = options.quality ?? 0.85;

  const dataUri = await fileToBase64DataUri(file);
  const img = await loadImage(dataUri);

  const { width, height } = scaleToMax(img.naturalWidth, img.naturalHeight, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = src;
  });
}

function scaleToMax(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const ratio = width >= height ? maxDimension / width : maxDimension / height;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Approximate byte size of a base64 data URI.
 */
export function dataUriBytes(dataUri: string): number {
  const commaIdx = dataUri.indexOf(",");
  const payload = commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
  return Math.floor((payload.length * 3) / 4);
}
