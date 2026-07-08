"use client";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function fileToImageDataUri(file: File): Promise<string> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Use a PNG, JPG, or WebP clothing image.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Use an image under 10MB for this test generation.");
  }

  return blobToDataUri(file);
}

export async function imageUrlToDataUri(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not load reference image (${response.status}).`);
  }

  const blob = await response.blob();
  if (!SUPPORTED_IMAGE_TYPES.has(blob.type)) {
    throw new Error("Reference image must be PNG, JPG, or WebP.");
  }

  return blobToDataUri(blob);
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read image data."));
    };
    reader.onerror = () => reject(new Error("Could not read image data."));
    reader.readAsDataURL(blob);
  });
}
